/* =========================================================
   AGENCY — Team member panel logic
   ========================================================= */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let me = null;
let profile = null;
let tasks = [];
let currentFilter = "all";

const initials = (n) =>
  (n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function say(el, text, ok = true) {
  el.hidden = false;
  el.className = "msg " + (ok ? "ok" : "err");
  el.textContent = text;
}

/* ---------- sign in ---------- */
$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#authBtn");
  btn.disabled = true;
  try {
    const { error } = await db.auth.signInWithPassword({
      email: $("#tEmail").value.trim(),
      password: $("#tPass").value,
    });
    if (error) throw error;
    say($("#authMsg"), "Signed in…", true);
    await boot();
  } catch (err) {
    say($("#authMsg"), err.message || "Could not sign in.", false);
  } finally {
    btn.disabled = false;
  }
});

$("#logoutBtn").addEventListener("click", async () => {
  await db.auth.signOut();
  location.reload();
});

/* ---------- boot ---------- */
async function boot() {
  const { data } = await db.auth.getUser();
  me = data.user;
  if (!me) return;

  const { data: p, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", me.id)
    .single();

  if (error || !p) {
    alert("Profile not found. Ask your admin to add you, or run schema.sql in Supabase.");
    await db.auth.signOut();
    return;
  }

  profile = p;
  $("#authScreen").hidden = true;
  $("#appScreen").hidden = false;
  $("#userName").textContent = p.full_name || p.email;
  $("#userRole").textContent = p.role === "admin" ? "Administrator" : p.role || "Team member";
  $("#userAv").textContent = initials(p.full_name || p.email);
  $("#welcomeLine").textContent = `Welcome back, ${(p.full_name || "there").split(" ")[0]} — here is your work.`;

  await loadTasks();
}

/* ---------- load only MY tasks ---------- */
async function loadTasks() {
  const { data, error } = await db
    .from("tasks")
    .select("*")
    .eq("assigned_to", me.id)
    .order("created_at", { ascending: false });

  if (error) return alert(error.message);
  tasks = data || [];
  render();
}

/* ---------- render ---------- */
const STATUS_LABEL = { todo: "To do", doing: "In progress", done: "Completed" };

function render() {
  $("#stTodo").textContent = tasks.filter((t) => t.status === "todo").length;
  $("#stDoing").textContent = tasks.filter((t) => t.status === "doing").length;
  $("#stDone").textContent = tasks.filter((t) => t.status === "done").length;
  $("#stAll").textContent = tasks.length;

  const list = tasks.filter((t) => currentFilter === "all" || t.status === currentFilter);
  const box = $("#taskList");

  if (!list.length) {
    box.innerHTML = `<div class="empty"><b>Nothing ${currentFilter === "all" ? "" : "in this list"}</b>New tasks from your admin will appear here.</div>`;
    return;
  }

  box.innerHTML = list
    .map(
      (t) => `
    <div class="item ${t.status === "done" ? "done-item" : ""}">
      <div class="item-body">
        <b>${esc(t.title)}</b>
        <small>
          <span class="pill ${t.status}">${STATUS_LABEL[t.status]}</span>
          ${t.due_date ? ` · due ${esc(t.due_date)}` : ""}
        </small>
        ${t.description ? `<small>${esc(t.description)}</small>` : ""}
      </div>
      <div class="item-actions">
        <select data-status="${t.id}">
          <option value="todo"  ${t.status === "todo" ? "selected" : ""}>To do</option>
          <option value="doing" ${t.status === "doing" ? "selected" : ""}>In progress</option>
          <option value="done"  ${t.status === "done" ? "selected" : ""}>Completed</option>
        </select>
      </div>
    </div>`
    )
    .join("");

  box.querySelectorAll("[data-status]").forEach((s) =>
    s.addEventListener("change", () => updateStatus(s.dataset.status, s.value))
  );
}

async function updateStatus(id, status) {
  const { error } = await db.from("tasks").update({ status }).eq("id", id);
  if (error) return alert(error.message);
  await loadTasks();
}

/* ---------- filters ---------- */
$$(".filter").forEach((f) =>
  f.addEventListener("click", () => {
    $$(".filter").forEach((x) => x.classList.remove("active"));
    f.classList.add("active");
    currentFilter = f.dataset.filter;
    render();
  })
);

/* ---------- start ---------- */
boot();
