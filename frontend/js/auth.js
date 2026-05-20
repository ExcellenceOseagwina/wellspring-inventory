const AUTH_API = "http://localhost:5000/api/auth";

const showAuthMessage = (message, isError = true) => {
  const messageBox = document.getElementById("authMessage");
  if (!messageBox) {
    alert(message);
    return;
  }
  messageBox.textContent = message;
  messageBox.className = isError ? "error" : "notice";
};

const setFieldError = (id, message = "") => {
  const field = document.getElementById(id);
  if (field) field.textContent = message;
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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

function setupHomepageAuthAction() {
  const authAction = document.getElementById("homepageAuthAction");
  if (!authAction) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  authAction.textContent = "Sign out";
  authAction.href = "#";
  authAction.classList.remove("primary");
  authAction.classList.add("secondary");
  authAction.addEventListener("click", (event) => {
    event.preventDefault();
    logout();
  });

  document.getElementById("homepageSignupAction")?.remove();
}

function setupPasswordToggles() {
  const crossedEyeIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path>
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M4 4l16 16"></path>
    </svg>
  `;
  const eyeIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  `;

  document.querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.parentElement?.classList.contains("password-field")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "password-field";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "password-toggle";
    toggle.setAttribute("aria-label", "Show password");
    toggle.innerHTML = crossedEyeIcon;

    toggle.addEventListener("click", () => {
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      toggle.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
      toggle.classList.toggle("is-visible", isHidden);
      toggle.innerHTML = isHidden ? eyeIcon : crossedEyeIcon;
    });

    wrapper.appendChild(toggle);
  });
}

function getLoginPath() {
  const path = window.location.pathname;
  if (path.includes("/pages/departments/")) return "../login.html";
  if (path.includes("/pages/")) return "login.html";
  return "pages/login.html";
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

document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  setFieldError("emailError");
  setFieldError("passwordError");

  if (!isValidEmail(email)) {
    setFieldError("emailError", "Invalid username");
    return;
  }

  if (!password) {
    setFieldError("passwordError", "Invalid password");
    return;
  }

  try {
    const res = await fetch(`${AUTH_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("token", data.session.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "dashboard.html";
    } else {
      const authError = (data.error || "").toLowerCase();
      if (authError.includes("invalid")) {
        setFieldError("emailError", "Invalid username");
        setFieldError("passwordError", "Invalid password");
        showAuthMessage("Invalid username or password");
      } else {
        showAuthMessage(data.error || "Login failed");
      }
    }
  } catch (err) {
    showAuthMessage("Network error. Start the backend server and try again.");
  }
});

document.getElementById("signupForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const full_name = document.getElementById("full_name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${AUTH_API}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name })
    });

    const data = await res.json();

    if (res.ok) {
      showAuthMessage("Account created successfully. Please confirm your email address to sign in.", false);
      setTimeout(() => {
        window.location.href = "login.html";
      }, 900);
    } else {
      showAuthMessage(data.error || "Signup failed");
    }
  } catch (err) {
    showAuthMessage("Network error. Start the backend server and try again.");
  }
});

document.getElementById("forgotForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const redirectTo = new URL("reset-password.html", window.location.href).href;

  try {
    const res = await fetch(`${AUTH_API}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirectTo })
    });

    const data = await res.json();

    if (res.ok) {
      showAuthMessage(data.message || "Password reset link sent.", false);
    } else {
      showAuthMessage(data.error || "Failed to send reset link");
    }
  } catch (err) {
    showAuthMessage("Network error. Start the backend server and try again.");
  }
});

document.getElementById("resetPasswordForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const access_token = params.get("access_token");

  setFieldError("passwordError");
  setFieldError("confirmPasswordError");

  if (!access_token) {
    showAuthMessage("Invalid or expired password reset link");
    return;
  }

  if (password.length < 6) {
    setFieldError("passwordError", "Password must be at least 6 characters");
    return;
  }

  if (password !== confirmPassword) {
    setFieldError("confirmPasswordError", "Passwords do not match");
    return;
  }

  try {
    const res = await fetch(`${AUTH_API}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token, password })
    });

    const data = await res.json();

    if (res.ok) {
      showAuthMessage(data.message || "Password updated successfully. Please sign in.", false);
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);
    } else {
      showAuthMessage(data.error || "Could not update password");
    }
  } catch (err) {
    showAuthMessage("Network error. Start the backend server and try again.");
  }
});

function checkAuth() {
  const token = localStorage.getItem("token");
  const publicPages = ["login.html", "signup.html", "forgot-password.html", "reset-password.html"];
  const isPublicPage = publicPages.some((page) => window.location.pathname.includes(page));
  if (!token && !isPublicPage) {
    window.location.href = "login.html";
  }
  showLoggedInUser();
}

async function logout() {
  const confirmed = await showConfirmModal({
    title: "Sign out?",
    message: "You will need to sign in again before using the inventory dashboard.",
    confirmText: "Sign out"
  });

  if (!confirmed) return;

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = getLoginPath();
}

document.addEventListener("DOMContentLoaded", () => {
  showLoggedInUser();
  setupHomepageAuthAction();
  setupPasswordToggles();
});
