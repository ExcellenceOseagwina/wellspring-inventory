const API_BASE = "http://localhost:5000/api/inventory";
const departmentParams = new URLSearchParams(window.location.search);
const DEPT = document.body.dataset.department || departmentParams.get("dept");
const DEPT_NAME = document.body.dataset.departmentName || departmentParams.get("name") || DEPT;

const conditionLabels = {
  good: "Good",
  outdated: "Outdated",
  for_repair: "For Repair",
  for_replacement: "For Replacement",
  missing: "Missing"
};

let currentItems = [];
let editingItem = null;
let currentSearchTerm = "";
let inventoryEventsChannel = null;

if ("BroadcastChannel" in window) {
  inventoryEventsChannel = new BroadcastChannel("inventory-events");
}

function getStoredUserName() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.user_metadata?.full_name || user.email || "";
  } catch (err) {
    return "";
  }
}

function showLoggedInUser() {
  const token = localStorage.getItem("token");
  const userName = getStoredUserName();
  const actions = document.querySelector(".topbar .auth-actions");

  if (!token || !userName || !actions || actions.querySelector(".user-chip")) return;

  const userChip = document.createElement("span");
  userChip.className = "user-chip";
  userChip.textContent = userName;
  actions.prepend(userChip);
}

function departmentAuthRedirect() {
  if (!localStorage.getItem("token")) {
    window.location.href = "../login.html";
  }
  showLoggedInUser();
}

function showAddModal() {
  editingItem = null;
  document.getElementById("itemForm").reset();
  document.querySelector(".form-panel h2").textContent = "Add New Equipment";
  document.querySelector("#itemForm button[type='submit']").textContent = "Save Equipment";
  document.getElementById("modal").classList.add("open");
}

function closeModal() {
  document.getElementById("modal").classList.remove("open");
  editingItem = null;
}

function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function notifyInventoryChanged(action, itemId = "") {
  const event = {
    action,
    itemId,
    department: DEPT,
    changedAt: new Date().toISOString()
  };

  localStorage.setItem("inventory:lastChanged", JSON.stringify(event));
  inventoryEventsChannel?.postMessage(event);
}

function showConfirmModal({
  title = "Confirm action",
  message = "Are you sure you want to continue?",
  confirmText = "Confirm",
  cancelText = "Cancel"
} = {}) {
  return new Promise((resolve) => {
    let modal = document.getElementById("confirmModal");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "confirmModal";
      modal.className = "modal confirm-modal";
      modal.innerHTML = `
        <section class="confirm-panel" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
          <h2 id="confirmTitle"></h2>
          <p id="confirmMessage" class="muted"></p>
          <div class="form-actions">
            <button type="button" class="btn secondary" data-confirm-cancel></button>
            <button type="button" class="btn danger" data-confirm-ok></button>
          </div>
        </section>
      `;
      document.body.appendChild(modal);
    }

    modal.querySelector("#confirmTitle").textContent = title;
    modal.querySelector("#confirmMessage").textContent = message;
    modal.querySelector("[data-confirm-cancel]").textContent = cancelText;
    modal.querySelector("[data-confirm-ok]").textContent = confirmText;
    modal.classList.add("open");

    const cleanup = (result) => {
      modal.classList.remove("open");
      modal.querySelector("[data-confirm-ok]").removeEventListener("click", onConfirm);
      modal.querySelector("[data-confirm-cancel]").removeEventListener("click", onCancel);
      modal.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKeydown);
      resolve(result);
    };

    const onConfirm = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onBackdrop = (event) => {
      if (event.target === modal) cleanup(false);
    };
    const onKeydown = (event) => {
      if (event.key === "Escape") cleanup(false);
    };

    modal.querySelector("[data-confirm-ok]").addEventListener("click", onConfirm);
    modal.querySelector("[data-confirm-cancel]").addEventListener("click", onCancel);
    modal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKeydown);
    modal.querySelector("[data-confirm-cancel]").focus();
  });
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

