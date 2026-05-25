const INVENTORY_API = "http://localhost:5000/api/inventory";

let departmentLabels = {};

const conditionLabels = {
  good: "Good",
  outdated: "Outdated",
  for_repair: "For Repair",
  for_replacement: "For Replacement",
  missing: "Missing"
};

const actionLabels = {
  added: "Added",
  edited: "Edited",
  deleted: "Deleted"
};

const DASHBOARD_REFRESH_DEBOUNCE_MS = 250;
let dashboardRefreshTimeout = null;
let lastDashboardChangeKey = "";
let dashboardEventsChannel = null;
let currentDepartments = [];

if ("BroadcastChannel" in window) {
  dashboardEventsChannel = new BroadcastChannel("inventory-events");
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function formatReportDate(value) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getDepartmentPageUrl(department) {
  const params = new URLSearchParams({
    dept: department.slug,
    name: department.name
  });
  return `departments/department.html?${params.toString()}`;
}

function renderDepartments(departments = [], totals = {}) {
  const grid = document.getElementById("departmentGrid");
  if (!grid) return;

  currentDepartments = departments;
  departmentLabels = departments.reduce((labels, department) => {
    labels[department.slug] = department.name;
    return labels;
  }, { ...departmentLabels });

  if (!departments.length) {
    grid.innerHTML = '<div class="empty-state">No departments have been added yet.</div>';
    return;
  }

  grid.innerHTML = departments.map((department) => `
    <article class="department-card managed-department-card">
      <a class="department-card-link" href="${escapeHtml(getDepartmentPageUrl(department))}">
        <strong>${escapeHtml(department.name)}</strong>
        <span><b data-department-total="${escapeHtml(department.slug)}">${escapeHtml(totals[department.slug] || 0)}</b> items</span>
      </a>
      <button class="btn danger department-delete-btn" type="button" data-delete-department="${escapeHtml(department.slug)}">Delete</button>
    </article>
  `).join("");
}

function getStoredDashboardUserName() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.user_metadata?.full_name || user.email || "Dashboard user";
  } catch (err) {
    return "Dashboard user";
  }
}

async function loadDashboard() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${INVENTORY_API}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load dashboard");

    document.getElementById("total").textContent = data.total || 0;
    document.getElementById("departments").textContent = data.departments || 0;
    document.getElementById("good").textContent = data.good || 0;
    document.getElementById("outdated").textContent = data.outdated || 0;
    document.getElementById("repair").textContent = data.repair || 0;
    document.getElementById("replacement").textContent = data.replacement || 0;
    document.getElementById("missing").textContent = data.missing || 0;
    renderDepartments(data.departmentList || [], data.departmentTotals || {});
  } catch (err) {
    const notice = document.getElementById("dashboardNotice");
    if (notice) notice.textContent = err.message;
  }
}

function openDepartmentModal() {
  const modal = document.getElementById("departmentModal");
  const input = document.getElementById("departmentName");
  document.getElementById("departmentForm").reset();
  modal.classList.add("open");
  input.focus();
}

function closeDepartmentModal() {
  document.getElementById("departmentModal").classList.remove("open");
}

