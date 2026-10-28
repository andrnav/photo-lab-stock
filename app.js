const $ = (id) => document.getElementById(id);
let items = [];
let movements = [];
let toastTimer;

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin"
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) showLogin();
    throw new Error(data?.error || `Užklausa nepavyko (${response.status})`);
  }
  return data;
}
function showLogin() {
  $("login-screen").classList.remove("hidden");
  $("app").classList.add("hidden");
}
function showApp() {
  $("login-screen").classList.add("hidden");
  $("app").classList.remove("hidden");
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
    items = itemData.items;
    movements = movementData.movements;
    render();
    $("sync-status").innerHTML = "<i></i> Atnaujinta";
    $("sync-status").classList.remove("offline");
  } catch (error) {
    $("sync-status").textContent = "Ryšio klaida";
    $("sync-status").classList.add("offline");
    showToast(error.message, true);
  }
}
function render() {
  const search = $("search").value.trim().toLocaleLowerCase("lt");
  const category = $("category-filter").value;
  const filtered = items.filter(item => (!category || item.category === category) &&
    `${item.name} ${item.note || ""}`.toLocaleLowerCase("lt").includes(search));
  $("stat-items").textContent = items.length;
  $("stat-low").textContent = items.filter(i => Number(i.quantity) <= Number(i.min_quantity)).length;
  $("stat-total").textContent = num(items.reduce((sum, item) => sum + Number(item.quantity), 0));
  $("table-count").textContent = `${filtered.length} pozicijų`;
  $("inventory-body").innerHTML = filtered.length ? filtered.map(item => {
    const low = Number(item.quantity) <= Number(item.min_quantity);
    return `<tr>
      <td><span class="material-name">${escapeHtml(item.name)}</span>${item.note ? `<span class="material-note">${escapeHtml(item.note)}</span>` : ""}</td>
      <td><span class="category-tag">${escapeHtml(item.category)}</span></td>
      <td><span class="qty">${num(item.quantity)} <small>${escapeHtml(item.unit)}</small></span></td>
      <td>${num(item.min_quantity)} <small>${escapeHtml(item.unit)}</small></td>
      <td><span class="badge ${low ? "low" : "ok"}">${low ? "Mažas likutis" : "Pakanka"}</span></td>
      <td><div class="row-actions"><button class="mini-btn" data-move="${item.id}">± Likutis</button><button class="mini-btn" data-edit="${item.id}">Redaguoti</button></div></td>
    </tr>`;
  }).join("") : `<tr><td colspan="6" class="empty">Pozicijų nerasta. Pridėk pirmąją medžiagą.</td></tr>`;
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
  $("item-form").reset();
  $("item-error").textContent = "";
  $("item-id").value = item?.id || "";
  $("item-dialog-title").textContent = item ? "Redaguoti medžiagą" : "Pridėti medžiagą";
  $("item-name").value = item?.name || "";
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
  $("movement-form").reset();
  $("movement-error").textContent = "";
  $("movement-item-id").value = item.id;
  $("movement-title").textContent = item.name;
  $("movement-current").textContent = `Dabartinis likutis: ${num(item.quantity)} ${item.unit}`;
  $("movement-quantity").value = "";
  $("movement-dialog").showModal();
}
$("login-form").addEventListener("submit", async event => {
  event.preventDefault();
  $("login-error").textContent = "";
  try {
    await api("/api/login", { method: "POST", body: JSON.stringify({ password: $("password").value }) });
    $("password").value = "";
    showApp();
    await loadData();
  } catch (error) { $("login-error").textContent = error.message; }
});
$("logout-btn").addEventListener("click", async () => {
  try { await api("/api/logout", { method: "POST", body: "{}" }); } catch {}
  showLogin();
});
$("add-item-btn").addEventListener("click", () => openItemDialog());
$("refresh-btn").addEventListener("click", loadData);
$("search").addEventListener("input", render);
$("category-filter").addEventListener("change", render);
$("inventory-body").addEventListener("click", event => {
  const moveId = event.target.closest("[data-move]")?.dataset.move;
  const editId = event.target.closest("[data-edit]")?.dataset.edit;
  if (moveId) { const item = items.find(i => i.id === moveId); if (item) openMovementDialog(item); }
  if (editId) { const item = items.find(i => i.id === editId); if (item) openItemDialog(item); }
});
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => $(button.dataset.close).close()));
$("item-form").addEventListener("submit", async event => {
  event.preventDefault();
  $("item-error").textContent = "";
  const id = $("item-id").value;
  const body = {
    name: $("item-name").value.trim(), category: $("item-category").value, unit: $("item-unit").value,
    quantity: Number($("item-quantity").value), min_quantity: Number($("item-min").value), note: $("item-note").value.trim()
  };
  try {
    await api(id ? `/api/items/${id}` : "/api/items", { method: id ? "PUT" : "POST", body: JSON.stringify(body) });
    $("item-dialog").close();
    showToast(id ? "Medžiaga atnaujinta" : "Medžiaga pridėta");
    await loadData();
  } catch (error) { $("item-error").textContent = error.message; }
});
$("movement-form").addEventListener("submit", async event => {
  event.preventDefault();
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
async function boot() {
  try {
    await api("/api/session");
    showApp();
    await loadData();
    setInterval(() => { if (!$("app").classList.contains("hidden")) loadData(); }, 15000);
  } catch { showLogin(); }
}
boot();
