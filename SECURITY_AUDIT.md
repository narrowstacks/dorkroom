# Security Audit Report

**Date:** 2025-11-21  
**Project:** Dorkroom - Analog Photography Calculator  
**Version:** 0.9.0

## Executive Summary

A comprehensive security audit was conducted on all npm packages used in the Dorkroom project and its dependencies. The audit identified **4 vulnerabilities** (2 moderate, 2 high) in transitive dependencies of the `@vercel/node` package. No compromised or deprecated packages were detected in the project.

## Methodology

1. **Dependency Analysis**: Analyzed all package.json files across the monorepo (root, apps, packages)
2. **npm Audit**: Ran `npm audit` on combined dependencies to identify known CVEs
3. **Package Registry Check**: Verified packages against npm registry for deprecation/compromise status
4. **CVE Research**: Cross-referenced findings with GitHub Security Advisories

## Findings

### Vulnerabilities Detected

#### 1. esbuild - CVE in Development Server (MODERATE)

- **Package**: `esbuild`
- **Vulnerable Version**: ≤0.24.2 (project uses 0.14.47 via @vercel/node)
- **Severity**: Moderate (CVSS 5.3)
- **CVE**: GHSA-67mh-4wv8-2f99
- **CWE**: CWE-346 (Origin Validation Error)
- **Description**: esbuild enables any website to send requests to the development server and read the response
- **URL**: https://github.com/advisories/GHSA-67mh-4wv8-2f99
- **Impact**: Development server vulnerability - production builds are not affected
- **Dependency Chain**: `@vercel/node@5.3.24` → `esbuild@0.14.47`

#### 2. path-to-regexp - ReDoS Vulnerability (HIGH)

- **Package**: `path-to-regexp`
- **Vulnerable Version**: 4.0.0 - 6.2.2 (project uses 6.1.0 via @vercel/node)
- **Severity**: High (CVSS 7.5)
- **CVE**: GHSA-9wv6-86v2-598j
- **CWE**: CWE-1333 (Inefficient Regular Expression Complexity)
- **Description**: path-to-regexp outputs backtracking regular expressions causing ReDoS
- **URL**: https://github.com/advisories/GHSA-9wv6-86v2-598j
- **Impact**: Potential Denial of Service through malicious route patterns
- **Dependency Chain**: `@vercel/node@5.3.24` → `path-to-regexp@6.1.0`
- **Fixed Version**: ≥6.3.0 (latest is 8.3.0)

#### 3. undici - Multiple Vulnerabilities (MODERATE)

- **Package**: `undici`
- **Vulnerable Version**: ≤5.28.5 (project uses 5.28.4 via @vercel/node)
- **Severity**: Moderate (CVSS 6.8) and Low (CVSS 3.1)
- **CVEs**:
  - GHSA-c76h-2ccp-4975: Use of Insufficiently Random Values (CWE-330)
  - GHSA-cxrh-j4jr-qwg3: Denial of Service via bad certificate data (CWE-401)
- **URLs**:
  - https://github.com/advisories/GHSA-c76h-2ccp-4975
  - https://github.com/advisories/GHSA-cxrh-j4jr-qwg3
- **Impact**: Potential security issues in HTTP client operations
- **Dependency Chain**: `@vercel/node@5.3.24` → `undici@5.28.4`
- **Fixed Version**: ≥5.29.0 (latest is 7.16.0)

### Package Status Check

All main dependencies were verified against the npm registry:

✅ **No deprecated packages detected**  
✅ **No known compromised packages detected**

Checked packages:

- @vercel/node (latest: 5.5.8, current: 5.3.24)
- @tanstack/react-query (latest: 5.90.10, current: 5.90.9)
- @tanstack/react-router (latest: 1.139.0, current: 1.136.8)
- @tanstack/react-form (latest: 1.25.0, current: 1.25.0)
- @tanstack/react-table (latest: 8.21.3, current: 8.21.3)
- react (latest: 19.2.0, current: 19.0.0)
- react-dom (latest: 19.2.0, current: 19.0.0)
- zod (latest: 4.1.12, current: 4.1.12)
- vite (latest: 7.2.4, current: 7.2.2)
- nx (latest: 22.1.0, current: 22.0.4)

## Recommendations

### High Priority

1. **Update @vercel/node**: Upgrade from `5.3.24` to `5.5.8` (latest)

   ```json
   "@vercel/node": "^5.5.8"
   ```

   This will pull in fixed versions of transitive dependencies.

2. **Verify Dependency Resolution**: After updating, run `npm audit` to confirm all vulnerabilities are resolved.

### Medium Priority

3. **Update Minor Versions**: Consider updating the following packages to their latest versions:
   - @tanstack/react-query: `5.90.9` → `5.90.10`
   - @tanstack/react-router: `1.136.8` → `1.139.0`
   - vite: `7.2.2` → `7.2.4`
   - nx: `22.0.4` → `22.1.0`

4. **Update React**: Consider updating React to the latest stable version:
   - react: `19.0.0` → `19.2.0`
   - react-dom: `19.0.0` → `19.2.0`
   - @types/react: `19.0.0` → Update accordingly
   - @types/react-dom: `19.0.0` → Update accordingly

### Best Practices

5. **Regular Audits**: Implement automated security audits in CI/CD pipeline

   ```bash
   npm audit --audit-level=moderate
   ```

6. **Dependency Monitoring**: Consider using tools like:
   - Dependabot (GitHub)
   - Snyk
   - Socket Security
   - npm audit in CI/CD

7. **Lock File Management**: Ensure `bun.lock` is committed and regularly updated

8. **Security Policy**: Consider adding a SECURITY.md file to document security practices

## Additional Notes

- All vulnerabilities are in **transitive dependencies** (not directly installed)
- The esbuild vulnerability only affects the development server, not production builds
- None of the vulnerabilities are critical severity
- The project uses a monorepo structure with Nx, which manages dependencies centrally

## Conclusion

The Dorkroom project has a relatively good security posture with only 4 moderate-to-high severity vulnerabilities, all in transitive dependencies. The primary action required is updating `@vercel/node` to the latest version, which should resolve all identified issues. No compromised or malicious packages were detected.

---

**Audit Tools Used:**

- npm audit (v10.8.2)
- npm registry API
- GitHub Security Advisories Database

**Generated by:** Automated Security Audit Script  
**Contact:** For questions about this audit, please open an issue in the repository.
