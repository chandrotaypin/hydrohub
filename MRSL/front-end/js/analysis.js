// analytics.js
// Fetches data from /stats/dashboard, /washOrder, /washOrder/claimed,
// /waterOrder — and renders all charts + stat cards for the Analytics tab.

const BASE_URL = "https://hydrohub-xrep.onrender.com";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n ?? 0);

const pct = (part, total) =>
  total === 0 ? "0%" : `${Math.round((part / total) * 100)}%`;

const el = (id) => document.getElementById(id);

// ─── Chart colour palette ─────────────────────────────────────────────────────
// Hardcoded hex — Chart.js canvas cannot resolve CSS variables.
const COLORS = {
  teal:      "#1D9E75",
  tealLight: "#9FE1CB",
  blue:      "#378ADD",
  blueLight: "#B5D4F4",
  coral:     "#D85A30",
  coralLight:"#F5C4B3",
  amber:     "#BA7517",
  amberLight:"#FAC775",
  purple:    "#7F77DD",
  gray:      "#888780",
  grayLight: "#D3D1C7",
};

// ─── Fetch wrappers ───────────────────────────────────────────────────────────

async function fetchDashboard() {
  const r = await fetch(`${BASE_URL}/stats/dashboard`);
  return r.json();
}

async function fetchActiveOrders() {
  const r = await fetch(`${BASE_URL}/washOrder`);
  const data = await r.json();
  return data.orders ?? [];
}

async function fetchClaimedOrders() {
  const r = await fetch(`${BASE_URL}/washOrder/claimed`);
  const data = await r.json();
  return data.orders ?? [];
}

async function fetchWaterOrders() {
  const r = await fetch(`${BASE_URL}/waterOrder`);
  const data = await r.json();
  return data.waterOrders ?? [];
}

// ─── Stat card renderer ───────────────────────────────────────────────────────

function setCard(id, value) {
  const node = el(id);
  if (node) node.textContent = value;
}

// ─── Chart instances (kept so we can destroy on re-render) ─────────────────

const charts = {};

function destroyChart(key) {
  if (charts[key]) {
    charts[key].destroy();
    delete charts[key];
  }
}

// ─── Individual chart renderers ───────────────────────────────────────────────

// 1. Laundry status breakdown — doughnut
function renderLaundryStatusChart(dashboard) {
  destroyChart("laundryStatus");
  const ctx = el("chart-laundry-status");
  if (!ctx) return;

  const { activeOperations, readyToReceive, claimedCount } = dashboard.laundry;

  charts["laundryStatus"] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Active (Pending/Washing)", "Ready", "Claimed"],
      datasets: [{
        data: [activeOperations, readyToReceive, claimedCount],
        backgroundColor: [COLORS.amber, COLORS.blue, COLORS.teal],
        borderWidth: 2,
        borderColor: "#ffffff",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.parsed} orders`,
          },
        },
      },
    },
  });
}

// 2. Water order status breakdown — doughnut
function renderWaterStatusChart(dashboard) {
  destroyChart("waterStatus");
  const ctx = el("chart-water-status");
  if (!ctx) return;

  const { activeOperations, readyToReceive, claimedCount } = dashboard.water;

  charts["waterStatus"] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Active (Pending)", "Ready", "Claimed"],
      datasets: [{
        data: [activeOperations, readyToReceive, claimedCount],
        backgroundColor: [COLORS.coral, COLORS.purple, COLORS.teal],
        borderWidth: 2,
        borderColor: "#ffffff",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.parsed} orders`,
          },
        },
      },
    },
  });
}

