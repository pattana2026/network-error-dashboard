var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker_production.js
var enc = new TextEncoder();
var ITER = 1e5;
var OWNER_USERNAME = "AMSNetwork_Admin";
var USER_MODULES = ["network_error", "contract", "station_master", "remark", "analysis"];
var isOwner = /* @__PURE__ */ __name((u) => u?.role === "admin" && u?.username?.toLowerCase() === OWNER_USERNAME.toLowerCase(), "isOwner");
var MODULES = ["network_error", "contract", "alarm", "station_master", "remark", "analysis"];
var json = /* @__PURE__ */ __name((data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } }), "json");
var bytes = /* @__PURE__ */ __name((n) => crypto.getRandomValues(new Uint8Array(n)), "bytes");
var hex = /* @__PURE__ */ __name((b) => [...b].map((x) => x.toString(16).padStart(2, "0")).join(""), "hex");
var unhex = /* @__PURE__ */ __name((s) => new Uint8Array(s.match(/.{2}/g).map((x) => parseInt(x, 16))), "unhex");
var sha256 = /* @__PURE__ */ __name(async (s) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))), "sha256");
async function passhash(password, salt = hex(bytes(16))) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const result = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: unhex(salt), iterations: ITER, hash: "SHA-256" }, key, 256);
  return `pbkdf2_sha256$${ITER}$${salt}$${hex(new Uint8Array(result))}`;
}
__name(passhash, "passhash");
async function verify(password, stored) {
  const parts = stored?.split("$");
  if (parts?.length !== 4 || parts[0] !== "pbkdf2_sha256" || !/^\d+$/.test(parts[1])) return false;
  const iterations = Number(parts[1]);
  if (iterations < 1e5 || iterations > 6e5 || !/^[0-9a-f]{32}$/.test(parts[2]) || !/^[0-9a-f]{64}$/.test(parts[3])) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const result = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: unhex(parts[2]), iterations, hash: "SHA-256" }, key, 256));
  const expected = unhex(parts[3]);
  let diff = 0;
  for (let i = 0; i < result.length; i++) diff |= result[i] ^ expected[i];
  return diff === 0;
}
__name(verify, "verify");
var cleanUser = /* @__PURE__ */ __name((u) => ({ id: u.id, username: u.username, display_name: u.display_name, role: u.role, is_active: !!u.is_active, must_change_password: !!u.must_change_password, created_at: u.created_at, last_login_at: u.last_login_at }), "cleanUser");
var isUsername = /* @__PURE__ */ __name((s) => typeof s === "string" && /^[a-zA-Z0-9_-]{3,40}$/.test(s), "isUsername");
var isPassword = /* @__PURE__ */ __name((s) => typeof s === "string" && s.length >= 12 && s.length <= 128, "isPassword");
var validModule = /* @__PURE__ */ __name((s) => typeof s === "string" && /^[a-z0-9_-]{2,60}$/.test(s), "validModule");
async function parseBody(req) {
  const s = await req.text();
  if (s.length > 16e3) throw new Error("BODY_TOO_LARGE");
  return JSON.parse(s || "{}");
}
__name(parseBody, "parseBody");
async function audit(db, actor, action, type, id = null, station = null, module = null, before = null, after = null) {
  await db.prepare("INSERT INTO audit_logs (id,actor_user_id,action,entity_type,entity_id,station_id,module_key,before_json,after_json) VALUES (?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), actor, action, type, id, station, module, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null).run();
}
__name(audit, "audit");
async function auth(req, db) {
  const match = /^Bearer ([A-Za-z0-9_-]{40,200})$/.exec(req.headers.get("Authorization") || "");
  if (!match) return null;
  const tokenHash = await sha256(match[1]);
  return await db.prepare("SELECT u.*,s.id session_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now') AND u.is_active=1").bind(tokenHash).first();
}
__name(auth, "auth");
async function permission(db, u, module, action) {
  if (module === "alarm") return isOwner(u);
  if (isOwner(u)) return true;
  const row = await db.prepare("SELECT * FROM module_permissions WHERE user_id=? AND module_key=?").bind(u.id, module).first();
  return !!row?.[action];
}
__name(permission, "permission");
async function issueSession(db, u) {
  const token = hex(bytes(32));
  const hash = await sha256(token);
  await db.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now','+12 hours'))").bind(crypto.randomUUID(), u.id, hash).run();
  return token;
}
__name(issueSession, "issueSession");

// AMS DIRECT READ-ONLY CONNECTOR. Credentials and upstream token never leave Worker.
const AMS_DIRECT_BASE = "https://ams.flowco.co.th:5443/client/api";
function amsDirectError(code, stage) {
  const error = new Error(code);
  error.safeCode = code;
  error.stage = stage;
  return error;
}
async function amsDirectFetch(url, options, stage) {
  let res;
  try {
    res = await fetch(url, {...options, redirect:"error", signal:AbortSignal.timeout(25000)});
  } catch (e) {
    throw amsDirectError(e?.name === "TimeoutError" ? "UPSTREAM_TIMEOUT" : "UPSTREAM_CONNECTION_FAILED",stage);
  }
  if (!res.ok) throw amsDirectError(res.status === 401 || res.status === 403 ? "UPSTREAM_AUTH_REJECTED" : "UPSTREAM_HTTP_ERROR",stage);
  try { return await res.json(); }
  catch { throw amsDirectError("UPSTREAM_INVALID_JSON",stage); }
}
async function amsDirectLogin(env) {
  if (!env.AMS_UID || !env.AMS_PWD) throw amsDirectError("CONFIG_MISSING","login");
  const body = new URLSearchParams({uid:env.AMS_UID,pwd:env.AMS_PWD,r:"0",_cc:"site"});
  const j = await amsDirectFetch(AMS_DIRECT_BASE+"/Auth/login2",{method:"POST",body},"login");
  if (!j?.issuccess || typeof j?.data?.s !== "string" || !j.data.s) throw amsDirectError("UPSTREAM_LOGIN_REJECTED","login");
  return j.data.s;
}
async function amsDirectData(token,typeload) {
  const j = await amsDirectFetch(AMS_DIRECT_BASE+"/Data/get",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({_t:"api_sites",typeload})},"data");
  if (!j?.issuccess || !Array.isArray(j?.data?.api_sites)) throw amsDirectError("UPSTREAM_SCHEMA_INVALID","data");
  return j.data.api_sites;
}
function amsSiteRow(r) {
  const v = i => String(r?.[i] ?? "").trim();
  if (!Array.isArray(r)) return {site_id:String(r?.site_id || r?.sta_id || "").trim(),last_inventory:String(r?.last_inventory || "")};
  return {site_id:v(0),last_inventory:v(3)};
}
function amsAgeMinutes(s,nowMs) {
  const m = /^(\\d{4})-(\\d{2})-(\\d{2})[ T](\\d{2}):(\\d{2})(?::(\\d{2}))?/.exec(s || "");
  if (!m) return null;
  const utcMs = Date.UTC(+m[1],+m[2]-1,+m[3],+m[4]-7,+m[5],+(m[6] || 0));
  return (nowMs-utcMs)/60000;
}
var worker_production_default = { async fetch(req, env) {
  const url = new URL(req.url), path = url.pathname, method = req.method;
  const allowed = (env.ALLOWED_ORIGIN || "").replace(/\/$/, "");
  const allowedOrigins = new Set([allowed].filter(Boolean));
  const origin = req.headers.get("Origin");
  const originAllowed = !!origin && allowedOrigins.has(origin);
  const cors = { "Vary": "Origin", "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Bootstrap-Secret", "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS" };
  if (originAllowed) cors["Access-Control-Allow-Origin"] = origin;
  if (method === "OPTIONS") return new Response(null, { status: originAllowed ? 204 : 403, headers: cors });
  const respond = /* @__PURE__ */ __name((obj, status = 200) => json(obj, status, cors), "respond");
  if (!env.DB) return respond({ error: "D1 binding DB is missing" }, 503);
  if (path === "/health" && method === "GET") return respond({ ok: true, service: "ams-dashboard-api" });
  if (origin && !originAllowed) return respond({ error: "Origin not allowed" }, 403);
  try {
    if (path === "/setup/admin" && method === "POST") {
      if (!env.BOOTSTRAP_SECRET || !env.ALLOWED_ORIGIN) return respond({ error: "Server configuration incomplete" }, 503);
      const supplied = req.headers.get("X-Bootstrap-Secret") || "";
      if (supplied.length < 32 || supplied !== env.BOOTSTRAP_SECRET) return respond({ error: "Forbidden" }, 403);
      const existing = await env.DB.prepare("SELECT COUNT(*) n FROM users").first();
      if (existing.n !== 0) return respond({ error: "Setup already completed" }, 409);
      const b = await parseBody(req);
      if (!isUsername(b.username) || !isPassword(b.password) || typeof b.display_name !== "string" || !b.display_name.trim() || b.display_name.length > 100) return respond({ error: "Invalid admin details (password minimum 12 characters)" }, 400);
      const id = crypto.randomUUID(), hash = await passhash(b.password);
      await env.DB.prepare("INSERT INTO users(id,username,display_name,password_hash,role,must_change_password) VALUES(?,?,?,?,'admin',0)").bind(id, b.username, b.display_name.trim(), hash).run();
      await audit(env.DB, id, "bootstrap_admin", "user", id);
      return respond({ ok: true, username: b.username }, 201);
    }
    if (path === "/auth/login" && method === "POST") {
      const b = await parseBody(req);
      if (!isUsername(b.username) || typeof b.password !== "string" || b.password.length > 128) return respond({ error: "Invalid credentials" }, 401);
      const u2 = await env.DB.prepare("SELECT * FROM users WHERE username=? COLLATE NOCASE AND is_active=1").bind(b.username).first();
      const dummy = "pbkdf2_sha256$100000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000";
      const good = await verify(b.password, u2?.password_hash || dummy);
      if (!u2 || !good) return respond({ error: "Invalid credentials" }, 401);
      const token = await issueSession(env.DB, u2);
      await env.DB.prepare("UPDATE users SET last_login_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(u2.id).run();
      await audit(env.DB, u2.id, "login", "session");
      return respond({ token, user: cleanUser(u2), expires_in_seconds: 43200 });
    }
    if (path.startsWith("/central/service/")) {
      const supplied = req.headers.get("X-Central-Key") || "";
      if (!env.CENTRAL_CLIENT_KEY || env.CENTRAL_CLIENT_KEY.length < 32 || supplied !== env.CENTRAL_CLIENT_KEY) return respond({ error: "Forbidden" }, 403);
      if (method !== "POST") return respond({ error: "Method not allowed" }, 405);
      const now = Date.now();
      if (path === "/central/service/claim") {
        await env.DB.prepare("UPDATE central_network_jobs SET status='failed',finished_ms=?,error='Agent timeout' WHERE status='running' AND created_ms<?").bind(now, now - 12e5).run();
        const pending = await env.DB.prepare("SELECT id FROM central_network_jobs WHERE status='pending' ORDER BY created_ms LIMIT 1").first();
        if (!pending) return respond({ ok: true, job: null });
        const changed = await env.DB.prepare("UPDATE central_network_jobs SET status='running' WHERE id=? AND status='pending'").bind(pending.id).run();
        return respond({ ok: true, job: changed.meta.changes === 1 ? { id: pending.id } : null });
      }
      const raw = await req.text();
      if (raw.length > 7e4) return respond({ error: "Central request too large" }, 413);
      let b;
      try {
        b = JSON.parse(raw || "{}");
      } catch {
        return respond({ error: "Invalid JSON" }, 400);
      }
      const jid = b.job_id;
      if (typeof jid !== "string" || !/^[0-9a-f-]{36}$/.test(jid)) return respond({ error: "Invalid job" }, 400);
      const job = await env.DB.prepare("SELECT status FROM central_network_jobs WHERE id=?").bind(jid).first();
      if (!job || job.status !== "running") return respond({ error: "Job not running" }, 409);
      if (path === "/central/service/begin") {
        const count = b.chunk_count, bytesCount = b.byte_count;
        if (!Number.isInteger(count) || count < 1 || count > 256 || !Number.isInteger(bytesCount) || bytesCount < 2 || bytesCount > 8 * 1024 * 1024) return respond({ error: "Invalid snapshot size" }, 400);
        await env.DB.prepare("DELETE FROM central_network_snapshot_chunks WHERE version_id=?").bind(jid).run();
        await env.DB.prepare("INSERT OR REPLACE INTO central_network_snapshot_uploads(version_id,chunk_count,byte_count,created_ms) VALUES(?,?,?,?)").bind(jid, count, bytesCount, now).run();
        return respond({ ok: true });
      }
      if (path === "/central/service/chunk") {
        const meta = await env.DB.prepare("SELECT chunk_count FROM central_network_snapshot_uploads WHERE version_id=?").bind(jid).first();
        if (!meta || !Number.isInteger(b.index) || b.index < 0 || b.index >= meta.chunk_count || typeof b.content !== "string" || enc.encode(b.content).length > 49152) return respond({ error: "Invalid chunk" }, 400);
        await env.DB.prepare("INSERT OR REPLACE INTO central_network_snapshot_chunks(version_id,chunk_index,content) VALUES(?,?,?)").bind(jid, b.index, b.content).run();
        return respond({ ok: true });
      }
      if (path === "/central/service/complete") {
        const meta = await env.DB.prepare("SELECT chunk_count,byte_count FROM central_network_snapshot_uploads WHERE version_id=?").bind(jid).first();
        if (!meta) return respond({ error: "Upload not started" }, 409);
        const parts = await env.DB.prepare("SELECT chunk_index,content FROM central_network_snapshot_chunks WHERE version_id=? ORDER BY chunk_index").bind(jid).all();
        if (parts.results.length !== meta.chunk_count || parts.results.some((x, i) => x.chunk_index !== i)) return respond({ error: "Chunks missing" }, 409);
        const joined = parts.results.map((x) => x.content).join("");
        if (enc.encode(joined).length !== meta.byte_count) return respond({ error: "Byte count mismatch" }, 409);
        let parsed;
        try {
          parsed = JSON.parse(joined);
        } catch {
          return respond({ error: "Invalid snapshot JSON" }, 400);
        }
        if (parsed.success !== true || !Array.isArray(parsed.all_auto_data) || !Array.isArray(parsed.data) || !parsed.all_auto_data.length) return respond({ error: "Invalid AMS snapshot" }, 400);
        const old = await env.DB.prepare("SELECT version_id FROM central_network_snapshot_current WHERE id=1").first();
        await env.DB.batch([
          env.DB.prepare("INSERT INTO central_network_snapshot_current(id,version_id,chunk_count,byte_count,updated_ms) VALUES(1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET version_id=excluded.version_id,chunk_count=excluded.chunk_count,byte_count=excluded.byte_count,updated_ms=excluded.updated_ms").bind(jid, meta.chunk_count, meta.byte_count, now),
          env.DB.prepare("UPDATE central_network_jobs SET status='done',finished_ms=? WHERE id=? AND status='running'").bind(now, jid),
          env.DB.prepare("DELETE FROM central_network_snapshot_uploads WHERE version_id=?").bind(jid)
        ]);
        if (old && old.version_id !== jid) await env.DB.prepare("DELETE FROM central_network_snapshot_chunks WHERE version_id=?").bind(old.version_id).run();
        return respond({ ok: true });
      }
      if (path === "/central/service/fail") {
        await env.DB.prepare("UPDATE central_network_jobs SET status='failed',finished_ms=?,error=? WHERE id=? AND status='running'").bind(now, String(b.error || "Agent error").slice(0, 400), jid).run();
        await env.DB.prepare("DELETE FROM central_network_snapshot_chunks WHERE version_id=?").bind(jid).run();
        await env.DB.prepare("DELETE FROM central_network_snapshot_uploads WHERE version_id=?").bind(jid).run();
        return respond({ ok: true });
      }
      return respond({ error: "Not found" }, 404);
    }
    const u = await auth(req, env.DB);
    if (!u) return respond({ error: "Unauthorized" }, 401);
    // Admin-only transport probe: no AMS credentials, token, or response body.
    // This verifies HTTPS reachability only, not POST login or Data/get.
    if (path === "/ams-direct/transport-check" && method === "GET") {
      if (!isOwner(u)) return respond({error:"Forbidden"},403);
      if (env.AMS_DIRECT_ENABLED !== "true") return respond({error:"AMS direct connector disabled"},503);
      const started = Date.now();
      try {
        const upstream = await fetch(AMS_DIRECT_BASE + "/Auth/login2", {
          method: "GET",
          redirect: "manual",
          cache: "no-store",
          signal: AbortSignal.timeout(12000)
        });
        const status = upstream.status;
        // Do not read, log, or return the upstream response body or headers.
        if (upstream.body) await upstream.body.cancel().catch(() => {});
        return respond({
          ok: true,
          probe: "HTTPS_GET_NO_CREDENTIALS",
          transport: "connected",
          upstream_http_status: status,
          elapsed_ms: Date.now() - started,
          note: "Transport only; AMS login not verified"
        });
      } catch (e) {
        return respond({
          ok: false,
          probe: "HTTPS_GET_NO_CREDENTIALS",
          transport: "failed",
          code: e?.name === "TimeoutError" ? "UPSTREAM_TIMEOUT" : "UPSTREAM_CONNECTION_FAILED",
          stage: "transport",
          elapsed_ms: Date.now() - started
        },502);
      }
    }
    // Admin-only read-only connectivity/logic check. Never exposes AMS credentials/token.
    if (path === "/ams-direct/network-check" && method === "GET") {
      if (!isOwner(u)) return respond({error:"Forbidden"},403);
      if (env.AMS_DIRECT_ENABLED !== "true") return respond({error:"AMS direct connector disabled"},503);
      try {
        const token = await amsDirectLogin(env);
        const [allRows,errorRows] = await Promise.all([amsDirectData(token,"AUTO"),amsDirectData(token,"@error")]);
        const now = Date.now();
        const errors = errorRows.map(amsSiteRow).filter(x=>x.site_id);
        const overdue = errors.filter(x=>{const age=amsAgeMinutes(x.last_inventory,now);return age !== null && age >= 30;});
        const unknown = errors.filter(x=>amsAgeMinutes(x.last_inventory,now) === null).length;
        return respond({ok:true,source:"AMS API DIRECT",checked_at:new Date(now).toISOString(),auto_total:allRows.length,api_error_total:errors.length,network_over_30min:overdue.length,unknown_inventory_time:unknown});
      } catch (e) {
        // Never log or return raw upstream errors, credentials, tokens or response bodies.
        return respond({ok:false,error:"AMS direct check failed",code:e?.safeCode || "DIRECT_CHECK_FAILED",stage:e?.stage || "unknown"},502);
      }
    }
    if (path === "/auth/verify-remark" && method === "POST") {
      if (u.must_change_password) return respond({ error: "Password change required", code: "MUST_CHANGE_PASSWORD" }, 403);
      const b = await parseBody(req);
      const module = b.module_key;
      if (!validModule(module) || !MODULES.includes(module)) return respond({ error: "Invalid module" }, 400);
      if (!await permission(env.DB, u, module, "can_comment")) return respond({ error: "Forbidden" }, 403);
      return respond({ ok: true, allowed: true, user: { id: u.id, username: u.username, display_name: u.display_name, role: u.role }, module_key: module });
    }
    if (path === "/auth/me" && method === "GET") {
      const perms = await env.DB.prepare("SELECT module_key,can_view,can_comment,can_operate,can_manage FROM module_permissions WHERE user_id=?").bind(u.id).all();
      return respond({ user: cleanUser(u), permissions: isOwner(u) ? MODULES.map((module_key) => ({ module_key, can_view: 1, can_comment: 1, can_operate: 1, can_manage: 1 })) : perms.results.filter((p) => p.module_key !== "alarm") });
    }
    if (path === "/auth/logout" && method === "POST") {
      await env.DB.prepare("UPDATE sessions SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(u.session_id).run();
      await audit(env.DB, u.id, "logout", "session", u.session_id);
      return respond({ ok: true });
    }
    if (path === "/auth/change-password" && method === "POST") {
      const b = await parseBody(req);
      if (!isPassword(b.new_password) || typeof b.old_password !== "string" || !await verify(b.old_password, u.password_hash)) {
        return respond({ error: "Invalid password" }, 400);
      }
      const hash = await passhash(b.new_password);
      const result = await env.DB.prepare(
        `UPDATE users
   SET password_hash = ?,
       must_change_password = 0
   WHERE id = ?`
      ).bind(hash, u.id).run();
      if (result.meta?.changes !== 1) {
        console.error("Password update failed", {
          user_id: u.id,
          changes: result.meta?.changes
        });
        return respond({ error: "Password update failed" }, 500);
      }
      await env.DB.prepare(`
        UPDATE sessions
        SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE user_id = ? AND id <> ?
      `).bind(u.id, u.session_id).run();
      await audit(env.DB, u.id, "change_password", "user", u.id);
      return respond({ ok: true });
    }
    if (u.must_change_password) return respond({ error: "Password change required", code: "MUST_CHANGE_PASSWORD" }, 403);
    if (path === "/users" && method === "GET") {
      if (!isOwner(u)) return respond({ error: "Forbidden" }, 403);
      const r = await env.DB.prepare("SELECT id,username,display_name,role,is_active,must_change_password,created_at,last_login_at FROM users ORDER BY username LIMIT 500").all();
      return respond({ users: r.results });
    }
    if (path === "/users" && method === "POST") {
      if (!isOwner(u)) return respond({ error: "Forbidden" }, 403);
      const b = await parseBody(req), roles = ["supervisor", "staff", "viewer"];
      if (!isUsername(b.username) || !isPassword(b.password) || typeof b.display_name !== "string" || !b.display_name.trim() || b.display_name.length > 100 || !roles.includes(b.role)) return respond({ error: "Invalid user details" }, 400);
      const id = crypto.randomUUID(), hash = await passhash(b.password);
      try {
        const stmts = [env.DB.prepare("INSERT INTO users(id,username,display_name,password_hash,role,must_change_password) VALUES(?,?,?,?,?,1)").bind(id, b.username, b.display_name.trim(), hash, b.role)];
        for (const module of USER_MODULES) stmts.push(env.DB.prepare("INSERT INTO module_permissions(user_id,module_key,can_view,can_comment,can_operate,can_manage) VALUES(?,?,1,1,1,1)").bind(id, module));
        await env.DB.batch(stmts);
      } catch {
        return respond({ error: "Username already exists or database error" }, 409);
      }
      await audit(env.DB, u.id, "create_user", "user", id, null, null, null, { username: b.username, role: b.role });
      return respond({ id, username: b.username }, 201);
    }
    const resetMatch = /^\/users\/([0-9a-f-]{36})\/reset-password$/.exec(path);
    if (resetMatch && method === "POST") {
      if (!isOwner(u)) return respond({ error: "Forbidden" }, 403);
      const b = await parseBody(req);
      if (!isPassword(b.new_password)) return respond({ error: "Invalid password" }, 400);
      const target = await env.DB.prepare("SELECT id,username FROM users WHERE id=?").bind(resetMatch[1]).first();
      if (!target) return respond({ error: "Not found" }, 404);
      if (target.username?.toLowerCase() === OWNER_USERNAME.toLowerCase()) return respond({ error: "Owner password must be changed with current password" }, 403);
      const hash = await passhash(b.new_password);
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET password_hash=?,must_change_password=1 WHERE id=?").bind(hash, target.id),
        env.DB.prepare("UPDATE sessions SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id=? AND revoked_at IS NULL").bind(target.id)
      ]);
      await audit(env.DB, u.id, "reset_password", "user", target.id);
      return respond({ ok: true });
    }
    const userMatch = /^\/users\/([0-9a-f-]{36})$/.exec(path);
    if (userMatch && method === "PATCH") {
      if (!isOwner(u)) return respond({ error: "Forbidden" }, 403);
      const id = userMatch[1], b = await parseBody(req);
      const target = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(id).first();
      if (!target) return respond({ error: "Not found" }, 404);
      if (id === u.id && (b.is_active === false || b.role && b.role !== "admin")) return respond({ error: "Cannot disable or demote yourself" }, 400);
      if (target.username?.toLowerCase() === OWNER_USERNAME.toLowerCase() && id !== u.id) return respond({ error: "Owner account is protected" }, 403);
      const role = b.role ?? target.role, active = b.is_active === void 0 ? target.is_active : b.is_active ? 1 : 0, name = b.display_name ?? target.display_name;
      if (!["supervisor", "staff", "viewer"].includes(role) && !(id === u.id && role === "admin") || typeof name !== "string" || !name.trim() || name.length > 100) return respond({ error: "Invalid fields" }, 400);
      await env.DB.prepare("UPDATE users SET role=?,is_active=?,display_name=? WHERE id=?").bind(role, active, name.trim(), id).run();
      if (!active) await env.DB.prepare("UPDATE sessions SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id=? AND revoked_at IS NULL").bind(id).run();
      await audit(env.DB, u.id, "update_user", "user", id, null, null, { role: target.role, is_active: target.is_active }, { role, is_active: active });
      return respond({ ok: true });
    }
    const permMatch = /^\/users\/([0-9a-f-]{36})\/permissions$/.exec(path);
    if (permMatch && method === "GET") {
      if (!isOwner(u)) return respond({ error: "Forbidden" }, 403);
      const target = await env.DB.prepare("SELECT id FROM users WHERE id=?").bind(permMatch[1]).first();
      if (!target) return respond({ error: "User not found" }, 404);
      const rows = await env.DB.prepare("SELECT module_key,can_view,can_comment,can_operate,can_manage FROM module_permissions WHERE user_id=?").bind(permMatch[1]).all();
      return respond({ permissions: rows.results });
    }
    if (permMatch && method === "PUT") {
      if (!isOwner(u)) return respond({ error: "Forbidden" }, 403);
      const b = await parseBody(req);
      if (!validModule(b.module_key) || !MODULES.includes(b.module_key)) return respond({ error: "Invalid module" }, 400);
      if (b.module_key === "alarm") return respond({ error: "Alarm is Owner-only" }, 403);
      const target = await env.DB.prepare("SELECT id,username FROM users WHERE id=?").bind(permMatch[1]).first();
      if (!target) return respond({ error: "User not found" }, 404);
      if (target.username?.toLowerCase() === OWNER_USERNAME.toLowerCase()) return respond({ error: "Owner permissions are protected" }, 403);
      const flags = ["can_view", "can_comment", "can_operate", "can_manage"].map((k) => b[k] === true ? 1 : 0);
      await env.DB.prepare("INSERT INTO module_permissions(user_id,module_key,can_view,can_comment,can_operate,can_manage) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,module_key) DO UPDATE SET can_view=excluded.can_view,can_comment=excluded.can_comment,can_operate=excluded.can_operate,can_manage=excluded.can_manage").bind(permMatch[1], b.module_key, ...flags).run();
      await audit(env.DB, u.id, "set_permission", "permission", permMatch[1], null, b.module_key, null, { flags });
      return respond({ ok: true });
    }
    if (path === "/central/network/snapshot" && method === "GET") {
      if (!await permission(env.DB, u, "network_error", "can_view")) return respond({ error: "Forbidden" }, 403);
      const meta = await env.DB.prepare("SELECT version_id,chunk_count,byte_count FROM central_network_snapshot_current WHERE id=1").first();
      if (!meta) return respond({ error: "Snapshot not ready" }, 404);
      const parts = await env.DB.prepare("SELECT chunk_index,content FROM central_network_snapshot_chunks WHERE version_id=? ORDER BY chunk_index").bind(meta.version_id).all();
      if (parts.results.length !== meta.chunk_count) return respond({ error: "Snapshot incomplete" }, 503);
      const body = parts.results.map((x) => x.content).join("");
      if (enc.encode(body).length !== meta.byte_count) return respond({ error: "Snapshot length mismatch" }, 503);
      return new Response(body, { headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
    }
    if (path === "/central/network/reload" && method === "POST") {
      if (!await permission(env.DB, u, "network_error", "can_view")) return respond({ error: "Forbidden" }, 403);
      const now = Date.now();
      await env.DB.prepare("UPDATE central_network_jobs SET status='failed',finished_ms=?,error='Agent offline timeout' WHERE status='pending' AND created_ms<?").bind(now, now - 18e4).run();
      const existing = await env.DB.prepare("SELECT id,status,created_ms FROM central_network_jobs WHERE status IN ('pending','running') AND created_ms>? ORDER BY created_ms DESC LIMIT 1").bind(now - 18e4).first();
      if (existing) return respond({ ok: true, job_id: existing.id, status: existing.status, reused: true });
      const recent = await env.DB.prepare("SELECT created_ms FROM central_network_jobs WHERE status='done' ORDER BY created_ms DESC LIMIT 1").first();
      if (recent && now - recent.created_ms < 6e4) return respond({ error: "Reload cooldown", retry_after_seconds: Math.ceil((6e4 - (now - recent.created_ms)) / 1e3) }, 429);
      const id = crypto.randomUUID();
      try {
        await env.DB.prepare("INSERT INTO central_network_jobs(id,status,created_ms,actor_user_id) VALUES(?,'pending',?,?)").bind(id, now, u.id).run();
      } catch (e) {
        const active = await env.DB.prepare("SELECT id,status FROM central_network_jobs WHERE status IN ('pending','running') ORDER BY created_ms DESC LIMIT 1").first();
        if (active) return respond({ ok: true, job_id: active.id, status: active.status, reused: true });
        throw e;
      }
      await audit(env.DB, u.id, "central_network_reload", "network_job", id, null, "network_error");
      return respond({ ok: true, job_id: id, status: "pending" }, 202);
    }
    const statusMatch = /^\/central\/network\/jobs\/([0-9a-f-]{36})$/.exec(path);
    if (statusMatch && method === "GET") {
      if (!await permission(env.DB, u, "network_error", "can_view")) return respond({ error: "Forbidden" }, 403);
      const job = await env.DB.prepare("SELECT id,status,created_ms,finished_ms,error FROM central_network_jobs WHERE id=?").bind(statusMatch[1]).first();
      return job ? respond({ ok: true, job }) : respond({ error: "Not found" }, 404);
    }
    if (path === "/remarks" && method === "GET") {
      const station = url.searchParams.get("station_id"), module = url.searchParams.get("module_key");
      if (!station || station.length > 100 || !validModule(module)) return respond({ error: "station_id and module_key required" }, 400);
      if (!await permission(env.DB, u, module, "can_view")) return respond({ error: "Forbidden" }, 403);
      const r = await env.DB.prepare("SELECT r.id,r.station_id,r.module_key,r.body,r.created_at,r.updated_at,r.created_by,cu.username created_by_username,cu.display_name created_by_name,r.updated_by FROM remarks r JOIN users cu ON cu.id=r.created_by WHERE r.station_id=? AND r.module_key=? AND r.deleted_at IS NULL ORDER BY r.created_at DESC LIMIT 200").bind(station, module).all();
      return respond({ remarks: r.results });
    }
    if (path === "/remarks" && method === "POST") {
      const b = await parseBody(req);
      if (typeof b.station_id !== "string" || !b.station_id.trim() || b.station_id.length > 100 || !validModule(b.module_key) || typeof b.body !== "string" || !b.body.trim() || b.body.length > 5e3) return respond({ error: "Invalid remark" }, 400);
      if (!await permission(env.DB, u, b.module_key, "can_comment")) return respond({ error: "Forbidden" }, 403);
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO remarks(id,station_id,module_key,body,created_by) VALUES(?,?,?,?,?)").bind(id, b.station_id.trim(), b.module_key, b.body.trim(), u.id).run();
      await audit(env.DB, u.id, "create_remark", "remark", id, b.station_id, b.module_key, null, { body: b.body.trim() });
      return respond({ id, created_by: u.id, created_by_username: u.username }, 201);
    }
    const remarkMatch = /^\/remarks\/([0-9a-f-]{36})$/.exec(path);
    if (remarkMatch && (method === "PATCH" || method === "DELETE")) {
      const r = await env.DB.prepare("SELECT * FROM remarks WHERE id=? AND deleted_at IS NULL").bind(remarkMatch[1]).first();
      if (!r) return respond({ error: "Not found" }, 404);
      if (u.id !== r.created_by && !await permission(env.DB, u, r.module_key, "can_manage")) return respond({ error: "Forbidden" }, 403);
      if (!await permission(env.DB, u, r.module_key, "can_comment")) return respond({ error: "Forbidden" }, 403);
      if (method === "DELETE") await env.DB.prepare("UPDATE remarks SET deleted_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),updated_by=? WHERE id=?").bind(u.id, r.id).run();
      else {
        const b = await parseBody(req);
        if (typeof b.body !== "string" || !b.body.trim() || b.body.length > 5e3) return respond({ error: "Invalid remark" }, 400);
        await env.DB.prepare("UPDATE remarks SET body=?,updated_by=? WHERE id=?").bind(b.body.trim(), u.id, r.id).run();
      }
      await audit(env.DB, u.id, method === "DELETE" ? "delete_remark" : "update_remark", "remark", r.id, r.station_id, r.module_key, { body: r.body }, method === "PATCH" ? { changed: true } : null);
      return respond({ ok: true });
    }
    if (path === "/audit" && method === "GET") {
      if (!isOwner(u)) return respond({ error: "Forbidden" }, 403);
      const r = await env.DB.prepare("SELECT a.*,u.username actor_username FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT 200").all();
      return respond({ logs: r.results });
    }
    return respond({ error: "Not found" }, 404);
  } catch (e) {
    console.error("AMS API error", {
      name: e?.name,
      message: e?.message,
      stack: e?.stack
    });
    return respond({ error: "Request failed" }, 500);
  }
} };
export {
  worker_production_default as default
};
//# sourceMappingURL=worker_production.js.map
