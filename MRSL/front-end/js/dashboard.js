/**
 * dashboard.js
 * front-end/js/dashboard.js
 *
 * auth.js must be loaded BEFORE this script in dashboard.html.
 */

// ─── Auth guard — runs before anything else ───────────────────────────────────
// If no valid token, the user is immediately sent to login.
// Returns JWT claims (id, username, role) for use below.
const _claims = requireAuth();

// ─── Config ───────────────────────────────────────────────────────────────────
// Empty string = same origin. Works in both dev (via proxy) and production.
const API_BASE  = "https://hydrohub-xrep.onrender.com";
const STATS_URL = `${API_BASE}/stats/dashboard`;

const REFRESH_INTERVAL_MS = 30_000;

// ─── DOM Helpers ──────────────────────────────────────────────────────────────

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((el) => {
    el.textContent = value;
  });
}

function formatPeso(amount) {
  return "₱" + Number(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderStats(data) {
  const { laundry, water, combined } = data;

  // ── MOBILE: Laundry ──
  setText("[data-stat='laundry-active-sub']",    `Processing: ${laundry.activeOperations} Orders`);
  setText("[data-stat='laundry-ready-sub']",     `Ready: ${laundry.readyToReceive} Orders`);
  setText("[data-stat='laundry-inventory-sub']", `Claimed: ${laundry.claimedCount} Orders`);
  setText("[data-stat='laundry-earnings-sub']",  `Revenue: ${formatPeso(laundry.totalEarnings)} · ${laundry.claimedCount} Orders`);

  // ── MOBILE: Water ──
  setText("[data-stat='water-active-sub']",  `Processing: ${water.activeOperations} Orders`);
  setText("[data-stat='water-ready-sub']",   `Ready: ${water.readyToReceive} Orders`);

  // ── DESKTOP: Laundry stat cards ──
  setText("[data-stat='desk-laundry-active-value']", laundry.activeOperations);
  setText("[data-stat='desk-laundry-active-sub']",   "Orders Processing");

  setText("[data-stat='desk-laundry-ready-value']",  laundry.readyToReceive);
  setText("[data-stat='desk-laundry-ready-sub']",    "Orders Ready");

  // ── DESKTOP: Laundry info cards ──
  setText("[data-stat='desk-laundry-inventory-sub']",   `Claimed: ${laundry.claimedCount} Orders`);
  setText("[data-stat='desk-laundry-inventory-value']", `${laundry.claimedCount} Items`);

  setText("[data-stat='desk-laundry-earnings-sub']",   `${laundry.claimedCount} Orders`);
  setText("[data-stat='desk-laundry-earnings-value']", formatPeso(laundry.totalEarnings));

  // ── DESKTOP: Water stat cards ──
  setText("[data-stat='desk-water-active-value']", water.activeOperations);
  setText("[data-stat='desk-water-active-sub']",   "Orders Processing");

  setText("[data-stat='desk-water-ready-value']",  water.readyToReceive);
  setText("[data-stat='desk-water-ready-sub']",    "Orders Ready");

  // ── MOBILE: Water info cards ──
  setText("[data-stat='water-inventory-sub']",  `Claimed: ${water.claimedCount} Orders`);
  setText("[data-stat='water-earnings-sub']",   `Revenue: ${formatPeso(water.totalEarnings)} · ${water.claimedCount} Orders`);

  // ── DESKTOP: Water info cards ──
  setText("[data-stat='desk-water-inventory-sub']",   `Claimed: ${water.claimedCount} Orders`);
  setText("[data-stat='desk-water-inventory-value']", `${water.claimedCount} Items`);

  setText("[data-stat='desk-water-earnings-sub']",   `${water.claimedCount} Orders`);
  setText("[data-stat='desk-water-earnings-value']", formatPeso(water.totalEarnings));

  // ── DESKTOP: Combined earnings ──
  setText("[data-stat='combined-earnings-value']", formatPeso(combined.totalEarnings));
  setText("[data-stat='combined-orders-sub']",     `${combined.totalOrders} Orders`);
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchAndRender(retries = 3) {
  try {
    const res = await fetch(STATS_URL);

    if (!res.ok) {
      console.error(`[dashboard] Stats fetch failed: ${res.status} ${res.statusText}`);
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    renderStats(data);
  } catch (err) {
    console.error("[dashboard] Could not reach stats endpoint:", err.message);
    if (retries > 0) {
      console.log(`[dashboard] Retrying in 6s… (${retries} attempts left)`);
      setTimeout(() => fetchAndRender(retries - 1), 6000);
    }
  }
}

// ─── Tab switcher ─────────────────────────────────────────────────────────────

function switchTab(tab) {
  // Mobile
  document.getElementById("tab-laundry").classList.toggle("active", tab === "laundry");
  document.getElementById("tab-water").classList.toggle("active", tab === "water");
  document.getElementById("view-laundry").style.display = tab === "laundry" ? "block" : "none";
  document.getElementById("view-water").style.display   = tab === "water"   ? "block" : "none";

  // Desktop
  document.getElementById("desk-tab-laundry").classList.toggle("active", tab === "laundry");
  document.getElementById("desk-tab-water").classList.toggle("active", tab === "water");
  document.getElementById("desk-view-laundry").style.display = tab === "laundry" ? "block" : "none";
  document.getElementById("desk-view-water").style.display   = tab === "water"   ? "block" : "none";

  document.getElementById("desk-page-title").textContent =
    tab === "laundry" ? "Laundry Overview" : "Water Refill Overview";
}

window.switchTab = switchTab;

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // Inject the real username from the JWT into all [data-username] / [data-avatar] elements
  injectUserInfo(_claims);

  // Wire up any logout buttons
  bindLogoutButtons();

  switchTab("laundry");

  fetchAndRender();
  setInterval(fetchAndRender, REFRESH_INTERVAL_MS);
});