/**
 * activeopWR.js
 * front-end/js/activeopWR.js
 *
 * Handles the Water Refilling "Active Operations" page.
 * Status flow: PENDING → READY  (single step for water orders)
 *
 * auth.js must be loaded BEFORE this script in activeopWR.html.
 */

// ─── Auth guard ───────────────────────────────────────────────────────────────
const _claims = requireAuth();

// ─── Config ──────────────────────────────────────────────────────────────────
const API_BASE = '';

const NEXT_STATUS = {
  PENDING: 'READY',
};

const STATUS_LABEL = {
  READY: 'Ready for Pickup',
};

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

function paymentBadge(order) {
  const paid = String(order.paymentStatus || '').toUpperCase() === 'PAID';
  return paid
    ? '<span class="badge paid">Paid</span>'
    : '<span class="badge unpaid">Unpaid</span>';
}

function checkBtn(orderId, status) {
  return `
    <button class="check-btn" data-order="${orderId}" data-status="${status}" aria-label="Mark as ready">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M5 13l4 4L19 7" stroke="white" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>`;
}

function deleteBtn(orderId) {
  return `
    <button class="delete-btn" data-delete-order="${orderId}" aria-label="Delete order">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 7h16" stroke="white" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M10 11v6M14 11v6" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M6 7l1 14h10l1-14M9 7V4h6v3" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>`;
}

function actionButtons(order) {
  return `<div class="action-buttons">${checkBtn(order.id, order.status)}${deleteBtn(order.id)}</div>`;
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
          ${paymentBadge(order)}
        </div>
      </div>
      ${actionButtons(order)}
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
      <td>${paymentBadge(order)}</td>
      <td>${actionButtons(order)}</td>
    </tr>`;
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderOrders(orders) {
  const pendingOrders = orders.filter(o => o.status === 'PENDING');

  // Mobile
  const mobList = document.getElementById('mob-list-pending');
  mobList.innerHTML = pendingOrders.length
    ? pendingOrders.map(buildMobileCard).join('')
    : '<p class="empty-state">No pending water orders</p>';

  // Desktop
  const tbody = document.getElementById('desk-tbody-pending');
  tbody.innerHTML = pendingOrders.length
    ? pendingOrders.map(buildDesktopRow).join('')
    : '<tr><td colspan="8" class="empty-state">No pending water orders</td></tr>';

  // Chip counter
  document.getElementById('chip-pending').innerHTML =
    `<span class="chip-dot cyan"></span> ${pendingOrders.length} Pending`;

  attachCheckListeners();
  attachDeleteListeners();
}

// ─── Event: check buttons ─────────────────────────────────────────────────────
function attachCheckListeners() {
  document.querySelectorAll('.check-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const orderId    = this.dataset.order;
      const curStatus  = this.dataset.status;
      const nextStatus = NEXT_STATUS[curStatus];

      if (!nextStatus) return;

      pendingAction = { orderId, currentStatus: curStatus };

      document.getElementById('modal-order-num').textContent   = '#' + orderId;
      document.getElementById('modal-next-status').textContent = STATUS_LABEL[nextStatus] || nextStatus;

      openModal();
    });
  });
}

function attachDeleteListeners() {
  document.querySelectorAll('[data-delete-order]').forEach(btn => {
    btn.addEventListener('click', async function () {
      const orderId = this.dataset.deleteOrder;
      const ok = confirm(`Delete water order #${orderId}? This will remove it from the database.`);
      if (!ok) return;

      this.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/waterOrder/${orderId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert('Delete failed: ' + (err.error || res.statusText));
          return;
        }

        await loadOrders();
      } catch (err) {
        console.error('Delete error:', err);
        alert('Network error - please try again.');
      } finally {
        this.disabled = false;
      }
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

// ─── Confirm: PATCH status ────────────────────────────────────────────────────
async function confirmStatusUpdate() {
  if (!pendingAction) return;

  const { orderId, currentStatus } = pendingAction;
  const nextStatus = NEXT_STATUS[currentStatus];

  const confirmBtn = document.getElementById('modalConfirm');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Updating…';

  try {
    const res = await fetch(`${API_BASE}/waterOrder/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
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
    const mob  = document.getElementById('mob-list-pending');
    const desk = document.getElementById('desk-tbody-pending');
    if (mob)  mob.innerHTML  = '<p class="empty-state">Failed to load orders.</p>';
    if (desk) desk.innerHTML = '<tr><td colspan="8" class="empty-state">Failed to load orders.</td></tr>';
  }
}

// ─── Modal wiring ─────────────────────────────────────────────────────────────
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalUndo').addEventListener('click', function () {
  pendingAction = null;
  closeModal();
});
document.getElementById('modalConfirm').addEventListener('click', confirmStatusUpdate);
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