function openMediaViewer(type, url, title = "Equipment media") {
  let modal = document.getElementById("mediaViewerModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "mediaViewerModal";
    modal.className = "modal";
    modal.innerHTML = `
      <section class="media-viewer-panel" role="dialog" aria-modal="true" aria-labelledby="mediaViewerTitle">
        <div class="media-viewer-head">
          <h2 id="mediaViewerTitle"></h2>
          <button type="button" class="btn secondary" onclick="closeMediaViewer()">Close</button>
        </div>
        <div id="mediaViewerBody" class="media-viewer-body"></div>
      </section>
    `;
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeMediaViewer();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.classList.contains("open")) closeMediaViewer();
    });
  }

  document.getElementById("mediaViewerTitle").textContent = title;
  document.getElementById("mediaViewerBody").innerHTML = type === "video"
    ? `<video src="${escapeHtml(url)}" controls autoplay></video>`
    : `<img src="${escapeHtml(url)}" alt="${escapeHtml(title)}">`;
  modal.classList.add("open");
}

function closeMediaViewer() {
  const modal = document.getElementById("mediaViewerModal");
  if (!modal) return;
  document.getElementById("mediaViewerBody").innerHTML = "";
  modal.classList.remove("open");
}

function mediaMarkup(item) {
  if (item.video_url) {
    return `
      <button class="media-preview" type="button" data-media-type="video" data-media-url="${escapeHtml(item.video_url)}" data-media-title="${escapeHtml(item.name)}">
        <video src="${escapeHtml(item.video_url)}" muted></video>
        <span>View video</span>
      </button>
    `;
  }
  if (item.image_url) {
    return `
      <button class="media-preview" type="button" data-media-type="image" data-media-url="${escapeHtml(item.image_url)}" data-media-title="${escapeHtml(item.name)}">
        <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">
        <span>View image</span>
      </button>
    `;
  }
  return "<span>No media added</span>";
}

function getSearchText(item) {
  return [
    item.name,
    item.quantity,
    conditionLabels[item.condition] || item.condition,
    item.acquisition_date,
    item.comments
  ].filter(Boolean).join(" ").toLowerCase();
}

function itemMatchesSearch(item, searchTerm) {
  if (!searchTerm) return true;
  return getSearchText(item).includes(searchTerm);
}

function renderItems() {
  const container = document.getElementById("itemsContainer");
  const searchStatus = document.getElementById("searchStatus");
  const searchTerm = currentSearchTerm.trim().toLowerCase();
  const filteredItems = currentItems.filter((item) => itemMatchesSearch(item, searchTerm));

  if (!currentItems.length) {
    if (searchStatus) searchStatus.textContent = "";
    container.innerHTML = '<div class="empty-state">No equipment has been added for this department yet.</div>';
    return;
  }

  if (searchStatus) {
    searchStatus.textContent = searchTerm
      ? `${filteredItems.length} of ${currentItems.length} item${currentItems.length === 1 ? "" : "s"} shown`
      : `${currentItems.length} item${currentItems.length === 1 ? "" : "s"} added`;
  }

  if (!filteredItems.length) {
    container.innerHTML = '<div class="empty-state">No equipment matches your search.</div>';
    return;
  }

  container.innerHTML = filteredItems.map((item) => `
    <article class="equipment-card">
      <div class="media-box">${mediaMarkup(item)}</div>
      <div class="equipment-body">
        <span class="badge ${item.condition}">${conditionLabels[item.condition] || item.condition}</span>
        <h3>${escapeHtml(item.name)}</h3>
        <p class="quantity">Quantity: <strong>${escapeHtml(item.quantity || 1)}</strong></p>
        <p class="quantity">Date of acquisition: <strong>${escapeHtml(item.acquisition_date || "Not recorded")}</strong></p>
        <p class="muted">${escapeHtml(item.comments || "No comments added.")}</p>
        <div class="card-actions">
          <button class="btn secondary" onclick="showEditModal('${item.id}')">Edit</button>
          <button class="btn danger" onclick="deleteItem('${item.id}')">Delete</button>
        </div>
      </div>
    </article>
  `).join("");
}

