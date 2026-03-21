/* Purpose: applies the saved site theme and wires the theme toggle buttons. */
const themeKey = "themePreference";

const applyTheme = (theme) => {
  const next = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = next;
  document.body.classList.add("theme-transition");
  setTimeout(() => {
    document.body.classList.remove("theme-transition");
  }, 420);

  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    const label = btn.querySelector(".floating-label");
    const nextLabel = next === "dark" ? "Light mode" : "Dark mode";
    if (label) {
      label.textContent = nextLabel;
    } else {
      btn.textContent = nextLabel;
    }
    btn.setAttribute("aria-label", `Switch to ${nextLabel.toLowerCase()}`);
    btn.classList.add("is-switching");
    setTimeout(() => btn.classList.remove("is-switching"), 420);
  });
};

const initTheme = () => {
  const saved = localStorage.getItem(themeKey);
  if (saved) {
    applyTheme(saved);
    return;
  }
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  applyTheme(prefersDark ? "dark" : "light");
};

document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const current = document.body.dataset.theme || "light";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(themeKey, next);
    applyTheme(next);
  });
});

initTheme();
