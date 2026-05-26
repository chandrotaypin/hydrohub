/**
 * login.js — Login page logic
 * front-end/js/login.js
 *
 * auth.js must be loaded BEFORE this script in login.html.
 */

// ─── Redirect if already logged in ───────────────────────────────────────────
// Runs immediately. If a valid token exists, skip the login page entirely.
// Uses replace() so the back button won't return to login after redirecting.
(function redirectIfLoggedIn() {
  const token = getToken();
  if (isTokenValid(token)) {
    window.location.replace("/pages/dashboard.html");
  }
})();


// ─── Password visibility toggle ──────────────────────────────────────────────

function togglePwd() {
  const input = document.getElementById("password");
  const icon  = document.getElementById("eye-icon");

  if (input.type === "password") {
    input.type = "text";
    icon.innerHTML = `
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
               a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8
               a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>`;
  } else {
    input.type = "password";
    icon.innerHTML = `
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
      <circle cx="12" cy="12" r="3"/>`;
  }
}


// ─── Login form submission ────────────────────────────────────────────────────

async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const btn      = event.target.querySelector(".btn-login");
  const errorEl  = document.getElementById("login-error");

  if (errorEl) {
    errorEl.textContent = "";
    errorEl.hidden = true;
  }

  btn.disabled    = true;
  btn.textContent = "Logging in…";

  try {
    const res  = await fetch("/admin/login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showError(data.message || "Invalid credentials. Please try again.");
      return;
    }

    // Store the JWT — every protected page reads this
    saveToken(data.token);

    // Replace login in history so Back won't return here
    window.location.replace("/pages/dashboard.html");

  } catch (err) {
    console.error("Login error:", err);
    showError("Network error. Please check your connection and try again.");
  } finally {
    btn.disabled    = false;
    btn.textContent = "Log in";
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.hidden      = false;
    } else {
      alert(msg);
    }
  }
}