// 3. Laundry service type split — bar (wash vs wash_dry_fold)
function renderLaundryServiceChart(allLaundry) {
  destroyChart("laundryService");
  const ctx = el("chart-laundry-service");
  if (!ctx) return;

  const wash        = allLaundry.filter((o) => o.serviceType === "wash").length;
  const washDryFold = allLaundry.filter((o) => o.serviceType === "wash_dry_fold").length;

  charts["laundryService"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Wash", "Wash, Dry & Fold"],
      datasets: [{
        label: "Orders",
        data: [wash, washDryFold],
        backgroundColor: [COLORS.tealLight, COLORS.teal],
        borderColor:     [COLORS.teal,      COLORS.teal],
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 },
        },
      },
    },
  });
}

// 4. Water service type split — bar (new_container vs refill)
function renderWaterServiceChart(waterOrders) {
  destroyChart("waterService");
  const ctx = el("chart-water-service");
  if (!ctx) return;

  const newContainer = waterOrders.filter((o) => o.serviceType === "NEW_CONTAINER").length;
  const refill       = waterOrders.filter((o) => o.serviceType === "REFILL").length;

  charts["waterService"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["New Container", "Refill"],
      datasets: [{
        label: "Orders",
        data: [newContainer, refill],
        backgroundColor: [COLORS.blueLight, COLORS.blue],
        borderColor:     [COLORS.blue,      COLORS.blue],
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 },
        },
      },
    },
  });
}

// 5. Payment status split across both order types — horizontal bar
function renderPaymentChart(allLaundry, waterOrders) {
  destroyChart("payment");
  const ctx = el("chart-payment");
  if (!ctx) return;

  const laundryPaid   = allLaundry.filter((o)   => o.paymentStatus === "PAID").length;
  const laundryUnpaid = allLaundry.filter((o)   => o.paymentStatus === "UNPAID").length;
  const waterPaid     = waterOrders.filter((o)  => o.paymentStatus === "PAID").length;
  const waterUnpaid   = waterOrders.filter((o)  => o.paymentStatus === "UNPAID").length;

  charts["payment"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Laundry", "Water"],
      datasets: [
        {
          label: "Paid",
          data: [laundryPaid, waterPaid],
          backgroundColor: COLORS.teal,
        },
        {
          label: "Unpaid",
          data: [laundryUnpaid, waterUnpaid],
          backgroundColor: COLORS.coral,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          stacked: true,
          ticks: { stepSize: 1, precision: 0 },
        },
        y: { stacked: true },
      },
    },
  });
}

// 6. Earnings comparison — combined bar (laundry vs water)
function renderEarningsChart(dashboard) {
  destroyChart("earnings");
  const ctx = el("chart-earnings");
  if (!ctx) return;

  const laundryEarnings = dashboard.laundry.totalEarnings;
  const waterEarnings   = dashboard.water.totalEarnings;

  charts["earnings"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Laundry", "Water Refilling"],
      datasets: [{
        label: "Total Earnings (PHP)",
        data: [laundryEarnings, waterEarnings],
        backgroundColor: [COLORS.teal, COLORS.blue],
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${fmt(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => `₱${v.toLocaleString()}`,
          },
        },
      },
    },
  });
}

// 7. Laundry weight distribution — bar chart (weight buckets)
function renderWeightDistributionChart(allLaundry) {
  destroyChart("weightDist");
  const ctx = el("chart-weight-dist");
  if (!ctx) return;

  // Bucket orders by kg range (based on KG_PER_LOAD = 8)
  const buckets = { "1–8 kg": 0, "9–16 kg": 0, "17–24 kg": 0, "25+ kg": 0 };
  allLaundry.forEach((o) => {
    const w = o.weight ?? 0;
    if      (w <= 8)  buckets["1–8 kg"]++;
    else if (w <= 16) buckets["9–16 kg"]++;
    else if (w <= 24) buckets["17–24 kg"]++;
    else              buckets["25+ kg"]++;
  });

  charts["weightDist"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(buckets),
      datasets: [{
        label: "Orders",
        data: Object.values(buckets),
        backgroundColor: [
          COLORS.tealLight,
          COLORS.teal,
          COLORS.blue,
          COLORS.blueLight,
        ],
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 },
        },
        x: { ticks: { autoSkip: false } },
      },
    },
  });
}

