/* =========================================================
   AGENCY — Admin panel logic
   ========================================================= */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let me = null;        // current auth user
let profile = null;   // current profile row
let members = [];     // all profiles
let tasks = [];       // all tasks
let mode = "signin";  // signin | signup
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

/* =========================================================
   AUTH
   ========================================================= */
$("#altBtn").addEventListener("click", () => {
  mode = mode === "signin" ? "signup" : "signin";
  const isUp = mode === "signup";
  $("#authTitle").textContent = isUp ? "Create admin account" : "Admin sign in";
  $("#authSub").textContent = isUp
    ? "First account becomes the admin."
    : "Sign in to manage your team and tasks.";
  $("#nameField").hidden = !isUp;
  $("#aName").required = isUp;
  $("#authBtn").textContent = isUp ? "Create account" : "Sign in";
  $("#altText").textContent = isUp ? "Already have an account?" : "First time? Create the admin account.";
  $("#altBtn").textContent = isUp ? "Sign in" : "Sign up";
  $("#authMsg").hidden = true;
});

$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#authBtn");
  btn.disabled = true;
  const email = $("#aEmail").value.trim();
  const pass = $("#aPass").value;

  try {
    if (mode === "signup") {
      const { data, error } = await db.auth.signUp({
        email,
        password: pass,
        options: { data: { full_name: $("#aName").value.trim() } },
      });
      if (error) throw error;
      if (data.user && !data.session)
        throw new Error("Check your email to confirm, then sign in.");
      say($("#authMsg"), "Account created!", true);
    } else {
      const { error } = await db.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      say($("#authMsg"), "Signed in…", true);
    }
    await boot();
  } catch (err) {
    say($("#authMsg"), err.message || "Something went wrong.", false);
  } finally {
    btn.disabled = false;
  }
});

$("#logoutBtn").addEventListener("click", async () => {
  await db.auth.signOut();
  location.reload();
});

/* =========================================================
   BOOT — check session + admin role
   ========================================================= */
async function boot() {
  const { data } = await db.auth.getUser();
  me = data.user;
  if (!me) return; // stay on auth screen

  const { data: p, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", me.id)
    .single();

  if (error || !p) {
    alert("Profile not found. Make sure schema.sql was run in Supabase.");
    await db.auth.signOut();
    return;
  }
  if (p.role !== "admin") {
    alert("This account is not an admin. Use the admin account.");
    await db.auth.signOut();
    return;
  }

  profile = p;
  $("#authScreen").hidden = true;
  $("#appScreen").hidden = false;
  $("#adminName").textContent = p.full_name || "Admin";
  $("#adminAv").textContent = initials(p.full_name || "Admin");

  await Promise.all([loadMembers(), loadTasks()]);
}

/* =========================================================
   MEMBERS
   ========================================================= */
async function loadMembers() {
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return alert(error.message);
  members = data || [];
  renderMembers();
  fillAssignSelect();
  renderStats();
}

function fillAssignSelect() {
  const sel = $("#tAssign");
  const keep = sel.value;
  sel.innerHTML = '<option value="">— select a member —</option>';
  members
    .filter((m) => m.role !== "admin")
    .forEach((m) => {
      const o = document.createElement("option");
      o.value = m.id;
      o.textContent = `${m.full_name || m.email} (${m.email})`;
      sel.appendChild(o);
    });
  sel.value = keep;
}

function renderMembers() {
  const box = $("#memberList");
  const others = members.filter((m) => m.role !== "admin");

  if (!others.length) {
    box.innerHTML =
      '<div class="empty"><b>No team members yet</b>Add your first member with the form.</div>';
    return;
  }

  box.innerHTML = others
    .map(
      (m) => `
    <div class="item" data-id="${m.id}">
      <div class="item-av">${esc(initials(m.full_name || m.email))}</div>
      <div class="item-body">
        <b>${esc(m.full_name || "No name")}</b>
        <small>${esc(m.email)}</small>
      </div>
      <span class="pill role">${esc(m.role || "member")}</span>
      <div class="item-actions">
        <button class="btn btn-danger btn-sm" data-del="${m.id}">Remove</button>
      </div>
    </div>`
    )
    .join("");

  box.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => removeMember(b.dataset.del))
  );
}

async function removeMember(id) {
  const m = members.find((x) => x.id === id);
  if (!confirm(`Remove ${m?.full_name || m?.email} from the team?\n\nThey will lose panel access and their tasks will be unassigned.`)) return;

  const { error } = await db.from("profiles").delete().eq("id", id);
  if (error) return alert(error.message);

  await Promise.all([loadMembers(), loadTasks()]);
}

