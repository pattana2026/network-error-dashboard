AMS User Delete Fix - 2026-11-04

Based on Dashboard index V2.11.14 and Worker HTTP500 SQL Fix from previous package.

CHANGE: Owner AMSNetwork_Admin can delete a user with one browser confirmation (no typing username). Worker implements DELETE /users/{id} as logical archive, revokes sessions, removes permissions, and hides archived users from user list. Existing audit logs and remarks remain. Username is replaced with deleted_<uuid>; original username becomes available for reuse.

IMPORTANT: This is a logical deletion, NOT physical database deletion. The archived user row remains to preserve referential integrity.

DEPLOY: Backup both current live index.html and Worker first. Deploy Worker to Staging, then index.html to Staging. Verify admin/test_network_error/vatit logins and remark functionality, then test deletion on a disposable account. Only then promote both files to Production. Do not deploy only one file expecting full functionality.

No live deployment or database modification was performed by this package.
