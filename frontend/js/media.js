const MEDIA_API = `${API_ORIGIN}/api/inventory`;

const mediaConditionLabels = {
  good: "Good",
  outdated: "Outdated",
  for_repair: "For Repair",
  for_replacement: "For Replacement",
  missing: "Missing"
};

const mediaDepartmentLabels = {};

function escapeMediaHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function labelFromMediaDepartmentSlug(slug = "") {
  return String(slug)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mediaPreviewMarkup(item) {
  const parts = [];

  if (item.image_url) {
    parts.push(`
      <button class="media-preview" type="button" data-media-type="image" data-media-url="${escapeMediaHtml(item.image_url)}" data-media-title="${escapeMediaHtml(item.name)} image">
        <img src="${escapeMediaHtml(item.image_url)}" alt="${escapeMediaHtml(item.name)} image">
        <span>View image</span>
      </button>
    `);
  }

  if (item.video_url) {
    parts.push(`
      <button class="media-preview" type="button" data-media-type="video" data-media-url="${escapeMediaHtml(item.video_url)}" data-media-title="${escapeMediaHtml(item.name)} video">
        <video src="${escapeMediaHtml(item.video_url)}" muted></video>
        <span>View video</span>
      </button>
    `);
  }

  return parts.join("");
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
    ? `<video src="${escapeMediaHtml(url)}" controls autoplay></video>`
    : `<img src="${escapeMediaHtml(url)}" alt="${escapeMediaHtml(title)}">`;
  modal.classList.add("open");
}

function closeMediaViewer() {
  const modal = document.getElementById("mediaViewerModal");
  if (!modal) return;
  document.getElementById("mediaViewerBody").innerHTML = "";
  modal.classList.remove("open");
}

function renderMedia(items = []) {
  const gallery = document.getElementById("mediaGallery");
  const mediaCount = document.getElementById("mediaCount");
  const mediaTotal = items.reduce((total, item) => total + (item.image_url ? 1 : 0) + (item.video_url ? 1 : 0), 0);

  if (mediaCount) {
    mediaCount.textContent = mediaTotal
      ? `${mediaTotal} media upload${mediaTotal === 1 ? "" : "s"} across ${items.length} item${items.length === 1 ? "" : "s"}`
      : "";
  }

  if (!items.length) {
    gallery.innerHTML = '<div class="empty-state">No item media has been uploaded yet.</div>';
    return;
  }

  gallery.innerHTML = items.map((item) => {
    const department = mediaDepartmentLabels[item.department] || labelFromMediaDepartmentSlug(item.department);
    const condition = mediaConditionLabels[item.condition] || item.condition;

    return `
      <article class="media-card">
        <div class="media-card-grid">
          ${mediaPreviewMarkup(item)}
        </div>
        <div class="equipment-body">
          <div class="media-card-head">
            <span class="badge ${escapeMediaHtml(item.condition)}">${escapeMediaHtml(condition)}</span>
            <span class="media-type-count">${item.image_url && item.video_url ? "Image + video" : item.image_url ? "Image" : "Video"}</span>
          </div>
          <h3>${escapeMediaHtml(item.name || "Unnamed equipment")}</h3>
          <p class="quantity">Department: <strong>${escapeMediaHtml(department)}</strong></p>
          <p class="quantity">Quantity: <strong>${escapeMediaHtml(item.quantity || 1)}</strong></p>
          <p class="muted">${escapeMediaHtml(item.comments || "No comments added.")}</p>
        </div>
      </article>
    `;
  }).join("");
}

async function loadMedia() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${MEDIA_API}/media`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load item media");
    renderMedia(data);
  } catch (err) {
    const notice = document.getElementById("mediaNotice");
    const gallery = document.getElementById("mediaGallery");
    if (notice) notice.textContent = err.message;
    if (gallery) gallery.innerHTML = '<div class="empty-state">Item media could not be loaded.</div>';
  }
}

document.getElementById("mediaGallery").addEventListener("click", (event) => {
  const preview = event.target.closest(".media-preview");
  if (!preview) return;
  openMediaViewer(preview.dataset.mediaType, preview.dataset.mediaUrl, preview.dataset.mediaTitle);
});

loadMedia();
