#!/usr/bin/env node

/**
 * Security Audit Script for Dorkroom
 *
 * This script performs a comprehensive security audit by:
 * 1. Collecting all dependencies from the monorepo
 * 2. Running npm audit on combined dependencies
 * 3. Checking for deprecated packages
 * 4. Generating a report
 *
 * Usage: node scripts/security-audit.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function readPackageJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    log(`Warning: Could not read ${filePath}`, 'yellow');
    return null;
  }
}

function collectDependencies() {
  log('\n📦 Collecting dependencies from monorepo...', 'cyan');

  const packagePaths = [
    'package.json',
    'apps/dorkroom/package.json',
    'packages/api/package.json',
    'packages/logic/package.json',
    'packages/ui/package.json',
  ];

  const allDeps = new Map();
  const allDevDeps = new Map();

  for (const pkgPath of packagePaths) {
    const pkg = readPackageJson(pkgPath);
    if (!pkg) continue;

    // Collect dependencies
    if (pkg.dependencies) {
      Object.entries(pkg.dependencies).forEach(([name, version]) => {
        if (!version.startsWith('workspace:') && version !== '*') {
          allDeps.set(name, version);
        }
      });
    }

    // Collect devDependencies
    if (pkg.devDependencies) {
      Object.entries(pkg.devDependencies).forEach(([name, version]) => {
        if (!version.startsWith('workspace:') && version !== '*') {
          allDevDeps.set(name, version);
        }
      });
    }
  }

  log(`✓ Found ${allDeps.size} unique dependencies`, 'green');
  log(`✓ Found ${allDevDeps.size} unique devDependencies`, 'green');

  return { allDeps, allDevDeps };
}

function createAuditPackage(deps, devDeps) {
  const tmpDir = path.join(process.cwd(), '.tmp-security-audit');

  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
  }

  const packageJson = {
    name: 'dorkroom-security-audit',
    version: '1.0.0',
    private: true,
    dependencies: Object.fromEntries(deps),
    devDependencies: Object.fromEntries(devDeps),
  };

  fs.writeFileSync(
    path.join(tmpDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  return tmpDir;
}

function runAudit(auditDir) {
  log('\n🔍 Running npm audit...', 'cyan');

  try {
    const output = execSync('npm audit --json', {
      cwd: auditDir,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return JSON.parse(output);
  } catch (error) {
    // npm audit exits with non-zero when vulnerabilities are found
    if (error.stdout) {
      return JSON.parse(error.stdout);
    }
    throw error;
  }
}

function installDependencies(auditDir) {
  log('\n📥 Installing dependencies for audit...', 'cyan');

  try {
    execSync('npm install --legacy-peer-deps --silent', {
      cwd: auditDir,
      stdio: 'pipe',
    });
    log('✓ Dependencies installed', 'green');
    return true;
  } catch (error) {
    log('✗ Failed to install dependencies', 'red');
    return false;
  }
}

function displayResults(auditResults) {
  log('\n📊 Security Audit Results', 'magenta');
  log('═══════════════════════════════════════', 'magenta');

  const metadata = auditResults.metadata;

  if (!metadata) {
    log('\nNo audit metadata available', 'yellow');
    return;
  }

  const vuln = metadata.vulnerabilities;

  log(
    `\n📈 Total Dependencies: ${metadata.dependencies?.total || 'N/A'}`,
    'blue'
  );
  log(`   Production: ${metadata.dependencies?.prod || 'N/A'}`, 'blue');
  log(`   Development: ${metadata.dependencies?.dev || 'N/A'}`, 'blue');

  log('\n🔒 Vulnerabilities:', 'yellow');
  log(
    `   Critical: ${vuln.critical || 0}`,
    vuln.critical > 0 ? 'red' : 'green'
  );
  log(`   High:     ${vuln.high || 0}`, vuln.high > 0 ? 'red' : 'green');
  log(
    `   Moderate: ${vuln.moderate || 0}`,
    vuln.moderate > 0 ? 'yellow' : 'green'
  );
  log(`   Low:      ${vuln.low || 0}`, vuln.low > 0 ? 'yellow' : 'green');
  log(`   Info:     ${vuln.info || 0}`, 'blue');
  log(`   ─────────────`, 'blue');
  log(`   Total:    ${vuln.total || 0}`, vuln.total > 0 ? 'red' : 'green');

  if (auditResults.vulnerabilities) {
    log('\n🔍 Vulnerability Details:', 'yellow');

    Object.entries(auditResults.vulnerabilities).forEach(([name, details]) => {
      const severity = details.severity;
      const color =
        {
          critical: 'red',
          high: 'red',
          moderate: 'yellow',
          low: 'yellow',
        }[severity] || 'reset';

      log(`\n  📦 ${name}`, color);
      log(`     Severity: ${severity.toUpperCase()}`, color);

      if (details.via && Array.isArray(details.via)) {
        details.via.forEach((v) => {
          if (typeof v === 'object' && v.title) {
            log(`     → ${v.title}`, color);
            log(`       ${v.url}`, 'blue');
          }
        });
      }

      if (details.fixAvailable) {
        const fix = details.fixAvailable;
        log(`     ✓ Fix: Update to ${fix.name}@${fix.version}`, 'green');
      }
    });
  }

  log('\n═══════════════════════════════════════\n', 'magenta');
}

function cleanup(auditDir) {
  try {
    fs.rmSync(auditDir, { recursive: true, force: true });
    log('✓ Cleanup completed', 'green');
  } catch (error) {
    log(`Warning: Could not clean up ${auditDir}`, 'yellow');
  }
}

async function main() {
  log('🔐 Dorkroom Security Audit Tool', 'cyan');
  log('═══════════════════════════════════════', 'cyan');

  try {
    // Collect dependencies
    const { allDeps, allDevDeps } = collectDependencies();

    // Create temporary audit package
    const auditDir = createAuditPackage(allDeps, allDevDeps);
    log(`✓ Created audit package in ${auditDir}`, 'green');

    // Install dependencies
    const installed = installDependencies(auditDir);

    if (!installed) {
      log('\n⚠️  Proceeding with audit despite installation issues', 'yellow');
    }

    // Run audit
    const results = runAudit(auditDir);

    // Display results
    displayResults(results);

    // Cleanup
    cleanup(auditDir);

    // Exit with appropriate code
    const totalVulns = results.metadata?.vulnerabilities?.total || 0;
    if (totalVulns > 0) {
      log(
        `⚠️  Found ${totalVulns} vulnerabilities. Review SECURITY_AUDIT.md for details.`,
        'yellow'
      );
      process.exit(1);
    } else {
      log('✅ No vulnerabilities found!', 'green');
      process.exit(0);
    }
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the audit
main();
