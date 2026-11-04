AMS REMARK CENTRAL — STAGING ONLY — 2026-11-04

Changes from AMS_Complete_Recovery_20261104:
1. Worker: POST /ams/remark checks session and can_comment, writes AMS Data/update atg_site.statremark, verifies Data/info read-back, records audit.
2. Frontend: only the Remark save endpoint changes from localhost:8765/api/remark to Worker /ams/remark.
3. Other local-client endpoints and modules are unchanged. This does NOT remove the Local Client dependency for alarms, commands, or other functions.

DO NOT DEPLOY TO PRODUCTION UNTIL STAGING TESTS PASS.
In a separate STAGING Worker, configure AMS_UID and AMS_PWD as secrets and AMS_REMARK_WRITE_ENABLED=true.
Confirm Worker can reach AMS /Auth/login2 and /Data/info from Cloudflare; the existing AMS Direct connector has had transport problems previously.
Keep AMS_REMARK_WRITE_ENABLED unset/false in Production until validated.
The frontend file points to the existing production Worker domain; for staging testing, change AMS_AUTH_API to the staging Worker domain and deploy the HTML only to staging.
Verify: login as authorized user; save a harmless test remark on a test station; compare AMS Web and second browser; verify audit; test unauthorized user, invalid station, and upstream failure.
The test will write REAL AMS data if enabled. Back up original remark before test.
If Cloudflare cannot reach AMS API, do not expose local port 8765 to Internet. Use a securely authenticated outbound agent/queue design instead.
Rollback: restore original index.html and worker_production.js from the Complete Recovery ZIP.
