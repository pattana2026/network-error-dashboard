# AMS Central Login — Staging test plan

Branch: `test-login`. Production branch `main` must remain unchanged until approved.

## Available staging files
- `login.html`: standalone login/logout smoke test against Cloudflare Worker.
- `admin.html`: standalone Admin UI for user creation, permissions, password change.

## Before release
1. Verify login, invalid password, logout and expired token using browser on the allowed origin.
2. Verify `GET /auth/me` returns `user` and `permissions`.
3. Verify `GET /users`, `POST /users`, `PUT /users/:id/permissions` request and response shapes against the deployed Worker.
4. Verify the admin UI reads existing permissions before editing; never overwrite unknown permissions with unchecked defaults.
5. Confirm Worker enforces Admin authorization for all user management endpoints.
6. Integrate central login with the full dashboard `index.html` and check existing Network, Alarm, Contract, Reports and station-tool behavior.
7. Enforce authorization on Local Client API commands server-side; hiding buttons in the HTML is insufficient.
8. Verify no passwords, API tokens or Cloudflare secrets are committed to GitHub.
9. Only merge to `main` after user acceptance.

## Deployment note
GitHub Pages commonly serves the configured production branch only. Creating a separate `test-login` branch does not automatically provide a staging website. Use an isolated staging deployment with an origin included in the Worker's CORS allowlist.

## Status
- GitHub staging files: created.
- Cloudflare live authentication: not yet browser-tested.
- Full dashboard integration: pending.
- Production: unchanged.