function setupDepartmentSearch() {
  const content = document.querySelector(".content");
  const container = document.getElementById("itemsContainer");
  if (!content || !container || document.getElementById("departmentSearch")) return;

  const searchPanel = document.createElement("section");
  searchPanel.className = "department-search";
  searchPanel.innerHTML = `
    <label for="departmentSearch">Search added items</label>
    <div class="search-row">
      <input type="search" id="departmentSearch" placeholder="Search by item name, acquisition date, condition, quantity, or comments" autocomplete="off">
      <button type="button" class="btn secondary" id="clearSearch">Clear</button>
    </div>
    <p id="searchStatus" class="muted"></p>
  `;

  content.insertBefore(searchPanel, container);

  const input = document.getElementById("departmentSearch");
  const clearButton = document.getElementById("clearSearch");

  input.addEventListener("input", () => {
    currentSearchTerm = input.value;
    renderItems();
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    currentSearchTerm = "";
    renderItems();
    input.focus();
  });
}

async function uploadToSupabase(file, folder) {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url;
}

async function loadItems() {
  const token = localStorage.getItem("token");
  const container = document.getElementById("itemsContainer");
  if (!DEPT) {
    container.innerHTML = '<div class="empty-state">No department was selected.</div>';
    return;
  }

  container.innerHTML = '<div class="notice">Loading equipment...</div>';

  try {
    const res = await fetch(`${API_BASE}/department/${DEPT}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const items = await res.json();
    if (!res.ok) throw new Error(items.error || "Failed to load equipment");
    currentItems = items;
    renderItems();
  } catch (err) {
    container.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
  }
}

function showEditModal(id) {
  const item = currentItems.find((record) => String(record.id) === String(id));
  if (!item) {
    alert("Could not find this equipment item.");
    return;
  }

  editingItem = item;
  document.getElementById("itemForm").reset();
  document.getElementById("name").value = item.name || "";
  document.getElementById("quantity").value = item.quantity || 1;
  document.getElementById("condition").value = item.condition || "good";
  document.getElementById("acquisitionDate").value = item.acquisition_date || "";
  document.getElementById("comments").value = item.comments || "";
  document.querySelector(".form-panel h2").textContent = "Edit Equipment";
  document.querySelector("#itemForm button[type='submit']").textContent = "Update Equipment";
  document.getElementById("modal").classList.add("open");
}

async function deleteItem(id) {
  const confirmed = await showConfirmModal({
    title: "Delete equipment record?",
    message: "This will permanently remove the equipment item from this department.",
    confirmText: "Delete"
  });
  if (!confirmed) return;

  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/items/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Delete failed");
    return;
  }
  await loadItems();
  notifyInventoryChanged("deleted", id);
}

document.getElementById("departmentTitle").textContent = `${DEPT_NAME} Department`;
document.title = `${DEPT_NAME} Department - Wellspring Inventory`;
setupDepartmentSearch();
document.getElementById("itemsContainer").addEventListener("click", (event) => {
  const preview = event.target.closest(".media-preview");
  if (!preview) return;
  openMediaViewer(preview.dataset.mediaType, preview.dataset.mediaUrl, preview.dataset.mediaTitle);
});

document.getElementById("itemForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../login.html";
    return;
  }

  const imageFile = document.getElementById("image").files[0];
  const videoFile = document.getElementById("video").files[0];

  let image_url = editingItem?.image_url || null;
  let video_url = editingItem?.video_url || null;

  try {
    if (imageFile) image_url = await uploadToSupabase(imageFile, "images");
    if (videoFile) video_url = await uploadToSupabase(videoFile, "videos");

    const formData = {
      id: editingItem?.id,
      department: DEPT,
      name: document.getElementById("name").value.trim(),
      quantity: document.getElementById("quantity").value,
      condition: document.getElementById("condition").value,
      acquisition_date: document.getElementById("acquisitionDate").value,
      comments: document.getElementById("comments").value.trim(),
      image_url,
      video_url
    };

    const isEditing = Boolean(editingItem);
    if (isEditing && !editingItem.id) {
      throw new Error("This item is missing an id and cannot be updated.");
    }

    const res = await fetch(isEditing ? `${API_BASE}/items/${editingItem.id}` : `${API_BASE}/items`, {
      method: isEditing ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    const responseData = await res.json();

    if (res.ok) {
      closeModal();
      await loadItems();
      notifyInventoryChanged(isEditing ? "edited" : "added", responseData.id || editingItem?.id);
      showToast(isEditing ? "Item updated successfully" : "Item added successfully");
    } else {
      alert(responseData.error || "Could not save equipment");
    }
  } catch (err) {
    alert(err.message || "Network error");
  }
});

departmentAuthRedirect();
loadItems();
