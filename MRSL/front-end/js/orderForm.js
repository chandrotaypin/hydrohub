/**
 * orderForm.js
 * front-end/js/orderForm.js
 *
 * Handles the New Order modal: validate → Review step → Confirm & submit.
 * Laundry  → POST /washOrder/createOrder
 * Water    → POST /waterOrder/createWaterOrder
 *
 * Requires: auth.js (provides API_BASE)
 * Loaded after: auth.js, dashboard.js
 */

// ─── Auth / fetch helpers ─────────────────────────────────────────────────────

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatPeso(amount) {
  return `₱${Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// ─── Price constants & calculators ───────────────────────────────────────────

const LAUNDRY_PRICES = { wash: 100, wash_dry_fold: 200 };
const WATER_PRICES   = { refill: 25, new_container: 130 };
const KG_PER_LOAD    = 8;

function calcLaundryTotal(weight, serviceType) {
  if (!weight || weight <= 0) return 0;
  return Math.ceil(weight / KG_PER_LOAD) * (LAUNDRY_PRICES[serviceType] ?? 0);
}

function calcWaterTotal(quantity, serviceType) {
  if (!quantity || quantity <= 0) return 0;
  return quantity * (WATER_PRICES[serviceType] ?? 0);
}

// ─── Live preview updaters ────────────────────────────────────────────────────

function updateLaundryPreview() {
  const weight      = parseFloat(document.getElementById("l-weight")?.value);
  const form        = document.getElementById("form-laundry");
  const serviceType = form?.querySelector('input[name="l-service"]:checked')?.value ?? "wash";
  const el          = document.getElementById("l-total-preview");
  if (el) el.textContent = formatPeso(calcLaundryTotal(weight, serviceType));
}

function updateWaterPreview() {
  const qty         = parseInt(document.getElementById("w-qty")?.value, 10);
  const form        = document.getElementById("form-water");
  const serviceType = form?.querySelector('input[name="w-service"]:checked')?.value ?? "refill";
  const el          = document.getElementById("w-total-preview");
  if (el) el.textContent = formatPeso(calcWaterTotal(qty, serviceType));
}

// ─── Form-level status messages ───────────────────────────────────────────────

function showFormStatus(form, type, message) {
  form.querySelector(".form-status")?.remove();
  const el = document.createElement("p");
  el.className = `form-status form-status--${type}`;
  el.textContent = message;
  Object.assign(el.style, {
    margin: "0 0 12px",
    padding: "10px 14px",
    borderRadius: "10px",
    fontSize: "0.85rem",
    fontWeight: "600",
    background: type === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
    color:      type === "success" ? "#15803d"               : "#b91c1c",
    border:    `1px solid ${type === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
  });
  const footer = form.querySelector(".modal-footer");
  footer ? form.insertBefore(el, footer) : form.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

// ─── Inline status helper for the confirm panel ───────────────────────────────