async function createDepartment(event) {
  event.preventDefault();

  const token = localStorage.getItem("token");
  const notice = document.getElementById("dashboardNotice");
  const submitButton = document.querySelector("#departmentForm button[type='submit']");
  const name = document.getElementById("departmentName").value.trim();
  if (!name) return;

  submitButton.disabled = true;
  submitButton.textContent = "Saving...";
  if (notice) notice.textContent = "";

  try {
    const res = await fetch(`${INVENTORY_API}/departments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not add department");

    closeDepartmentModal();
    await loadDashboard();
  } catch (err) {
    if (notice) notice.textContent = err.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Save Department";
  }
}

async function deleteDepartment(slug) {
  const department = currentDepartments.find((record) => record.slug === slug);
  const name = department?.name || slug;
  const confirmed = await showConfirmModal({
    title: `Delete ${name} department?`,
    message: "This only works when the department has no equipment records.",
    confirmText: "Delete"
  });
  if (!confirmed) return;

  const token = localStorage.getItem("token");
  const notice = document.getElementById("dashboardNotice");
  if (notice) notice.textContent = "";

  try {
    const res = await fetch(`${INVENTORY_API}/departments/${encodeURIComponent(slug)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not delete department");
    await loadDashboard();
    refreshOpenReport();
  } catch (err) {
    if (notice) notice.textContent = err.message;
  }
}

function scheduleDashboardRefresh(changeEvent = {}) {
  const changeKey = `${changeEvent.action || "changed"}:${changeEvent.itemId || ""}:${changeEvent.changedAt || ""}`;
  if (changeKey === lastDashboardChangeKey) return;
  lastDashboardChangeKey = changeKey;

  clearTimeout(dashboardRefreshTimeout);
  dashboardRefreshTimeout = setTimeout(() => {
    loadDashboard();
    refreshOpenReport();
  }, DASHBOARD_REFRESH_DEBOUNCE_MS);
}

function setupAutoDashboardRefresh() {
  window.addEventListener("storage", (event) => {
    if (event.key !== "inventory:lastChanged" || !event.newValue) return;

    try {
      scheduleDashboardRefresh(JSON.parse(event.newValue));
    } catch (err) {
      scheduleDashboardRefresh();
    }
  });

  dashboardEventsChannel?.addEventListener("message", (event) => {
    scheduleDashboardRefresh(event.data || {});
  });

  window.addEventListener("focus", () => {
    const latestChange = localStorage.getItem("inventory:lastChanged");
    if (!latestChange) return;

    try {
      scheduleDashboardRefresh(JSON.parse(latestChange));
    } catch (err) {
      scheduleDashboardRefresh();
    }
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) loadDashboard();
  });
}

function renderReportSummary(summary) {
  const summaryContainer = document.getElementById("reportSummary");
  const cards = [
    ["Total Equipment", summary.total || 0],
    ["Departments", summary.departments || 0],
    ["Good", summary.good || 0],
    ["Outdated", summary.outdated || 0],
    ["For Repair", summary.repair || 0],
    ["For Replacement", summary.replacement || 0],
    ["Missing", summary.missing || 0]
  ];

  summaryContainer.innerHTML = cards.map(([label, value]) => `
    <article>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join("");
}

function renderDepartmentRows(departmentSummary = []) {
  const rows = document.getElementById("departmentReportRows");
  rows.innerHTML = departmentSummary.map((record) => `
    <tr>
      <td>${escapeHtml(departmentLabels[record.department] || record.department)}</td>
      <td>${escapeHtml(record.items || 0)}</td>
      <td>${escapeHtml(record.total || 0)}</td>
      <td>${escapeHtml(record.good || 0)}</td>
      <td>${escapeHtml(record.outdated || 0)}</td>
      <td>${escapeHtml(record.repair || 0)}</td>
      <td>${escapeHtml(record.replacement || 0)}</td>
      <td>${escapeHtml(record.missing || 0)}</td>
    </tr>
  `).join("");
}

function renderItemRows(items = []) {
  const rows = document.getElementById("itemReportRows");
  if (!items.length) {
    rows.innerHTML = '<tr><td colspan="7">No inventory items have been added yet.</td></tr>';
    return;
  }

  rows.innerHTML = items.map((item) => `
    <tr>
      <td>${escapeHtml(departmentLabels[item.department] || item.department)}</td>
      <td>${escapeHtml(item.name || "Unnamed equipment")}</td>
      <td>${escapeHtml(item.quantity || 1)}</td>
      <td>${escapeHtml(item.acquisition_date || "Not recorded")}</td>
      <td>${escapeHtml(conditionLabels[item.condition] || item.condition || "Not set")}</td>
      <td>${escapeHtml(item.comments || "No comments")}</td>
      <td>${escapeHtml(item.created_at ? formatReportDate(item.created_at) : "Not available")}</td>
    </tr>
  `).join("");
}

function renderActivityRows(activity = []) {
  const rows = document.getElementById("activityReportRows");
  if (!rows) return;

  if (!activity.length) {
    rows.innerHTML = '<tr><td colspan="7">No recent activity has been recorded yet.</td></tr>';
    return;
  }

  rows.innerHTML = activity.map((item) => {
    const action = item.action || "added";

    return `
      <tr>
        <td>${escapeHtml(actionLabels[action] || action)}</td>
        <td>${escapeHtml(departmentLabels[item.department] || item.department)}</td>
        <td>${escapeHtml(item.name || "Unnamed equipment")}${action === "deleted" ? " (deleted)" : ""}</td>
        <td>${escapeHtml(item.quantity || 1)}</td>
        <td>${escapeHtml(conditionLabels[item.condition] || item.condition || "Not set")}</td>
        <td>${escapeHtml(item.comments || "No comments")}</td>
        <td>${escapeHtml(formatReportDate(item.created_at))}</td>
      </tr>
    `;
  }).join("");
}

function renderReport(data, { scroll = false } = {}) {
  const reportPanel = document.getElementById("reportPanel");
  const generatedAt = formatReportDate(data.generatedAt);

  document.getElementById("reportGeneratedAt").textContent = `Generated ${generatedAt}`;
  document.getElementById("printGeneratedAt").textContent = generatedAt;
  document.getElementById("printPreparedBy").textContent = getStoredDashboardUserName();
  renderReportSummary(data.summary || {});
  renderDepartmentRows(data.departmentSummary || []);
  renderItemRows(data.items || []);
  renderActivityRows(data.activity || []);
  reportPanel.hidden = false;

  if (scroll) {
    reportPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function fetchReportData() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const res = await fetch(`${INVENTORY_API}/report`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not generate report");
  return data;
}

async function refreshOpenReport() {
  const reportPanel = document.getElementById("reportPanel");
  const notice = document.getElementById("dashboardNotice");
  if (!reportPanel || reportPanel.hidden) return;

  try {
    const data = await fetchReportData();
    if (data) renderReport(data);
  } catch (err) {
    if (notice) notice.textContent = err.message;
  }
}

async function generateReport() {
  const reportButton = document.getElementById("generateReportBtn");
  const notice = document.getElementById("dashboardNotice");

  reportButton.disabled = true;
  reportButton.textContent = "Generating...";
  if (notice) notice.textContent = "";

  try {
    const data = await fetchReportData();
    if (data) renderReport(data, { scroll: true });
  } catch (err) {
    if (notice) notice.textContent = err.message;
  } finally {
    reportButton.disabled = false;
    reportButton.textContent = "Generate Report";
  }
}

document.getElementById("generateReportBtn")?.addEventListener("click", generateReport);
document.getElementById("printReportBtn")?.addEventListener("click", () => window.print());
document.getElementById("addDepartmentBtn")?.addEventListener("click", openDepartmentModal);
document.getElementById("cancelDepartmentBtn")?.addEventListener("click", closeDepartmentModal);
document.getElementById("departmentForm")?.addEventListener("submit", createDepartment);
document.getElementById("departmentModal")?.addEventListener("click", (event) => {
  if (event.target.id === "departmentModal") closeDepartmentModal();
});
document.getElementById("departmentGrid")?.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-department]");
  if (!deleteButton) return;
  deleteDepartment(deleteButton.dataset.deleteDepartment);
});

setupAutoDashboardRefresh();
loadDashboard();
