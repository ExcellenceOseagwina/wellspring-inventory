const ACTIVITY_API = "http://localhost:5000/api/inventory";

const activityConditionLabels = {
  good: "Good",
  outdated: "Outdated",
  for_repair: "For Repair",
  for_replacement: "For Replacement",
  missing: "Missing"
};

const activityDepartmentLabels = {
  computing: "Computing",
  nursing: "Nursing",
  accounting: "Accounting",
  "public-health": "Public Health",
  "mass-communication": "Mass Communication",
  "bio-chemistry": "Bio Chemistry",
  "biological-science": "Biological Science"
};

const activityActionLabels = {
  added: "Added",
  edited: "Edited",
  deleted: "Deleted"
};

function escapeActivityHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function formatActivityDate(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatAcquisitionDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium"
  }).format(date);
}

function renderActivity(items) {
  const list = document.getElementById("activityList");

  if (!items.length) {
    list.innerHTML = '<div class="empty-state">No recent inventory activity yet.</div>';
    return;
  }

  list.innerHTML = items.map((item) => {
    const department = activityDepartmentLabels[item.department] || item.department;
    const condition = activityConditionLabels[item.condition] || item.condition;
    const departmentUrl = `departments/${escapeActivityHtml(item.department)}.html`;
    const action = item.action || "added";
    const actionLabel = activityActionLabels[action] || action;
    const timeValue = item.created_at || item.item_created_at || "";

    return `
      <article class="activity-item ${action === "deleted" ? "is-deleted" : ""}">
        <div class="activity-main">
          <span class="activity-action ${escapeActivityHtml(action)}">${escapeActivityHtml(actionLabel)}</span>
          <span class="badge ${escapeActivityHtml(item.condition)}">${escapeActivityHtml(condition)}</span>
          <h3>${escapeActivityHtml(item.name)}</h3>
          <div class="activity-meta">
            ${action === "deleted" ? "Deleted from" : "Recorded in"} <a class="home-link" href="${departmentUrl}">${escapeActivityHtml(department)}</a>
            &middot; Quantity ${escapeActivityHtml(item.quantity || 1)}
            &middot; Acquired ${escapeActivityHtml(formatAcquisitionDate(item.acquisition_date))}
          </div>
          <p class="muted">${escapeActivityHtml(item.comments || "No comments added.")}</p>
        </div>
        <time class="activity-time" datetime="${escapeActivityHtml(timeValue)}">
          ${escapeActivityHtml(formatActivityDate(timeValue))}
        </time>
      </article>
    `;
  }).join("");
}

async function loadActivity() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${ACTIVITY_API}/activity`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load recent activity");
    renderActivity(data);
  } catch (err) {
    const notice = document.getElementById("activityNotice");
    const list = document.getElementById("activityList");
    if (notice) notice.textContent = err.message;
    if (list) list.innerHTML = '<div class="empty-state">Recent activity could not be loaded.</div>';
  }
}

loadActivity();
