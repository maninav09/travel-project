/* Purpose: controls the login/signup modal flow and profile image preview behavior. */
const modal = document.querySelector('[data-modal="auth"]');
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
const openButtons = document.querySelectorAll("[data-auth-open]");
const closeTargets = document.querySelectorAll("[data-close], [data-auth-close]");
const authForm = document.querySelector('[data-form="auth"]');
const modalTitle = document.querySelector("[data-title]");
const authError = document.querySelector("[data-auth-error]");
const nameField = document.querySelector('[data-field="name"]');
const profileField = document.querySelector('[data-field="profileImage"]');
const profileInput = document.querySelector('input[name="profileImage"]');
const profilePreview = document.querySelector("[data-profile-preview]");
const profileImg = document.querySelector("[data-profile-img]");
const lightbox = document.querySelector("[data-image-lightbox]");
const lightboxImg = document.querySelector("[data-lightbox-img]");
const lightboxClose = document.querySelector("[data-lightbox-close]");

let authMode = "signin";
const apiBase = window.location.protocol === "file:" ? "http://127.0.0.1:5000" : "";

const updateFieldVisibility = () => {
  const isSignup = authMode === "signup";
  if (nameField) nameField.style.display = isSignup ? "" : "none";
  if (profileField) profileField.style.display = isSignup ? "" : "none";
};

const showModal = (mode) => {
  if (!modal) return;
  authMode = mode === "signup" ? "signup" : "signin";
  modalTitle.textContent = authMode === "signup" ? "Sign Up" : "Sign In";
  if (authError) authError.textContent = "";
  updateFieldVisibility();
  modal.classList.remove("is-hidden");
};

const hideModal = () => {
  if (!modal) return;
  modal.classList.add("is-hidden");
  authForm.reset();
  if (profilePreview) profilePreview.classList.add("is-hidden");
};

openButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showModal(button.dataset.authOpen);
  });
});

closeTargets.forEach((target) => {
  target.addEventListener("click", hideModal);
});

if (authForm) {
  updateFieldVisibility();
  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (authError) authError.textContent = "";

    const endpoint =
      authMode === "signup"
        ? `${apiBase}/api/auth/signup`
        : `${apiBase}/api/auth/signin`;

    try {
      const response =
        authMode === "signup"
          ? await fetch(endpoint, {
              method: "POST",
              body: new FormData(authForm),
            })
          : await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: authForm.querySelector('input[name="email"]').value,
                password: authForm.querySelector('input[name="password"]').value,
              }),
            });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userEmail", data.email);

      if (data.profileImage) {
        localStorage.setItem("userProfileImage", data.profileImage);
      }

      if (data.name) {
        localStorage.setItem("userName", data.name);
      }

      const params = new URLSearchParams(window.location.search);
      const nextFromQuery = (params.get("next") || "").trim();
      const nextFromStorage = (localStorage.getItem("postLoginRedirect") || "").trim();
      const redirectTo = nextFromQuery || nextFromStorage || "index.html";
      localStorage.removeItem("postLoginRedirect");
      window.location.href = redirectTo;
    } catch (error) {
      if (authError) authError.textContent = error.message || "Authentication failed";
    }
  });
}

if (profileInput && profilePreview && profileImg) {
  profileInput.addEventListener("change", () => {
    const file = profileInput.files?.[0];
    if (!file) {
      profilePreview.classList.add("is-hidden");
      profileImg.removeAttribute("src");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      profileImg.src = reader.result;
      profilePreview.classList.remove("is-hidden");
    };
    reader.readAsDataURL(file);
  });
}

if (profilePreview && lightbox && lightboxImg) {
  profilePreview.addEventListener("click", () => {
    if (!profileImg?.src) return;
    lightboxImg.src = profileImg.src;
    lightbox.classList.remove("is-hidden");
  });
}

if (lightbox && lightboxClose) {
  lightboxClose.addEventListener("click", () => {
    lightbox.classList.add("is-hidden");
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideModal();
    if (lightbox) lightbox.classList.add("is-hidden");
  }
});