$("#memberForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  const msg = $("#memberMsg");
  btn.disabled = true;

  const name = $("#mName").value.trim();
  const email = $("#mEmail").value.trim();
  const pass = $("#mPass").value;
  const role = $("#mRole").value;

  try {
    // Save the admin session first — signUp() signs the new user in
    const { data: sess } = await db.auth.getSession();
    const adminSession = sess?.session;

    const { data: created, error } = await db.auth.signUp({
      email,
      password: pass,
      options: { data: { full_name: name } },
    });
    if (error) throw error;

    const uid = created.user?.id;
    if (uid) {
      const { error: upErr } = await db
        .from("profiles")
        .upsert({ id: uid, full_name: name, email, role, created_at: new Date().toISOString() });
      if (upErr) throw upErr;
    }

    // Sign the admin straight back in
    if (adminSession) {
      const { error: sErr } = await db.auth.setSession(adminSession);
      if (sErr) console.warn("session restore:", sErr.message);
    }

    say(
      msg,
      created.session
        ? `${name} added to the team ✅`
        : `${name} added — they must confirm their email first ✅`,
      true
    );
    e.target.reset();
    await loadMembers();
  } catch (err) {
    say(msg, err.message || "Could not add member.", false);
  } finally {
    btn.disabled = false;
  }
});

/* =========================================================
   TASKS
   ========================================================= */
async function loadTasks() {
  const { data, error } = await db
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return alert(error.message);
  tasks = data || [];
  renderUnassigned();
  renderAll();
  renderStats();
}

function renderStats() {
  $("#stMembers").textContent = members.filter((m) => m.role !== "admin").length;
  $("#stTodo").textContent = tasks.filter((t) => t.status === "todo").length;
  $("#stDoing").textContent = tasks.filter((t) => t.status === "doing").length;
  $("#stDone").textContent = tasks.filter((t) => t.status === "done").length;
}

const STATUS_LABEL = { todo: "To do", doing: "In progress", done: "Completed" };
const memberName = (id) => {
  const m = members.find((x) => x.id === id);
  return m ? m.full_name || m.email : "Unassigned";
};

function taskRow(t, { showWho = true } = {}) {
  return `
    <div class="item ${t.status === "done" ? "done-item" : ""}" data-task="${t.id}">
      <div class="item-body">
        <b>${esc(t.title)}</b>
        <small>
          ${showWho ? esc(memberName(t.assigned_to)) + " · " : ""}
          <span class="pill ${t.status}">${STATUS_LABEL[t.status]}</span>
          ${t.due_date ? ` · due ${esc(t.due_date)}` : ""}
        </small>
        ${t.description ? `<small>${esc(t.description)}</small>` : ""}
      </div>
      <div class="item-actions">
        <select data-status="${t.id}">
          <option value="todo"   ${t.status === "todo" ? "selected" : ""}>To do</option>
          <option value="doing"  ${t.status === "doing" ? "selected" : ""}>In progress</option>
          <option value="done"   ${t.status === "done" ? "selected" : ""}>Completed</option>
        </select>
        <button class="btn btn-danger btn-sm" data-deltask="${t.id}">Delete</button>
      </div>
    </div>`;
}

function renderUnassigned() {
  const box = $("#unassignedList");
  const list = tasks.filter((t) => !t.assigned_to);
  box.innerHTML = list.length
    ? list.map((t) => taskRow(t, { showWho: false })).join("")
    : '<div class="empty"><b>Nothing unassigned</b>Every task has an owner.</div>';
  wireTaskControls(box);
}

function renderAll() {
  const box = $("#allList");
  const list = tasks.filter((t) => currentFilter === "all" || t.status === currentFilter);
  box.innerHTML = list.length
    ? list.map((t) => taskRow(t)).join("")
    : '<div class="empty"><b>No tasks here</b>Assign work from the previous tab.</div>';
  wireTaskControls(box);
}

function wireTaskControls(scope) {
  scope.querySelectorAll("[data-status]").forEach((s) =>
    s.addEventListener("change", () => updateStatus(s.dataset.status, s.value))
  );
  scope.querySelectorAll("[data-deltask]").forEach((b) =>
    b.addEventListener("click", () => deleteTask(b.dataset.deltask))
  );
}

async function updateStatus(id, status) {
  const { error } = await db.from("tasks").update({ status }).eq("id", id);
  if (error) return alert(error.message);
  await loadTasks();
}

async function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  const { error } = await db.from("tasks").delete().eq("id", id);
  if (error) return alert(error.message);
  await loadTasks();
}

$("#taskForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  const msg = $("#taskMsg");
  btn.disabled = true;

  try {
    const row = {
      title: $("#tTitle").value.trim(),
      description: $("#tDesc").value.trim() || null,
      assigned_to: $("#tAssign").value || null,
      status: $("#tStatus").value,
      due_date: $("#tDue").value || null,
    };

    const { error } = await db.from("tasks").insert(row);
    if (error) throw error;

    say(msg, "Task assigned ✅", true);
    e.target.reset();
    await loadTasks();
  } catch (err) {
    say(msg, err.message || "Could not assign task.", false);
  } finally {
    btn.disabled = false;
  }
});

/* =========================================================
   TABS & FILTERS
   ========================================================= */
$$(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    $$(".tab").forEach((x) => x.classList.remove("active"));
    $$(".panel").forEach((p) => p.classList.remove("active"));
    t.classList.add("active");
    $("#tab-" + t.dataset.tab).classList.add("active");
  })
);

$$(".filter").forEach((f) =>
  f.addEventListener("click", () => {
    $$(".filter").forEach((x) => x.classList.remove("active"));
    f.classList.add("active");
    currentFilter = f.dataset.filter;
    renderAll();
  })
);

/* =========================================================
   START
   ========================================================= */
boot();
