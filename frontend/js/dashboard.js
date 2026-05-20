const INVENTORY_API = "http://localhost:5000/api/inventory";

const departmentLabels = {
  "computing": "Computing",
  "nursing": "Nursing",
  "accounting": "Accounting",
  "public-health": "Public Health",
  "mass-communication": "Mass Communication",
  "bio-chemistry": "Bio Chemistry",
  "biological-science": "Biological Science"
};

const conditionLabels = {
  good: "Good",
  outdated: "Outdated",
  for_repair: "For Repair",
  for_replacement: "For Replacement",
  missing: "Missing"
};

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
  } catch (err) {
    const notice = document.getElementById("dashboardNotice");
    if (notice) notice.textContent = err.message;
  }
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

async function generateReport() {
  const token = localStorage.getItem("token");
  const reportPanel = document.getElementById("reportPanel");
  const reportButton = document.getElementById("generateReportBtn");
  const notice = document.getElementById("dashboardNotice");

  if (!token) return;

  reportButton.disabled = true;
  reportButton.textContent = "Generating...";
  if (notice) notice.textContent = "";

  try {
    const res = await fetch(`${INVENTORY_API}/report`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not generate report");

    const generatedAt = formatReportDate(data.generatedAt);
    document.getElementById("reportGeneratedAt").textContent = `Generated ${generatedAt}`;
    document.getElementById("printGeneratedAt").textContent = generatedAt;
    document.getElementById("printPreparedBy").textContent = getStoredDashboardUserName();
    renderReportSummary(data.summary || {});
    renderDepartmentRows(data.departmentSummary || []);
    renderItemRows(data.items || []);
    reportPanel.hidden = false;
    reportPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    if (notice) notice.textContent = err.message;
  } finally {
    reportButton.disabled = false;
    reportButton.textContent = "Generate Report";
  }
}

document.getElementById("generateReportBtn")?.addEventListener("click", generateReport);
document.getElementById("printReportBtn")?.addEventListener("click", () => window.print());

loadDashboard();
