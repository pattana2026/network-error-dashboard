AMS Dashboard V2.11.12 — Contract dates from AMS API

Contents:
- index.html: Dashboard frontend
- worker_production.js: Cloudflare Worker, based on last available Worker package

Changes:
- /ams-direct/stations now returns contract_start, contract_end, purchase_type and installdate mapped from api_sites AUTO response, using the same index offset convention as the original Dashboard.
- Dashboard reads contract fields ONLY from the live API response. Embedded September contract-date fallback removed.
- Retains prior layout and authorization checks.

IMPORTANT BEFORE DEPLOYMENT:
1. Back up current Worker and Dashboard. Worker in this package is based on the latest AVAILABLE uploaded worker, not a verified live Production deployment. Compare with your deployed Worker before replacing.
2. Validate field mapping against actual AMS api_sites AUTO rows on staging, especially index offset and contract date format. If the upstream schema differs, these fields may be blank or incorrect.
3. Confirm active/expired KPIs and sample station IDs against authoritative AMS contract records.
4. Deploy Worker to staging first, then frontend staging. Do NOT deploy directly to Production without verifying.
5. No changes to AMS API, credentials, database or local client.
