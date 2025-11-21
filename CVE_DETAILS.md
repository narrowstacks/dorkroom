# Detailed CVE Information

## CVE-1: esbuild Development Server Vulnerability

**Advisory ID:** GHSA-67mh-4wv8-2f99  
**Published:** 2024-12-18  
**Severity:** Moderate (CVSS 5.3)

### Technical Details

The vulnerability in esbuild's development server allows any website to send arbitrary requests to the development server and read the responses. This is an **Origin Validation Error (CWE-346)**.

**CVSS Vector:** CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:N/A:N

- **Attack Vector (AV:N):** Network - attacker can exploit remotely
- **Attack Complexity (AC:H):** High - requires specific conditions
- **Privileges Required (PR:N):** None
- **User Interaction (UI:R):** Required - victim must perform an action
- **Scope (S:U):** Unchanged
- **Confidentiality (C:H):** High impact
- **Integrity (I:N):** No impact
- **Availability (A:N):** No impact

### Affected Versions

- esbuild ≤ 0.24.2

### Fixed Versions

- esbuild ≥ 0.24.3

### Mitigation

- Update esbuild to version 0.24.3 or later
- This only affects development servers, not production builds
- Ensure development servers are not exposed to untrusted networks

---

## CVE-2: path-to-regexp ReDoS Vulnerability

**Advisory ID:** GHSA-9wv6-86v2-598j  
**Published:** 2024-09-09  
**Severity:** High (CVSS 7.5)

### Technical Details

The path-to-regexp library outputs backtracking regular expressions that can lead to Regular Expression Denial of Service (ReDoS). This is an **Inefficient Regular Expression Complexity (CWE-1333)** vulnerability.

**CVSS Vector:** CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H

- **Attack Vector (AV:N):** Network
- **Attack Complexity (AC:L):** Low - easy to exploit
- **Privileges Required (PR:N):** None
- **User Interaction (UI:N):** None required
- **Scope (S:U):** Unchanged
- **Confidentiality (C:N):** No impact
- **Integrity (I:N):** No impact
- **Availability (A:H):** High impact (DoS)

### Affected Versions

- path-to-regexp >= 4.0.0, < 6.3.0

### Fixed Versions

- path-to-regexp >= 6.3.0

### Attack Scenario

An attacker can craft malicious route patterns that cause excessive backtracking in the regular expression engine, consuming CPU resources and potentially causing a denial of service.

### Mitigation

- Update path-to-regexp to version 6.3.0 or later
- Implement request timeouts
- Rate limiting on route parsing operations

---

## CVE-3 & CVE-4: undici Multiple Vulnerabilities

### CVE-3a: Use of Insufficiently Random Values

**Advisory ID:** GHSA-c76h-2ccp-4975  
**Published:** 2024-08-12  
**Severity:** Moderate (CVSS 6.8)

**Technical Details:**

Undici uses insufficiently random values in certain cryptographic operations. This is a **Use of Insufficiently Random Values (CWE-330)** vulnerability.

**CVSS Vector:** CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:H/A:N

- **Attack Vector (AV:N):** Network
- **Attack Complexity (AC:H):** High
- **Privileges Required (PR:N):** None
- **User Interaction (UI:R):** Required
- **Scope (S:U):** Unchanged
- **Confidentiality (C:H):** High impact
- **Integrity (I:H):** High impact
- **Availability (A:N):** No impact

**Affected Versions:** >= 4.5.0, < 5.28.5  
**Fixed Versions:** >= 5.28.5

### CVE-3b: Denial of Service via Bad Certificate Data

**Advisory ID:** GHSA-cxrh-j4jr-qwg3  
**Published:** 2024-11-27  
**Severity:** Low (CVSS 3.1)

**Technical Details:**

Undici can suffer from a denial of service attack when processing malformed certificate data. This is a **Memory Leak (CWE-401)** vulnerability.

**CVSS Vector:** CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:N/I:N/A:L

- **Attack Vector (AV:N):** Network
- **Attack Complexity (AC:H):** High
- **Privileges Required (PR:L):** Low - some authentication required
- **User Interaction (UI:N):** None
- **Scope (S:U):** Unchanged
- **Confidentiality (C:N):** No impact
- **Integrity (I:N):** No impact
- **Availability (A:L):** Low impact

**Affected Versions:** < 5.29.0  
**Fixed Versions:** >= 5.29.0

### Mitigation

- Update undici to version 5.29.0 or later (latest is 7.16.0)
- Implement proper certificate validation
- Monitor for unusual memory consumption patterns

---

## Impact Assessment for Dorkroom Project

### Current Exposure

1. **esbuild (0.14.47):**
   - Used via @vercel/node for serverless functions
   - Development-only impact
   - Low risk in production deployment

2. **path-to-regexp (6.1.0):**
   - Used for route matching in @vercel/node
   - Potential DoS risk if exposed to untrusted route patterns
   - Medium risk - depends on usage patterns

3. **undici (5.28.4):**
   - HTTP client used by @vercel/node
   - Medium risk for security-sensitive operations
   - Low risk for typical API calls

### Overall Risk Level: **MEDIUM**

All vulnerabilities are in transitive dependencies used by @vercel/node, which is primarily used for Vercel deployment. The actual risk depends on:

- Whether the application is deployed on Vercel
- How @vercel/node is used in the codebase
- Network exposure of development environments

### Recommended Timeline

- **Immediate (within 24-48 hours):** Update @vercel/node to latest version
- **Short-term (within 1 week):** Verify fix and run security audit again
- **Ongoing:** Implement automated security scanning in CI/CD
