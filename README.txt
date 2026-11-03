AMS Dashboard V2.11.15 — First-login Password Fix (STAGING)

Baseline: Dashboard V2.11.14; Worker from V2.11.12 Contract API package.
Uploaded AMS_Direct_Production_Integration_20261103(1).zip is an older baseline and is NOT used to overwrite newer features.

Fixes:
- Preserve the exact password successfully submitted to /auth/login in volatile JavaScript memory for forced password change.
- Do not read a potentially autofilled/changed password from the login field for /auth/change-password.
- Clear temporary credential on success, return to login, and login failure. Never store it in localStorage.
- Distinguish NEW_PASSWORD_INVALID vs CURRENT_PASSWORD_INVALID at Worker API; no secret in response.
- Update visible Dashboard version V2.11.15.

Deployment: Test index.html and worker_production.js together on staging. Worker file is derived from the available V2.11.12 worker, NOT verified byte-for-byte against currently deployed Worker. Diff against production before replacing; do not deploy blindly.
Test: reset a test user, login with temporary password, change to a distinct 12+ character password, login again, verify remarks. Do not share passwords/tokens.
No account, permission, or database changes made.
