# Security Policy

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email us at: **aaron@affords.art**

Include the following information:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Any suggested fixes (optional)

### What to Expect

1. **Acknowledgment** - We will acknowledge your report within 48 hours
2. **Assessment** - We will investigate and assess the severity within 7 days
3. **Updates** - We will keep you informed of our progress
4. **Resolution** - We aim to resolve critical issues within 30 days
5. **Credit** - With your permission, we will credit you in our security acknowledgments

### Scope

This security policy applies to:

- The main Dorkroom application (dorkroom.art)
- The @dorkroom/api package
- Any serverless functions in the `/api` directory
- Supabase edge functions

### Out of Scope

- Third-party services (Supabase, Vercel, etc.) - report directly to those providers
- Social engineering attacks
- Denial of service attacks
- Issues in dependencies - report to the upstream project

## Supported Versions

Dorkroom uses [CalVer](https://calver.org/) versioning (`YYYY.MM.DD`). Only the latest release is supported with security fixes.

| Version | Supported          |
| ------- | ------------------ |
| Latest (`YYYY.MM.DD`) | :white_check_mark: |
| Older releases | :x:                |

## Security Best Practices

When contributing code, please follow these security guidelines:

- Never commit secrets, API keys, or credentials
- Use environment variables for sensitive configuration
- Validate all user input with Zod schemas
- Use parameterized queries for any database operations
- Follow the principle of least privilege for API permissions

## Acknowledgments

We appreciate the security research community's efforts in helping keep Dorkroom secure. Researchers who responsibly disclose vulnerabilities will be acknowledged here (with their permission).

---

Thank you for helping keep Dorkroom and its users safe.
