"use strict";

function sendJson(response, status, body) {
  response.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(body));
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { message:"Method not allowed." });
  }

  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  const publicKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "");
  if (!url || !serviceKey || !publicKey) {
    return sendJson(response, 503, { message:"Username login is not configured yet." });
  }

  let body = request.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body || "{}"); }
    catch (_) { return sendJson(response, 400, { message:"Invalid request." }); }
  }
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (username.length < 2 || username.length > 80 || password.length < 6 || password.length > 200) {
    return sendJson(response, 401, { message:"Incorrect username or password." });
  }

  const adminHeaders = { apikey:serviceKey, Authorization:`Bearer ${serviceKey}` };
  try {
    const profileResponse = await fetch(`${url}/rest/v1/profiles?select=id&username=ilike.${encodeURIComponent(username)}&limit=1`, {
      headers: adminHeaders
    });
    const profiles = profileResponse.ok ? await profileResponse.json() : [];
    const userId = profiles?.[0]?.id;
    if (!userId) return sendJson(response, 401, { message:"Incorrect username or password." });

    const userResponse = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      headers: adminHeaders
    });
    const user = userResponse.ok ? await userResponse.json() : null;
    if (!user?.email) return sendJson(response, 401, { message:"Incorrect username or password." });

    const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method:"POST",
      headers: { apikey:publicKey, "Content-Type":"application/json" },
      body:JSON.stringify({ email:user.email, password })
    });
    const session = await authResponse.json().catch(() => ({}));
    if (!authResponse.ok) return sendJson(response, 401, { message:"Incorrect username or password." });

    return sendJson(response, 200, session);
  } catch (_) {
    return sendJson(response, 503, { message:"Login is temporarily unavailable." });
  }
};