// 8. Water order quantity distribution — bar chart
function renderWaterQuantityChart(waterOrders) {
  destroyChart("waterQty");
  const ctx = el("chart-water-qty");
  if (!ctx) return;

  // Count by quantity value
  const counts = {};
  waterOrders.forEach((o) => {
    const q = o.quantity ?? 0;
    counts[q] = (counts[q] ?? 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => Number(a[0]) - Number(b[0]));

  charts["waterQty"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(([qty]) => `${qty} unit${qty == 1 ? "" : "s"}`),
      datasets: [{
        label: "Orders",
        data: sorted.map(([, count]) => count),
        backgroundColor: COLORS.blue,
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 },
        },
        x: { ticks: { autoSkip: false, maxRotation: 45 } },
      },
    },
  });
}

// 9. Orders over time — line chart using createdAt
function renderTimelineChart(allLaundry, waterOrders) {
  destroyChart("timeline");
  const ctx = el("chart-timeline");
  if (!ctx) return;

  // Group by date string (YYYY-MM-DD)
  const dateKey = (iso) => iso ? iso.slice(0, 10) : "unknown";

  const laundryByDate = {};
  allLaundry.forEach((o) => {
    const d = dateKey(o.createdAt);
    laundryByDate[d] = (laundryByDate[d] ?? 0) + 1;
  });

  const waterByDate = {};
  waterOrders.forEach((o) => {
    const d = dateKey(o.createdAt);
    waterByDate[d] = (waterByDate[d] ?? 0) + 1;
  });

  const allDates = [...new Set([...Object.keys(laundryByDate), ...Object.keys(waterByDate)])]
    .filter((d) => d !== "unknown")
    .sort();

  if (allDates.length === 0) {
    const wrapper = ctx.closest(".chart-wrapper");
    if (wrapper) wrapper.innerHTML = `<p style="color:var(--color-text-secondary);font-size:13px;text-align:center;padding:2rem 0;">No date data available yet.</p>`;
    return;
  }

  charts["timeline"] = new Chart(ctx, {
    type: "line",
    data: {
      labels: allDates,
      datasets: [
        {
          label: "Laundry orders",
          data: allDates.map((d) => laundryByDate[d] ?? 0),
          borderColor: COLORS.teal,
          backgroundColor: COLORS.tealLight + "55",
          fill: true,
          tension: 0.3,
          pointRadius: 4,
        },
        {
          label: "Water orders",
          data: allDates.map((d) => waterByDate[d] ?? 0),
          borderColor: COLORS.blue,
          backgroundColor: COLORS.blueLight + "55",
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          borderDash: [5, 3],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 },
        },
        x: {
          ticks: { autoSkip: true, maxRotation: 45 },
        },
      },
    },
  });
}

// ─── Stat card updaters ───────────────────────────────────────────────────────

function updateSummaryCards(dashboard, allLaundry, waterOrders) {
  const { laundry, water, combined } = dashboard;

  // Combined
  setCard("stat-total-earnings",  fmt(combined.totalEarnings));
  setCard("stat-total-orders",    combined.totalOrders);

  // Laundry
  setCard("stat-laundry-active",    laundry.activeOperations);
  setCard("stat-laundry-ready",     laundry.readyToReceive);
  setCard("stat-laundry-claimed",   laundry.claimedCount);
  setCard("stat-laundry-earnings",  fmt(laundry.totalEarnings));

  const laundryPaidCount = allLaundry.filter((o) => o.paymentStatus === "PAID").length;
  setCard("stat-laundry-paid-pct",
    pct(laundryPaidCount, allLaundry.length) + ` (${laundryPaidCount} / ${allLaundry.length})`);

  // Water
  setCard("stat-water-active",    water.activeOperations);
  setCard("stat-water-ready",     water.readyToReceive);
  setCard("stat-water-claimed",   water.claimedCount);
  setCard("stat-water-earnings",  fmt(water.totalEarnings));

  const waterPaidCount = waterOrders.filter((o) => o.paymentStatus === "PAID").length;
  setCard("stat-water-paid-pct",
    pct(waterPaidCount, waterOrders.length) + ` (${waterPaidCount} / ${waterOrders.length})`);
}

