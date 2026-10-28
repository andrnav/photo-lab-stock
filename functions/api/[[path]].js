const SESSION_COOKIE = "pls_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
  });
}
function cookieValue(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const found = cookieHeader.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return found ? found.slice(name.length + 1) : null;
}
async function sign(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function makeSession(env) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = `${expires}.${crypto.randomUUID()}`;
  const signature = await sign(token, env.SESSION_SECRET);
  return `${token}.${signature}`;
}
async function validSession(request, env) {
  const raw = cookieValue(request, SESSION_COOKIE);
  if (!raw || !env.SESSION_SECRET) return false;
  const parts = raw.split(".");
  if (parts.length !== 3) return false;
  const [expires, nonce, signature] = parts;
  if (!/^\d+$/.test(expires) || Number(expires) < Math.floor(Date.now() / 1000)) return false;
  const expected = await sign(`${expires}.${nonce}`, env.SESSION_SECRET);
  return signature.length === expected.length && crypto.subtle.timingSafeEqual
    ? crypto.subtle.timingSafeEqual(new TextEncoder().encode(signature), new TextEncoder().encode(expected))
    : signature === expected;
}
function sessionCookie(value, maxAge = SESSION_TTL_SECONDS) {
  return `${SESSION_COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}
async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}
function validText(value, max = 250) { return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max; }
function validNumber(value) { return typeof value === "number" && Number.isFinite(value) && value >= 0; }
function newId() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }
async function logMovement(db, item, type, amount, after, note = "") {
  await db.prepare(`INSERT INTO movements (id,item_id,item_name,unit,change_type,change_amount,quantity_after,note,created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(newId(), item.id, item.name, item.unit, type, amount, after, note, now()).run();
}
async function handler(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const method = request.method.toUpperCase();

  if (path === "login" && method === "POST") {
    if (!env.APP_PASSWORD || !env.SESSION_SECRET) return json({ error: "Serverio paslaptis nesukonfigūruota. Patikrinkite Cloudflare nustatymus." }, 500);
    const body = await readJson(request);
    if (!body || typeof body.password !== "string") return json({ error: "Įveskite slaptažodį." }, 400);
    if (body.password !== env.APP_PASSWORD) return json({ error: "Neteisingas slaptažodis." }, 401);
    const token = await makeSession(env);
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
  }
  if (path === "session" && method === "GET") {
    return validSession(request, env) ? json({ ok: true }) : json({ error: "Reikia prisijungti." }, 401);
  }
  if (path === "logout" && method === "POST") {
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
  }
  if (!(await validSession(request, env))) return json({ error: "Reikia prisijungti." }, 401);

  const db = env.DB;
  if (!db) return json({ error: "Duomenų bazė neprijungta. Patikrinkite DB binding nustatymą." }, 500);

  if (path === "items" && method === "GET") {
    const result = await db.prepare("SELECT * FROM items ORDER BY name COLLATE NOCASE").all();
    return json({ items: result.results || [] });
  }
  if (path === "items" && method === "POST") {
    const body = await readJson(request);
    if (!body || !validText(body.name, 100) || !validText(body.category, 60) ||
        !validText(body.unit, 12) || !validNumber(body.quantity) || !validNumber(body.min_quantity) ||
        typeof body.note !== "string" || body.note.length > 250) return json({ error: "Patikrinkite įvestus duomenis." }, 400);
    const item = { id: newId(), name: body.name.trim(), category: body.category, unit: body.unit, quantity: body.quantity, min_quantity: body.min_quantity, note: body.note.trim(), created_at: now(), updated_at: now() };
    await db.prepare(`INSERT INTO items (id,name,category,unit,quantity,min_quantity,note,created_at,updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(item.id,item.name,item.category,item.unit,item.quantity,item.min_quantity,item.note,item.created_at,item.updated_at).run();
    await logMovement(db, item, "created", item.quantity, item.quantity, "Pradinė pozicija");
    return json({ item }, 201);
  }
  const itemMatch = path.match(/^items\/([0-9a-f-]+)$/i);
  if (itemMatch && method === "PUT") {
    const body = await readJson(request);
    if (!body || !validText(body.name, 100) || !validText(body.category, 60) ||
        !validText(body.unit, 12) || !validNumber(body.min_quantity) ||
        typeof body.note !== "string" || body.note.length > 250) return json({ error: "Patikrinkite įvestus duomenis." }, 400);
    const existing = await db.prepare("SELECT * FROM items WHERE id = ?").bind(itemMatch[1]).first();
    if (!existing) return json({ error: "Medžiaga nerasta." }, 404);
    await db.prepare("UPDATE items SET name=?, category=?, unit=?, min_quantity=?, note=?, updated_at=? WHERE id=?")
      .bind(body.name.trim(), body.category, body.unit, body.min_quantity, body.note.trim(), now(), itemMatch[1]).run();
    return json({ ok: true });
  }
  const movementMatch = path.match(/^items\/([0-9a-f-]+)\/movement$/i);
  if (movementMatch && method === "POST") {
    const body = await readJson(request);
    if (!body || !["add","remove","set"].includes(body.type) || !validNumber(body.quantity) ||
        body.quantity <= 0 || typeof body.note !== "string" || body.note.length > 250) return json({ error: "Patikrinkite pakeitimo duomenis." }, 400);
    const item = await db.prepare("SELECT * FROM items WHERE id = ?").bind(movementMatch[1]).first();
    if (!item) return json({ error: "Medžiaga nerasta." }, 404);
    let after;
    let amount = body.quantity;
    if (body.type === "add") after = Number(item.quantity) + body.quantity;
    else if (body.type === "remove") after = Number(item.quantity) - body.quantity;
    else after = body.quantity;
    if (after < 0) return json({ error: "Likutis negali būti neigiamas." }, 400);
    if (body.type === "set") amount = Math.abs(after - Number(item.quantity));
    await db.prepare("UPDATE items SET quantity=?, updated_at=? WHERE id=?").bind(after, now(), item.id).run();
    await logMovement(db, item, body.type, amount, after, body.note.trim());
    return json({ ok: true, quantity: after });
  }
  if (path === "movements" && method === "GET") {
    const result = await db.prepare("SELECT * FROM movements ORDER BY created_at DESC LIMIT 100").all();
    return json({ movements: result.results || [] });
  }
  return json({ error: "Maršrutas nerastas." }, 404);
}
export async function onRequest(context) {
  try {
    return await handler(context.request, context.env);
  } catch (error) {
    console.error("API error:", error);
    return json({ error: "Serverio klaida. Patikrinkite Cloudflare žurnalus." }, 500);
  }
}
