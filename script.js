// ======= Utility =======
const utf8 = new TextEncoder();
const base64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromBase64 = (str) => Uint8Array.from(atob(str), c => c.charCodeAt(0));
const sha256 = async (str) => {
  const hash = await crypto.subtle.digest("SHA-256", utf8.encode(str));
  return base64(hash);
};

// ======= Storage Helpers =======
const userKey = (u) => `todo:user:${u}`;
const tasksKey = (u) => `todo:tasks:${u}`;
const SESSION_KEY = "todo:session:user";

function saveUser(u, obj) { localStorage.setItem(userKey(u), JSON.stringify(obj)); }
function loadUser(u) { const s = localStorage.getItem(userKey(u)); return s ? JSON.parse(s) : null; }
function saveTasks(u, tasks) { localStorage.setItem(tasksKey(u), JSON.stringify(tasks)); }
function loadTasks(u) { const s = localStorage.getItem(tasksKey(u)); return s ? JSON.parse(s) : []; }

// ======= Auth =======
async function register(username, password) {
  if (loadUser(username)) throw new Error("User exists");
  const salt = crypto.getRandomValues(new Uint8Array(8));
  const hash = await sha256(base64(salt) + password);
  saveUser(username, { username, salt: base64(salt), hash });
  saveTasks(username, []);
}

async function login(username, password) {
  const u = loadUser(username);
  if (!u) throw new Error("User not found");
  const check = await sha256(u.salt + password);
  if (check !== u.hash) throw new Error("Invalid password");
  localStorage.setItem(SESSION_KEY, username);
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  location.reload();
}

// ======= To-Do Logic =======
const tasksContainer = document.getElementById("tasksContainer");
const taskTitle = document.getElementById("taskTitle");
const taskNotes = document.getElementById("taskNotes");
const addBtn = document.getElementById("addBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userBadge = document.getElementById("userBadge");

let currentUser = localStorage.getItem(SESSION_KEY);
let tasks = [];

function renderTasks() {
  tasksContainer.innerHTML = "";
  if (tasks.length === 0) {
    tasksContainer.innerHTML = `<div class="empty">No tasks yet.</div>`;
    return;
  }
  tasks.forEach((t) => {
    const div = document.createElement("div");
    div.className = "task";
    div.innerHTML = `
      <div>
        <div class="title" style="${t.completed ? "text-decoration: line-through" : ""}">${t.title}</div>
        <div class="meta">${t.notes || ""}</div>
      </div>
      <div class="controls">
        <button onclick="toggleTask('${t.id}')">✅</button>
        <button onclick="deleteTask('${t.id}')">🗑️</button>
      </div>`;
    tasksContainer.appendChild(div);
  });
}

function toggleTask(id) {
  const t = tasks.find((x) => x.id === id);
  t.completed = !t.completed;
  saveTasks(currentUser, tasks);
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter((x) => x.id !== id);
  saveTasks(currentUser, tasks);
  renderTasks();
}

function addTask() {
  const title = taskTitle.value.trim();
  if (!title) return alert("Enter a task title");
  const newTask = {
    id: Date.now().toString(36),
    title,
    notes: taskNotes.value.trim(),
    completed: false,
  };
  tasks.push(newTask);
  saveTasks(currentUser, tasks);
  renderTasks();
  taskTitle.value = "";
  taskNotes.value = "";
}

// ======= Init =======
document.addEventListener("DOMContentLoaded", () => {
  if (!currentUser) {
    const username = prompt("Enter username:");
    const password = prompt("Enter password:");
    try {
      if (loadUser(username)) {
        login(username, password).then(() => location.reload());
      } else {
        register(username, password).then(() => location.reload());
      }
    } catch (err) {
      alert(err.message);
    }
  } else {
    document.getElementById("appArea").hidden = false;
    userBadge.textContent = currentUser;
    tasks = loadTasks(currentUser);
    renderTasks();
  }

  addBtn.addEventListener("click", addTask);
  logoutBtn.addEventListener("click", logout);
});
