const $ = (id) => document.getElementById(id);
let items = [];
let movements = [];
let currentUser = null;
let toastTimer;
let pendingConsumeId = null;
let qrItem = null;

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin"
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && currentUser?.role === "admin") showApp(null);
    throw new Error(data?.error || `Užklausa nepavyko (${response.status})`);
  }
  return data;
}
function showApp(user = null) {
  currentUser = user || { username: "lankytojas", role: "public" };
  const isAdmin = currentUser.role === "admin";
  $("app").classList.remove("hidden");
  $("user-label").textContent = isAdmin ? "Administratorius" : "Vieša peržiūra";
  $("admin-login-toggle").classList.toggle("hidden", isAdmin);
  $("logout-btn").classList.toggle("hidden", !isAdmin);
  $("login-form").classList.add("hidden");
  document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("hidden", !isAdmin));
  render();
}
function showToast(message, bad = false) {
  const el = $("toast");
  el.textContent = message;
  el.classList.toggle("bad", bad);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}
function num(value) {
  return new Intl.NumberFormat("lt-LT", { maximumFractionDigits: 2 }).format(Number(value) || 0);
}
function dateTime(value) {
  return new Intl.DateTimeFormat("lt-LT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
async function loadData() {
  $("sync-status").classList.remove("offline");
  $("sync-status").innerHTML = "<i></i> Sinchronizuojama";
  try {
    const [itemData, movementData] = await Promise.all([api("/api/items"), api("/api/movements")]);
    items = itemData.items || [];
    movements = movementData.movements || [];
    const timestamps = [
      ...items.map(item => item.updated_at || item.created_at),
      ...movements.map(movement => movement.created_at)
    ].filter(Boolean).map(value => new Date(value).getTime()).filter(Number.isFinite);
    const latest = timestamps.length ? new Date(Math.max(...timestamps)) : null;
    $("last-updated").textContent = latest
      ? `Paskutinį kartą atnaujinta: ${new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium", timeStyle: "short" }).format(latest)}`
      : "Paskutinį kartą atnaujinta: duomenų dar nėra";
    render();
    $("sync-status").innerHTML = "<i></i> Atnaujinta";
    $("sync-status").classList.remove("offline");
  } catch (error) {
    $("sync-status").textContent = "Ryšio klaida";
    $("sync-status").classList.add("offline");
    showToast(error.message, true);
  }
}
function isLow(item) { return Number(item.quantity) <= Number(item.min_quantity); }
function rowHtml(item) {
  const low = isLow(item);
  const actions = currentUser?.role === "admin"
    ? `<div class="row-actions"><button class="mini-btn" data-move="${escapeHtml(item.id)}">± Likutis</button><button class="mini-btn" data-edit="${escapeHtml(item.id)}">Redaguoti</button><button class="mini-btn" data-qr="${escapeHtml(item.id)}">QR kodas</button></div>`
    : `<span class="muted">Tik peržiūra</span>`;
  const color = ["green","pink","blue","yellow","purple"].includes(item.color) ? `<span class="color-dot ${escapeHtml(item.color)}" title="${escapeHtml(colorName(item.color))}"></span>` : "";
  return `<tr>
    <td>${item.product_code ? `<span class="product-code">${escapeHtml(item.product_code)}</span>` : `<span class="muted">—</span>`}</td>
    <td><span class="badge ${low ? "low" : "ok"}">${low ? "Užsakyti" : "Pakanka"}</span></td>
    <td>${num(item.min_quantity)} <small>${escapeHtml(item.unit)}</small></td>
    <td><span class="qty">${num(item.quantity)} <small>${escapeHtml(item.unit)}</small></span></td>
    <td><span class="name-with-color">${color}<span class="material-name">${escapeHtml(item.name)}</span></span>${item.note ? `<span class="material-note">${escapeHtml(item.note)}</span>` : ""}</td>
    <td><span class="category-tag">${escapeHtml(item.category)}</span></td>
    <td>${actions}</td>
  </tr>`;
}
function colorName(color) {
  return ({green:"Žalia – Glossy",pink:"Rausva – Silk",blue:"Mėlyna – Lustre",yellow:"Geltona",purple:"Violetinė"})[color] || "Be spalvos";
}
function render() {
  if (!currentUser) return;
  const search = $("search").value.trim().toLocaleLowerCase("lt");
  const category = $("category-filter").value;
  const filtered = items.filter(item => (!category || item.category === category) &&
    `${item.product_code || ""} ${item.name} ${item.category} ${item.note || ""}`.toLocaleLowerCase("lt").includes(search));
  const lowItems = filtered.filter(isLow).sort((a,b) => a.name.localeCompare(b.name, "lt", { sensitivity: "base" }));
  const allSorted = [...filtered].sort((a,b) => a.name.localeCompare(b.name, "lt", { sensitivity: "base" }) || String(a.product_code || "").localeCompare(String(b.product_code || ""), "lt"));
  $("stat-items").textContent = items.length;
  $("stat-low").textContent = items.filter(isLow).length;
  $("stat-total").textContent = num(items.reduce((sum, item) => sum + Number(item.quantity), 0));
  $("table-count").textContent = `${filtered.length} pozicijų`;
  $("order-count").textContent = `${lowItems.length} pozicijų`;
  $("order-body").innerHTML = lowItems.length ? lowItems.map(rowHtml).join("") : `<tr><td colspan="7" class="empty">Šiuo metu užsakomų medžiagų nėra.</td></tr>`;
  $("inventory-body").innerHTML = allSorted.length ? allSorted.map(rowHtml).join("") : `<tr><td colspan="7" class="empty">Medžiagų sąrašas tuščias arba pagal filtrą nieko nerasta.</td></tr>`;
  $("history-body").innerHTML = movements.length ? movements.slice(0, 20).map(m => {
    const cls = m.change_type === "add" ? "change-positive" : m.change_type === "remove" ? "change-negative" : "change-set";
    const label = m.change_type === "add" ? "Papildymas" : m.change_type === "remove" ? "Nurašymas" : m.change_type === "set" ? "Likučio nustatymas" : "Sukurta";
    const amount = m.change_type === "set" ? `→ ${num(m.quantity_after)}` : `${m.change_type === "add" ? "+" : m.change_type === "remove" ? "−" : ""}${num(m.change_amount)} ${escapeHtml(m.unit || "")}`;
    return `<tr><td>${dateTime(m.created_at)}</td><td><span class="material-name">${escapeHtml(m.item_name)}</span>${m.note ? `<span class="material-note">${escapeHtml(m.note)}</span>` : ""}</td><td class="${cls}">${label}</td><td class="${cls}">${amount}</td><td>${num(m.quantity_after)} ${escapeHtml(m.unit || "")}</td></tr>`;
  }).join("") : `<tr><td colspan="5" class="empty">Pakeitimų dar nėra.</td></tr>`;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function openItemDialog(item = null) {
  if (currentUser?.role !== "admin") return;
  $("item-form").reset();
  $("item-error").textContent = "";
  $("item-id").value = item?.id || "";
  $("item-dialog-title").textContent = item ? "Redaguoti medžiagą" : "Pridėti medžiagą";
  $("item-code").value = item?.product_code || "";
  $("item-name").value = item?.name || "";
  $("item-color").value = item?.color || "none";
  $("item-category").value = item?.category || "Fotopopierius";
  $("item-unit").value = item?.unit || "m";
  $("item-quantity").value = item?.quantity ?? 0;
  $("item-min").value = item?.min_quantity ?? 0;
  $("item-note").value = item?.note || "";
  $("item-quantity").disabled = Boolean(item);
  $("item-quantity").title = item ? "Esamą kiekį keiskite per mygtuką „± Likutis“, kad pakeitimas būtų įrašytas istorijoje." : "";
  $("item-dialog").showModal();
}
function openMovementDialog(item) {
  if (currentUser?.role !== "admin") return;
  $("movement-form").reset();
  $("movement-error").textContent = "";
  $("movement-item-id").value = item.id;
  $("movement-title").textContent = item.name;
  $("movement-current").textContent = `Dabartinis likutis: ${num(item.quantity)} ${item.unit}`;
  $("movement-quantity").value = "";
  $("movement-dialog").showModal();
}
$("admin-login-toggle").addEventListener("click", () => {
  $("login-form").classList.toggle("hidden");
  $("login-error").textContent = "";
  if (!$("login-form").classList.contains("hidden")) $("password").focus();
});
$("login-form").addEventListener("submit", async event => {
  event.preventDefault();
  $("login-error").textContent = "";
  try {
    const username = $("username").value.trim().toLowerCase();
    if (username !== "admin") throw new Error("Čia reikalingas administratoriaus prisijungimas.");
    const data = await api("/api/login", { method: "POST", body: JSON.stringify({ username, password: $("password").value }) });
    $("password").value = "";
    showApp(data.user);
    await loadData();
    if (pendingConsumeId) { const id = pendingConsumeId; pendingConsumeId = null; await consumeFromQr(id); }
  } catch (error) { $("login-error").textContent = error.message; }
});
$("logout-btn").addEventListener("click", async () => {
  try { await api("/api/logout", { method: "POST", body: "{}" }); } catch {}
  showApp(null);
});
$("add-item-btn").addEventListener("click", () => openItemDialog());
$("refresh-btn").addEventListener("click", loadData);
$("search").addEventListener("input", render);
$("category-filter").addEventListener("change", render);
document.addEventListener("click", event => {
  const moveId = event.target.closest("[data-move]")?.dataset.move;
  const editId = event.target.closest("[data-edit]")?.dataset.edit;
  const qrId = event.target.closest("[data-qr]")?.dataset.qr;
  if (moveId) { const item = items.find(i => i.id === moveId); if (item) openMovementDialog(item); }
  if (editId) { const item = items.find(i => i.id === editId); if (item) openItemDialog(item); }
  if (qrId) { const item = items.find(i => i.id === qrId); if (item) openQrDialog(item); }
});
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => $(button.dataset.close).close()));
$("item-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (currentUser?.role !== "admin") return;
  $("item-error").textContent = "";
  const id = $("item-id").value;
  const body = { product_code: $("item-code").value.trim(), color: $("item-color").value, name: $("item-name").value.trim(), category: $("item-category").value, unit: $("item-unit").value, quantity: Number($("item-quantity").value), min_quantity: Number($("item-min").value), note: $("item-note").value.trim() };
  try {
    await api(id ? `/api/items/${id}` : "/api/items", { method: id ? "PUT" : "POST", body: JSON.stringify(body) });
    $("item-dialog").close();
    showToast(id ? "Medžiaga atnaujinta" : "Medžiaga pridėta");
    await loadData();
  } catch (error) { $("item-error").textContent = error.message; }
});
$("movement-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (currentUser?.role !== "admin") return;
  $("movement-error").textContent = "";
  const id = $("movement-item-id").value;
  const body = { type: $("movement-type").value, quantity: Number($("movement-quantity").value), note: $("movement-note").value.trim() };
  try {
    await api(`/api/items/${id}/movement`, { method: "POST", body: JSON.stringify(body) });
    $("movement-dialog").close();
    showToast("Likutis atnaujintas");
    await loadData();
  } catch (error) { $("movement-error").textContent = error.message; }
});
function openQrDialog(item) {
  if (currentUser?.role !== "admin") return;
  qrItem = item;
  $("qr-title").textContent = item.name;
  $("qr-code-label").textContent = `${item.product_code ? item.product_code + " · " : ""}${item.name} · nuskenavus nurašomas 1 ${item.unit}`;
  $("qr-code").innerHTML = "";
  if (typeof QRCode === "undefined") {
    $("qr-code").textContent = "QR generatorius neįsikėlė. Patikrinkite interneto ryšį.";
  } else {
    const target = new URL(window.location.pathname, window.location.origin);
    target.searchParams.set("consume", item.id);
    new QRCode($("qr-code"), { text: target.toString(), width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
  }
  $("qr-dialog").showModal();
}
async function consumeFromQr(id) {
  if (currentUser?.role !== "admin") {
    pendingConsumeId = id;
    $("login-form").classList.remove("hidden");
    $("login-error").textContent = "Prisijunkite kaip administratorius, kad nuskenavus QR būtų nurašytas 1 vienetas.";
    $("password").focus();
    return;
  }
  try {
    const result = await api(`/api/items/${encodeURIComponent(id)}/scan`, { method: "POST", body: JSON.stringify({}) });
    showToast(`Nurašyta 1 ${result.unit} · ${result.item}. Likutis: ${num(result.quantity)} ${result.unit}.`);
    await loadData();
  } catch (error) { showToast(error.message, true); }
}
$("qr-print").addEventListener("click", () => {
  if (!qrItem) return;
  const canvas = $("qr-code").querySelector("canvas");
  const img = $("qr-code").querySelector("img");
  const src = canvas ? canvas.toDataURL("image/png") : img?.src;
  if (!src) { showToast("QR kodas dar nesugeneruotas.", true); return; }
  const printWindow = window.open("", "_blank", "width=500,height=600");
  if (!printWindow) { showToast("Leiskite atidaryti spausdinimo langą.", true); return; }
  printWindow.document.write(`<!doctype html><html lang="lt"><head><meta charset="utf-8"><title>QR – ${escapeHtml(qrItem.name)}</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:28px}img{width:220px;height:220px}.code{font-size:14px;color:#444}</style></head><body><h2>${escapeHtml(qrItem.name)}</h2><p class="code">${escapeHtml(qrItem.product_code || "")}</p><img src="${src}" alt="QR kodas"><p>Nuskenavus nurašomas 1 ${escapeHtml(qrItem.unit)}</p><script>window.onload=()=>window.print()<\/script></body></html>`);
  printWindow.document.close();
});
async function boot() {
  const params = new URLSearchParams(window.location.search);
  pendingConsumeId = params.get("consume");
  if (pendingConsumeId) {
    params.delete("consume");
    const cleanUrl = window.location.pathname + (params.toString() ? `?${params}` : "") + window.location.hash;
    history.replaceState({}, "", cleanUrl);
  }
  showApp(null);
  try {
    const session = await api("/api/session");
    showApp(session.user);
  } catch { /* Lankytojams nereikia prisijungti, kad matytų likučius. */ }
  await loadData();
  if (pendingConsumeId) {
    const id = pendingConsumeId;
    if (currentUser?.role === "admin") { pendingConsumeId = null; await consumeFromQr(id); }
    else {
      $("login-form").classList.remove("hidden");
      $("login-error").textContent = "QR kodas nuskenuotas. Prisijunkite kaip administratorius, kad būtų nurašytas 1 vienetas.";
    }
  }
  setInterval(() => loadData(), 15000);
}
boot();