// ─── Legend builder ───────────────────────────────────────────────────────────

function buildLegend(containerId, items) {
  const container = el(containerId);
  if (!container) return;
  container.innerHTML = items
    .map(
      ({ color, label }) =>
        `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:14px;font-size:12px;color:var(--color-text-secondary);">
          <span style="width:10px;height:10px;border-radius:2px;background:${color};flex-shrink:0;"></span>${label}
        </span>`
    )
    .join("");
}

// ─── Main render ─────────────────────────────────────────────────────────────

async function renderAnalytics() {
  try {
    // Show loading state
    const loading = el("analytics-loading");
    const content = el("analytics-content");
    const errorEl = el("analytics-error");
    if (loading) loading.style.display = "block";
    if (content) content.style.display = "none";
    if (errorEl) errorEl.style.display = "none";

    const [dashboard, activeOrders, claimedOrders, waterOrders] = await Promise.all([
      fetchDashboard(),
      fetchActiveOrders(),
      fetchClaimedOrders(),
      fetchWaterOrders(),
    ]);

    const allLaundry = [...activeOrders, ...claimedOrders];

    // Cards
    updateSummaryCards(dashboard, allLaundry, waterOrders);

    // Charts
    renderLaundryStatusChart(dashboard);
    renderWaterStatusChart(dashboard);
    renderLaundryServiceChart(allLaundry);
    renderWaterServiceChart(waterOrders);
    renderPaymentChart(allLaundry, waterOrders);
    renderEarningsChart(dashboard);
    renderWeightDistributionChart(allLaundry);
    renderWaterQuantityChart(waterOrders);
    renderTimelineChart(allLaundry, waterOrders);

    // Legends
    buildLegend("legend-laundry-status", [
      { color: COLORS.amber,  label: "Active (Pending/Washing)" },
      { color: COLORS.blue,   label: "Ready" },
      { color: COLORS.teal,   label: "Claimed" },
    ]);
    buildLegend("legend-water-status", [
      { color: COLORS.coral,  label: "Active (Pending)" },
      { color: COLORS.purple, label: "Ready" },
      { color: COLORS.teal,   label: "Claimed" },
    ]);
    buildLegend("legend-payment", [
      { color: COLORS.teal,  label: "Paid" },
      { color: COLORS.coral, label: "Unpaid" },
    ]);
    buildLegend("legend-earnings", [
      { color: COLORS.teal, label: "Laundry" },
      { color: COLORS.blue, label: "Water Refilling" },
    ]);
    buildLegend("legend-timeline", [
      { color: COLORS.teal, label: "Laundry orders" },
      { color: COLORS.blue, label: "Water orders" },
    ]);

    if (loading) loading.style.display = "none";
    if (content) content.style.display = "block";

  } catch (err) {
    console.error("[analytics] Failed to load data:", err);
    const loading = el("analytics-loading");
    const errorEl = el("analytics-error");
    if (loading) loading.style.display = "none";
    if (errorEl) {
      errorEl.textContent = "Failed to load analytics data. Please try again.";
      errorEl.style.display = "block";
    }
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
// Called when the Analytics tab becomes active.
// If you use a tab system, call renderAnalytics() when the tab is shown.
// e.g.: document.querySelector('[data-tab="analytics"]').addEventListener('click', renderAnalytics);

// Auto-init if the analytics section is already visible on load:
document.addEventListener("DOMContentLoaded", () => {
  const section = el("analytics-content") || el("analytics-loading");
  if (section) renderAnalytics();
});

// Export for tab-based usage
window.renderAnalytics = renderAnalytics;