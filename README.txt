AMS Shared Remark Audit - 2026-11-04

Contents:
- worker_remark_shared_audit_20261104.js
- index_remark_shared_audit_20261104.html

Changes:
1. Worker writes exact AMS-verified remark text and timestamp into audit_logs.after_json for NEW remark saves.
2. New authenticated GET /ams/remark-audit endpoint reads latest 1000 verified AMS remark audit records from D1, with network_error can_view permission.
3. Dashboard reads shared D1 audit and matches exact station ID and remark before displaying author.
4. Legacy local audit remains fallback if shared endpoint is unavailable.
5. Existing AMS write/readback and login/other modules are not intentionally modified.

Deploy instructions:
1. BACK UP the current deployed Worker and GitHub Pages index.html.
2. Deploy worker_remark_shared_audit_20261104.js to STAGING Worker first; keep existing environment bindings and secrets.
3. Publish index_remark_shared_audit_20261104.html as STAGING index.html; update its AMS_AUTH_API constant to staging Worker URL if your staging Worker differs from production.
4. Test authenticated read of /ams/remark-audit, with no credentials in screenshots.
5. Test ONE authorized new Remark and confirm AMS Web value, D1 audit, and display on a second machine.
6. Only then deploy to production and retain rollback copies.

Important: Existing audit_logs records written before this change have no exact remark text in after_json. They cannot be reliably matched across machines. The shared author display is guaranteed only for new verified saves made after the updated Worker is deployed. No D1 schema migration is required if the existing audit_logs table is the one used by the current working Audit Fix.

This package has passed JavaScript syntax checks but has NOT been tested against live Cloudflare/D1/AMS.
