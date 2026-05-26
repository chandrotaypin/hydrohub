/**
 * readyWR.js
 * front-end/js/readyWR.js
 *
 * Handles the Water Refilling "Ready for Pickup" page.
 * Shows all READY water orders and allows marking them as CLAIMED.
 *
 * auth.js must be loaded BEFORE this script in readyWR.html.
 */

// ─── Auth guard ───────────────────────────────────────────────────────────────
const _claims = requireAuth();

// ─── Config ──────────────────────────────────────────────────────────────────
const API_BASE = '';

let pendingAction = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats the serviceType enum from the DB into a readable label.
 * DB values: "NEW_CONTAINER" | "REFILL"
 */
function formatService(serviceType) {
  return serviceType === 'NEW_CONTAINER' ? 'New Container' : 'Refill';
}

/**
 * Returns a styled badge for the service type.
 */
function serviceBadge(serviceType) {
  const cls   = serviceType === 'NEW_CONTAINER' ? 'new-container' : 'refill';
  const label = formatService(serviceType);
  return `<span class="badge ${cls}">${label}</span>`;
}

function claimBtn(orderId) {
  return `
    <button class="check-btn" data-order="${orderId}" aria-label="Mark as claimed">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M5 13l4 4L19 7" stroke="white" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>`;
}

// ─── Builders ────────────────────────────────────────────────────────────────
function buildMobileCard(order) {
  return `
    <div class="order-card">
      <div class="order-info">
        <p class="order-number">#${order.id}</p>
        <p class="order-name">${esc(order.customerName)}</p>
        <p class="order-detail">${formatService(order.serviceType)} &times; ${order.quantity}</p>
        <p class="order-time">Time In: <strong>${formatTime(order.createdAt)}</strong></p>
        <div class="order-footer">
          <span class="order-price">&#8369;${order.totalPrice.toLocaleString()}</span>
          ${serviceBadge(order.serviceType)}
        </div>
      </div>
      ${claimBtn(order.id)}
    </div>`;
}

function buildDesktopRow(order) {
  return `
    <tr class="order-row">
      <td><span class="t-order-num">#${order.id}</span></td>
      <td><span class="t-name">${esc(order.customerName)}</span></td>
      <td><span class="t-service">${formatService(order.serviceType)}</span></td>
      <td>${order.quantity}</td>
      <td>${formatTime(order.createdAt)}</td>
      <td><span class="t-price">&#8369;${order.totalPrice.toLocaleString()}</span></td>
      <td>${claimBtn(order.id)}</td>
    </tr>`;
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderOrders(orders) {
  const readyOrders = orders.filter(o => o.status === 'READY');

  // Mobile
  const mobList = document.getElementById('mob-list-ready');
  mobList.innerHTML = readyOrders.length
    ? readyOrders.map(buildMobileCard).join('')
    : '<p class="empty-state">No water orders ready for pickup</p>';

  // Desktop
  const tbody = document.getElementById('desk-tbody-ready');
  tbody.innerHTML = readyOrders.length
    ? readyOrders.map(buildDesktopRow).join('')
    : '<tr><td colspan="7" class="empty-state">No water orders ready for pickup</td></tr>';

  // Chip counter
  document.getElementById('chip-ready').innerHTML =
    `<span class="chip-dot teal"></span> ${readyOrders.length} Ready`;

  attachClaimListeners();
}

// ─── Event: claim buttons ─────────────────────────────────────────────────────
function attachClaimListeners() {
  document.querySelectorAll('.check-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const orderId = this.dataset.order;
      pendingAction = { orderId };
      document.getElementById('modal-order-num').textContent = '#' + orderId;
      openModal();
    });
  });
}

// ─── Modal helpers ────────────────────────────────────────────────────────────
function openModal() {
  const m = document.getElementById('confirmModal');
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  const m = document.getElementById('confirmModal');
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
}

// ─── Confirm: PATCH status to CLAIMED ────────────────────────────────────────
async function confirmClaim() {
  if (!pendingAction) return;

  const { orderId } = pendingAction;

  const confirmBtn = document.getElementById('modalConfirm');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Updating…';

  try {
    const res = await fetch(`${API_BASE}/waterOrder/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CLAIMED' }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert('Update failed: ' + (err.error || res.statusText));
      return;
    }

    closeModal();
    pendingAction = null;
    await loadOrders();
  } catch (err) {
    console.error('Network error:', err);
    alert('Network error — please try again.');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
        <path d="M5 13l4 4L19 7" stroke="white" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Confirm`;
  }
}

// ─── Data fetching ────────────────────────────────────────────────────────────
async function loadOrders() {
  try {
    const res = await fetch(`${API_BASE}/waterOrder`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    // Controller returns { waterOrders: [...] } — adjust key if yours differs
    renderOrders(data.waterOrders || data.orders || []);
  } catch (err) {
    console.error('Failed to load water orders:', err);
    const mobList = document.getElementById('mob-list-ready');
    const tbody   = document.getElementById('desk-tbody-ready');
    if (mobList) mobList.innerHTML = '<p class="empty-state">Failed to load orders.</p>';
    if (tbody)   tbody.innerHTML   = '<tr><td colspan="7" class="empty-state">Failed to load orders.</td></tr>';
  }
}

// ─── Modal wiring ─────────────────────────────────────────────────────────────
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalUndo').addEventListener('click', function () {
  pendingAction = null;
  closeModal();
});
document.getElementById('modalConfirm').addEventListener('click', confirmClaim);
document.getElementById('confirmModal').addEventListener('click', function (e) {
  if (e.target === this) {
    pendingAction = null;
    closeModal();
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectUserInfo(_claims);
  bindLogoutButtons();
  loadOrders();
});