function showPanelStatus(panel, type, message) {
  panel.querySelector(".panel-status")?.remove();
  const el = document.createElement("p");
  el.className = "panel-status";
  el.textContent = message;
  Object.assign(el.style, {
    margin: "0 0 4px",
    padding: "10px 14px",
    borderRadius: "10px",
    fontSize: "0.85rem",
    fontWeight: "600",
    background: type === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
    color:      type === "success" ? "#15803d"               : "#b91c1c",
    border:    `1px solid ${type === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
  });
  panel.querySelector(".modal-footer").before(el);
  if (type === "error") setTimeout(() => el.remove(), 4500);
}

// ─── Submit-button loading state ──────────────────────────────────────────────

function setSubmitLoading(btn, loading) {
  btn.disabled = loading;
  btn.dataset.originalHtml = btn.dataset.originalHtml ?? btn.innerHTML;
  btn.innerHTML = loading
    ? `<svg class="spin" viewBox="0 0 24 24" fill="none" width="16" height="16"
          style="animation:spin .7s linear infinite">
         <circle cx="12" cy="12" r="9" stroke="white" stroke-width="2.5"
           stroke-dasharray="28" stroke-dashoffset="10" stroke-linecap="round"/>
       </svg> Saving…`
    : btn.dataset.originalHtml;
}

// Inject keyframe once
if (!document.getElementById("_spin-style")) {
  const s = document.createElement("style");
  s.id = "_spin-style";
  s.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(s);
}

// ─── Confirmation panel styles (injected once) ────────────────────────────────

if (!document.getElementById("_cp-style")) {
  const s = document.createElement("style");
  s.id = "_cp-style";
  s.textContent = `
    /* ── Slide-in animation ── */
    @keyframes cpSlideIn {
      from { opacity: 0; transform: translateX(22px); }
      to   { opacity: 1; transform: translateX(0);    }
    }
    @keyframes cpSlideOut {
      from { opacity: 1; transform: translateX(0);    }
      to   { opacity: 0; transform: translateX(-22px); }
    }

    #confirm-panel {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 4px 0 8px;
      animation: cpSlideIn 0.22s ease both;
    }

    /* Header */
    .cp-header {
      text-align: center;
      padding: 2px 0 6px;
    }
    .cp-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .cp-heading {
      font-size: 1.1rem;
      font-weight: 800;
      margin: 0 0 5px;
    }
    .cp-sub {
      font-size: 0.78rem;
      opacity: 0.6;
      margin: 0;
    }

    /* Summary table */
    .cp-summary {
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid rgba(0,0,0,0.07);
    }
    .cp-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      gap: 12px;
      background: rgba(0,0,0,0.015);
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }
    .cp-row:last-child  { border-bottom: none; }
    .cp-row:nth-child(odd) { background: rgba(0,0,0,0.03); }
    .cp-row-label {
      font-size: 0.78rem;
      font-weight: 500;
      opacity: 0.55;
      flex-shrink: 0;
    }
    .cp-row-value {
      font-size: 0.84rem;
      font-weight: 700;
      text-align: right;
      word-break: break-word;
      max-width: 60%;
    }

    /* Total block */
    .cp-total-block {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 14px;
      padding: 14px 16px;
      background: rgba(0,0,0,0.03);
      border: 1px solid rgba(0,0,0,0.07);
    }
    .cp-total-label {
      font-size: 0.82rem;
      font-weight: 700;
      opacity: 0.65;
    }
    .cp-total-amount {
      font-size: 1.55rem;
      font-weight: 900;
      letter-spacing: -0.03em;
      line-height: 1;
    }

    /* Payment picker */
    .cp-payment-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .cp-payment-heading {
      font-size: 0.78rem;
      font-weight: 700;
      opacity: 0.55;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  `;
  document.head.appendChild(s);
}

// ─── Confirmation Panel ───────────────────────────────────────────────────────

/**
 * Replaces the form with a read-only review panel.
 *
 * @param {object} cfg
 * @param {string}   cfg.formId           — "form-laundry" | "form-water"
 * @param {string}   cfg.accentColor      — hex colour for badge + total amount
 * @param {string}   cfg.orderTypeLabel   — "Laundry Order" | "Water Refill Order"
 * @param {string}   cfg.orderTypeIcon    — SVG path d= string (24×24 viewBox)
 * @param {Array<{label:string, value:string}>} cfg.rows — detail rows
 * @param {number}   cfg.totalPrice
 * @param {string}   cfg.paymentStatus    — "PAID" | "UNPAID" (pre-select from form)
 * @param {Function} cfg.onConfirm        — (paymentStatus, confirmBtn) => void
 */
function showConfirmPanel(cfg) {
  const { formId, accentColor, orderTypeLabel, rows, totalPrice, paymentStatus, onConfirm } = cfg;

  const form = document.getElementById(formId);
  if (!form) return;

  // Slide old form out
  form.style.animation = "cpSlideOut 0.18s ease both";
  setTimeout(() => {
    form.style.display = "none";
    form.style.animation = "";
  }, 170);

  // Remove any stale panel
  document.getElementById("confirm-panel")?.remove();

  // Build rows HTML
  const rowsHTML = rows.map(({ label, value }) => `
    <div class="cp-row">
      <span class="cp-row-label">${label}</span>
      <span class="cp-row-value">${value}</span>
    </div>`).join("");

  const panel = document.createElement("div");
  panel.id = "confirm-panel";
  panel.innerHTML = `
    <div class="cp-header">
      <div class="cp-badge" style="background:${accentColor}18;color:${accentColor};">
        ${orderTypeLabel}
      </div>
      <p class="cp-heading">Order Review</p>
      <p class="cp-sub">Confirm details before adding to queue</p>
    </div>

    <div class="cp-summary">${rowsHTML}</div>

    <div class="cp-total-block">
      <span class="cp-total-label">Total Price</span>
      <span class="cp-total-amount" style="color:${accentColor};">${formatPeso(totalPrice)}</span>
    </div>

    <div class="cp-payment-wrap">
      <p class="cp-payment-heading">Payment Status</p>
      <div class="payment-choice" role="radiogroup" aria-label="Payment status">
        <label class="payment-pill">
          <input type="radio" name="cp-payment" value="PAID"
            ${paymentStatus === "PAID" ? "checked" : ""} />
          <span>Paid</span>
        </label>
        <label class="payment-pill">
          <input type="radio" name="cp-payment" value="UNPAID"
            ${paymentStatus !== "PAID" ? "checked" : ""} />
          <span>Unpaid</span>
        </label>
      </div>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn-cancel" id="cp-back">
        ← Back
      </button>
      <button type="button" class="btn-submit" id="cp-confirm"
          style="background:${accentColor};">
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
          <path d="M5 12l5 5L19 7" stroke="white" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Confirm &amp; Add
      </button>
    </div>`;

  // Insert after the (now hidden) form
  form.after(panel);

  // ── Back: restore the form ──
  panel.querySelector("#cp-back").addEventListener("click", () => {
    panel.style.animation = "cpSlideOut 0.18s ease both";
    setTimeout(() => {
      panel.remove();
      form.style.display = "";
      form.style.animation = "cpSlideIn 0.22s ease both";
    }, 170);
  });

  // ── Confirm: fire the API call ──
  panel.querySelector("#cp-confirm").addEventListener("click", () => {
    const finalPayment = panel.querySelector('input[name="cp-payment"]:checked')?.value ?? "UNPAID";
    onConfirm(finalPayment, panel.querySelector("#cp-confirm"), panel);
  });
}

// ─── Modal helpers ────────────────────────────────────────────────────────────

function closeModal() {
  history.replaceState(null, "", location.pathname + location.search);
  const overlay = document.getElementById("newOrderModal");
  if (overlay) overlay.style.removeProperty("display");
}

function syncModalWithHash() {
  const overlay = document.getElementById("newOrderModal");
  if (!overlay) return;

  if (location.hash === "#newOrderModal") {
    overlay.style.removeProperty("display");
  } else {
    resetModal();
  }
}

function resetModal() {
  document.getElementById("form-laundry")?.reset();
  document.getElementById("form-water")?.reset();

  const qtyInput = document.getElementById("w-qty");
  if (qtyInput) qtyInput.value = 1;

  // Remove confirm panel and restore forms
  document.getElementById("confirm-panel")?.remove();
  ["form-laundry", "form-water"].forEach((id) => {
    const f = document.getElementById(id);
    if (f) { f.style.display = ""; f.style.animation = ""; }
  });

  // Remove any leftover status messages
  document.querySelectorAll(".form-status, .panel-status").forEach((el) => el.remove());

  // Re-enable & restore buttons
  document.querySelectorAll(
    "#form-laundry .btn-submit, #form-water .btn-submit, #cp-confirm"
  ).forEach((btn) => {
    btn.disabled = false;
    if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
  });

  updateLaundryPreview();
  updateWaterPreview();
}

// ─── Qty Stepper ──────────────────────────────────────────────────────────────

function initQtyStepper() {
  const minus = document.getElementById("qty-minus");
  const plus  = document.getElementById("qty-plus");
  const input = document.getElementById("w-qty");
  if (!minus || !plus || !input) return;

  minus.addEventListener("click", () => {
    const v = parseInt(input.value, 10) || 1;
    if (v > 1) { input.value = v - 1; updateWaterPreview(); }
  });
  plus.addEventListener("click", () => {
    input.value = (parseInt(input.value, 10) || 1) + 1;
    updateWaterPreview();
  });
  input.addEventListener("change", () => {
    const v = parseInt(input.value, 10);
    input.value = isNaN(v) || v < 1 ? 1 : v;
    updateWaterPreview();
  });
}

// ─── Laundry — Review step ────────────────────────────────────────────────────

function reviewLaundryOrder(e) {
  e.preventDefault();

  const form = document.getElementById("form-laundry");

  const customerName  = document.getElementById("l-name").value.trim();
  const email         = document.getElementById("l-email").value.trim();
  const contactNumber = document.getElementById("l-contact").value.trim();
  const weightRaw     = document.getElementById("l-weight").value;
  const serviceType   = form.querySelector('input[name="l-service"]:checked')?.value ?? "";
  const weightType    = document.getElementById("l-weight-type").checked;
  const paymentStatus = form.querySelector('input[name="l-payment-status"]:checked')?.value ?? "UNPAID";

  // ── Validation ──
  if (!customerName)
    return showFormStatus(form, "error", "Customer name is required.");
  if (!email)
    return showFormStatus(form, "error", "Email is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return showFormStatus(form, "error", "Please enter a valid email address.");
  const weight = parseFloat(weightRaw);
  if (isNaN(weight) || weight <= 0)
    return showFormStatus(form, "error", "Weight must be a positive number.");
  if (!serviceType)
    return showFormStatus(form, "error", "Please select a service type.");

  const loads      = Math.ceil(weight / KG_PER_LOAD);
  const totalPrice = calcLaundryTotal(weight, serviceType);

  showConfirmPanel({
    formId: "form-laundry",
    accentColor: "#5b8dee",
    orderTypeLabel: "Laundry Order",
    rows: [
      { label: "Customer",     value: customerName },
      { label: "Email",        value: email },
      ...(contactNumber ? [{ label: "Contact",  value: contactNumber }] : []),
      { label: "Weight",       value: `${weight} kg` },
      { label: "Service",      value: serviceType === "wash" ? "Wash" : "Wash · Dry · Fold" },
      { label: "Loads",        value: `${loads} load${loads !== 1 ? "s" : ""} × ${formatPeso(LAUNDRY_PRICES[serviceType])}/load` },
      ...(weightType ? [{ label: "Weight Type", value: "Bulk / Overweight Load" }] : []),
    ],
    totalPrice,
    paymentStatus,
    onConfirm: (finalPayment, btn, panel) => {
      submitLaundryOrder(
        { customerName, email, contactNumber: contactNumber || undefined,
          weight, serviceType, weightType, paymentStatus: finalPayment },
        btn,
        panel
      );
    },
  });
}

// ─── Laundry — Confirm & submit ───────────────────────────────────────────────

async function submitLaundryOrder(payload, btn, panel) {
  setSubmitLoading(btn, true);

  try {
    const res  = await fetch(`${API_BASE}/washOrder/createOrder`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server returned non-JSON response (${res.status})`);
    }

    if (!res.ok) {
      // Log the full response so the real Prisma/DB error is visible in the console
      console.error("[orderForm] Laundry server error response:", data);
      // Laundry controller returns { error: "..." }; fall back to status code
      throw new Error(data.error ?? data.message ?? `Server error (${res.status})`);
    }

    showPanelStatus(panel, "success", `Order #${data.order.id} added to the queue!`);

    setTimeout(() => {
      if (typeof fetchAndRender === "function") fetchAndRender();
      closeModal();
      resetModal();
    }, 1200);

  } catch (err) {
    console.error("[orderForm] Laundry submit error:", err);
    showPanelStatus(panel, "error", err.message ?? "Failed to create order. Please try again.");
    setSubmitLoading(btn, false);
  }
}

