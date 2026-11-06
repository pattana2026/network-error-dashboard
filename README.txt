AMS Web Auto Author + Time (2026-11-06)

1. BACK UP currently deployed Cloudflare Worker and index.html.
2. Review Worker diff against current production version before deploying: this Worker is based on the last shared-audit Worker supplied in the conversation. If newer production changes exist, merge only the /ams/remark changes.
3. Deploy Worker first, then index.html.
4. Enter a test remark and verify AMS Web statremark contains the text plus author/time.
5. Blank remark stays blank (no author footer).
6. Existing remarks are not modified retroactively.

Security: author/time generated server-side from authenticated login, Asia/Bangkok timezone.
