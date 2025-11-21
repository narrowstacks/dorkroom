# Security Remediation Guide

This guide provides step-by-step instructions to fix the vulnerabilities identified in the security audit.

## Quick Fix (Recommended)

The simplest way to fix all identified vulnerabilities is to update the `@vercel/node` package:

### Step 1: Update package.json

Edit `/package.json` and change:

```json
"@vercel/node": "^5.3.24"
```

to:

```json
"@vercel/node": "^5.5.8"
```

### Step 2: Update lock file and install

If using **bun** (recommended for this project):

```bash
bun install
```

If using **npm**:

```bash
npm install --legacy-peer-deps
```

If using **yarn**:

```bash
yarn install
```

### Step 3: Verify the fix

Run the security audit again to confirm all vulnerabilities are resolved:

```bash
npm audit
```

## Optional: Update Other Dependencies

While not required for security, you may also want to update these packages to their latest versions:

### Minor Updates

```json
{
  "@tanstack/react-query": "^5.90.10",
  "@tanstack/react-router": "^1.139.0",
  "vite": "^7.2.4",
  "nx": "^22.1.0"
}
```

### React Updates (Patch versions)

```json
{
  "react": "19.2.0",
  "react-dom": "19.2.0",
  "@types/react": "19.0.0",
  "@types/react-dom": "19.0.0"
}
```

**Note:** Test thoroughly after updating React, as these are newer versions.

## Automated Security Checks

### GitHub Actions (Recommended)

Add this to `.github/workflows/security.yml`:

```yaml
name: Security Audit

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    # Run weekly on Monday at 9am UTC
    - cron: '0 9 * * 1'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run security audit
        run: npm audit --audit-level=moderate
        continue-on-error: true

      - name: Upload audit results
        uses: actions/upload-artifact@v4
        with:
          name: security-audit
          path: audit-results.json
```

### Pre-commit Hook

Add to `.husky/pre-commit` or create a git hook:

```bash
#!/bin/sh
npm audit --audit-level=high || {
  echo "⚠️  Security vulnerabilities detected. Run 'npm audit' for details."
  exit 0  # Warning only, don't block commit
}
```

## Monitoring Tools

Consider integrating these security monitoring tools:

### 1. GitHub Dependabot

Enable in your repository settings:

- Go to: Settings → Security → Code security and analysis
- Enable "Dependabot alerts"
- Enable "Dependabot security updates"

### 2. Snyk

```bash
npm install -g snyk
snyk auth
snyk test
snyk monitor
```

### 3. Socket Security

Add to package.json:

```json
{
  "scripts": {
    "security:check": "npx socket-security report"
  }
}
```

## Verification Checklist

After applying fixes, verify:

- [ ] `npm audit` shows 0 vulnerabilities
- [ ] All tests pass: `bunx nx test`
- [ ] Application builds successfully: `bunx nx build dorkroom`
- [ ] Application runs correctly: `bunx nx dev dorkroom`
- [ ] API endpoints still work correctly
- [ ] No new TypeScript errors
- [ ] No new ESLint warnings

## Additional Security Best Practices

1. **Keep dependencies updated**: Run `npm audit` monthly
2. **Review dependency changes**: Check changelogs before updating
3. **Use lock files**: Always commit `bun.lock` or `package-lock.json`
4. **Limit direct dependencies**: Only install what you need
5. **Review new packages**: Check npm package reputation before adding
6. **Use .nvmrc or .node-version**: Pin Node.js version for consistency
7. **Enable 2FA**: On npm and GitHub accounts
8. **Review npm publish access**: Ensure only trusted users can publish

## Impact Analysis

### Development Impact

- **esbuild vulnerability**: Only affects local development server
- **Mitigation**: Don't expose dev server to untrusted networks

### Production Impact

- **path-to-regexp**: Used in Vercel serverless functions
- **undici**: Used for HTTP requests in serverless functions
- **Mitigation**: Updating @vercel/node resolves both issues

## Timeline

| Action                         | Timeline        | Priority |
| ------------------------------ | --------------- | -------- |
| Update @vercel/node            | Immediate       | High     |
| Verify fix with npm audit      | Same day        | High     |
| Deploy to staging              | Within 24 hours | High     |
| Deploy to production           | Within 48 hours | High     |
| Setup automated security scans | Within 1 week   | Medium   |
| Review other dependencies      | Within 1 month  | Low      |

## Support

If you encounter issues during the update process:

1. Check the [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for detailed vulnerability information
2. Review the [CVE_DETAILS.md](./CVE_DETAILS.md) for technical details
3. Open an issue in the repository
4. Contact the Vercel support if @vercel/node update causes issues

## References

- npm audit documentation: https://docs.npmjs.com/cli/v10/commands/npm-audit
- GitHub Security Advisories: https://github.com/advisories
- National Vulnerability Database: https://nvd.nist.gov/
- Vercel Node.js Runtime: https://vercel.com/docs/functions/runtimes/node-js