// ─── Water — Review step ──────────────────────────────────────────────────────

function reviewWaterOrder(e) {
  e.preventDefault();

  const form = document.getElementById("form-water");

  const customerName  = document.getElementById("w-name").value.trim();
  const email         = document.getElementById("w-email").value.trim();
  const serviceType   = form.querySelector('input[name="w-service"]:checked')?.value ?? "";
  const quantity      = parseInt(document.getElementById("w-qty").value, 10);
  const paymentStatus = form.querySelector('input[name="w-payment-status"]:checked')?.value ?? "UNPAID";

  // ── Validation ──
  if (!customerName)
    return showFormStatus(form, "error", "Customer name is required.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return showFormStatus(form, "error", "Please enter a valid email address.");
  if (!serviceType)
    return showFormStatus(form, "error", "Please select a service type.");
  if (isNaN(quantity) || quantity < 1)
    return showFormStatus(form, "error", "Quantity must be at least 1.");

  const totalPrice = calcWaterTotal(quantity, serviceType);

  const serviceLabel = serviceType === "refill" ? "Refill" : "New Container";
  const unitPrice    = WATER_PRICES[serviceType];

  showConfirmPanel({
    formId: "form-water",
    accentColor: "#06b6d4",
    orderTypeLabel: "Water Refill Order",
    rows: [
      { label: "Customer",  value: customerName },
      ...(email ? [{ label: "Email", value: email }] : []),
      { label: "Service",   value: serviceLabel },
      { label: "Quantity",  value: `${quantity} container${quantity !== 1 ? "s" : ""}` },
      { label: "Unit Price",value: formatPeso(unitPrice) },
    ],
    totalPrice,
    paymentStatus,
    onConfirm: (finalPayment, btn, panel) => {
      submitWaterOrder(
        { customerName, email: email || undefined,
          serviceType, quantity, paymentStatus: finalPayment },
        btn,
        panel
      );
    },
  });
}

// ─── Water — Confirm & submit ─────────────────────────────────────────────────

async function submitWaterOrder(payload, btn, panel) {
  setSubmitLoading(btn, true);

  try {
    const res  = await fetch(`${API_BASE}/waterOrder/createWaterOrder`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server returned non-JSON response (${res.status})`);
    }

    if (!res.ok) {
      // Log the full response so the real Prisma/DB error is visible in the console.
      // Water controller returns { name, code, message, meta } — NOT { error }.
      console.error("[orderForm] Water server error response:", data);
      throw new Error(data.error ?? data.message ?? `Server error (${res.status})`);
    }

    showPanelStatus(panel, "success", `Order #${data.waterOrder.id} added to the queue!`);

    setTimeout(() => {
      if (typeof fetchAndRender === "function") fetchAndRender();
      closeModal();
      resetModal();
    }, 1200);

  } catch (err) {
    console.error("[orderForm] Water submit error:", err);
    showPanelStatus(panel, "error", err.message ?? "Failed to create order. Please try again.");
    setSubmitLoading(btn, false);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // ── Form submit → Review step ──
  document.getElementById("form-laundry")?.addEventListener("submit", reviewLaundryOrder);
  document.getElementById("form-water")?.addEventListener("submit", reviewWaterOrder);

  // ── Live price previews ──
  document.getElementById("form-laundry")?.addEventListener("input",  updateLaundryPreview);
  document.getElementById("form-laundry")?.addEventListener("change", updateLaundryPreview);
  document.getElementById("form-water")?.addEventListener("input",    updateWaterPreview);
  document.getElementById("form-water")?.addEventListener("change",   updateWaterPreview);

  // ── Qty stepper ──
  initQtyStepper();

  // ── Reset when modal closes (hash leaves #newOrderModal) ──
  window.addEventListener("hashchange", syncModalWithHash);

  // ── Cancel / close buttons ──
  document.querySelectorAll(".modal-close").forEach((btn) =>
    btn.addEventListener("click", resetModal)
  );
  document.querySelectorAll(".btn-cancel").forEach((btn) =>
    btn.addEventListener("click", () => {
      closeModal();
      resetModal();
    })
  );

  // ── Initial preview ──
  syncModalWithHash();
  updateLaundryPreview();
  updateWaterPreview();
});
