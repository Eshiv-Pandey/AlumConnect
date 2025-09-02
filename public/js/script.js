// robust toggle
const $ = (s) => document.querySelector(s);
const loginTab = $("#login-tab");
const signupTab = $("#signup-tab");
const loginForm = $("#login-form");
const signupForm = $("#signup-form");
const heroTitle = $("#heroTitle");
const heroSubtitle = $("#heroSubtitle");
const errorBox = $("#error-box");

function showLogin() {
  loginTab.classList.add("active");
  signupTab.classList.remove("active");
  loginForm.classList.add("active");
  signupForm.classList.remove("active");
  heroTitle.textContent = "Welcome Back!";
  heroSubtitle.textContent =
    "Log in to your account to reconnect with your university network.";
}

function showSignup() {
  signupTab.classList.add("active");
  loginTab.classList.remove("active");
  signupForm.classList.add("active");
  loginForm.classList.remove("active");
  heroTitle.textContent = "Join AlumConnect";
  heroSubtitle.textContent =
    "Create an account to unlock the power of alumni connections and mentorship.";
}

// attach handlers
loginTab.addEventListener("click", showLogin);
signupTab.addEventListener("click", showSignup);

// ✅ On page load: check query params for mode + error
window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") || "login"; // default login
  const error = params.get("error");

  // toggle login/signup
  if (mode === "signup") {
    showSignup();
  } else {
    showLogin();
  }

  // show error if present
  if (error && errorBox) {
    errorBox.innerText = error;
    errorBox.style.display = "block";
  }
});
