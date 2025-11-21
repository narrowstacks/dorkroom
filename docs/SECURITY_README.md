# Security Documentation

This directory contains comprehensive security audit documentation for the Dorkroom project.

## Files

- **[SECURITY_AUDIT.md](./SECURITY_AUDIT.md)** - Complete security audit report with executive summary, findings, and recommendations
- **[CVE_DETAILS.md](./CVE_DETAILS.md)** - Detailed technical information about discovered CVEs
- **[SECURITY_REMEDIATION.md](./SECURITY_REMEDIATION.md)** - Step-by-step guide to fix vulnerabilities
- **[scripts/security-audit.js](./scripts/security-audit.js)** - Automated security audit tool

## Quick Start

### Run Security Audit

```bash
npm run security:audit
# or
node scripts/security-audit.js
```

### Fix Vulnerabilities

Update `@vercel/node` in `package.json`:

```json
"@vercel/node": "^5.5.8"
```

Then run:

```bash
bun install
# or
npm install --legacy-peer-deps
```

## Summary of Findings

**Date:** November 21, 2025  
**Total Vulnerabilities:** 4 (2 moderate, 2 high)  
**Compromised Packages:** 0  
**Deprecated Packages:** 0

### Affected Packages

1. **esbuild** ≤0.24.2 - Development server vulnerability (Moderate)
2. **path-to-regexp** 6.1.0 - ReDoS vulnerability (High)
3. **undici** 5.28.4 - Multiple vulnerabilities (Moderate)

All vulnerabilities are in **transitive dependencies** of `@vercel/node@5.3.24`.

### Recommended Actions

1. ✅ **Immediate:** Update @vercel/node to 5.5.8
2. ✅ **Short-term:** Verify fix with `npm audit`
3. ⏳ **Ongoing:** Set up automated security scanning

## Additional Resources

- [npm audit documentation](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [GitHub Security Advisories](https://github.com/advisories)
- [National Vulnerability Database](https://nvd.nist.gov/)

## Contact

For questions or concerns about security, please:

1. Review the detailed documentation in this directory
2. Open an issue in the repository
3. Follow the remediation guide

---

**Last Updated:** November 21, 2025  
**Next Audit Recommended:** December 21, 2025
