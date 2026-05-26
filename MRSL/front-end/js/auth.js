/**
 * auth.js — Shared authentication utility
 * Place this file at: front-end/js/auth.js
 *
 * Load this script FIRST on every page (protected or not).
 * On protected pages, call requireAuth() at the top of that page's JS.
 */

const TOKEN_KEY = "hh_token";

// ─── Token helpers ────────────────────────────────────────────────────────────

function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  window.location.replace("/pages/login.html");
}

// ─── JWT decode (no external library needed) ──────────────────────────────────

function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  if (!token) return false;
  const claims = decodeToken(token);
  if (!claims || !claims.exp) return false;
  return claims.exp * 1000 > Date.now();
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

/**
 * Call at the very top of every protected page's script.
 * Redirects to login immediately if no valid token exists.
 * Returns decoded JWT claims (id, username, role, exp) if valid.
 */
function requireAuth() {
  const token = getToken();
  if (!isTokenValid(token)) {
    window.location.replace("/pages/login.html");
    throw new Error("Unauthenticated – redirecting to login.");
  }
  return decodeToken(token);
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

/**
 * Fills [data-username] elements with the real username from the JWT,
 * and [data-avatar] elements with the user's initials.
 */
function injectUserInfo(claims) {
  const { username } = claims;

  const initials = username
    .replace(/[_\-\.]/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  document.querySelectorAll("[data-username]").forEach((el) => {
    el.textContent = username;
  });

  document.querySelectorAll("[data-avatar]").forEach((el) => {
    el.textContent = initials;
  });
}

/**
 * Wire up any element with [data-logout] as a logout button.
 */
function bindLogoutButtons() {
  document.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", logout);
  });
}

// ─── Auto-init on every page ──────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const token = getToken();
  if (isTokenValid(token)) {
    injectUserInfo(decodeToken(token));
  }
  bindLogoutButtons();
});