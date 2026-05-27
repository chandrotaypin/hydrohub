/**
 * activeop.js
 * front-end/js/activeop.js
 *
 * auth.js must be loaded BEFORE this script in activeop.html.
 */

// ─── Auth guard ───────────────────────────────────────────────────────────────
const _claims = requireAuth();

// ─── Config ──────────────────────────────────────────────────────────────────
const API_BASE = 'https://hydrohub-xrep.onrender.com';

const NEXT_STATUS = {
  PENDING: 'WASHING',
  WASHING: 'READY',
};

const STATUS_LABEL = {
  WASHING: 'Washing',
  READY:   'Ready for Pickup',
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

function formatService(serviceType) {
  return serviceType === 'wash_dry_fold' ? 'Wash &amp; Fold' : 'Wash Only';
}

function paymentBadge(order) {
  const paid = String(order.paymentStatus || '').toUpperCase() === 'PAID';
  return paid
    ? '<span class="badge paid">Paid</span>'
    : '<span class="badge unpaid">Unpaid</span>';
}

function checkBtn(orderId, status) {
  return `
    <button class="check-btn" data-order="${orderId}" data-status="${status}" aria-label="Advance order">
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
  const statusClass = order.status === 'PENDING' ? '' : order.status.toLowerCase();
  return `
    <div class="order-card ${statusClass}">
      <div class="order-info">
        <p class="order-number">#${order.id}</p>
        <p class="order-name">${esc(order.customerName)}</p>
        <p class="order-detail">(${formatService(order.serviceType)} - ${order.weight}kg)</p>
        <p class="order-time">Time In: <strong>${formatTime(order.createdAt)}</strong></p>
        <div class="order-footer">
          <span class="order-price">Price: &#8369;${order.totalPrice.toLocaleString()}</span>
          ${paymentBadge(order)}
        </div>
      </div>
      ${actionButtons(order)}
    </div>`;
}

function buildDesktopRow(order) {
  const rowClass =
    order.status === 'WASHING' ? 'order-row washing-row' :
    order.status === 'READY'   ? 'order-row ready-row'   :
                                 'order-row';
  return `
    <tr class="${rowClass}">
      <td><span class="t-order-num">#${order.id}</span></td>
      <td><span class="t-name">${esc(order.customerName)}</span></td>
      <td><span class="t-service">${formatService(order.serviceType)} · ${order.weight}kg</span></td>
      <td>${formatTime(order.createdAt)}</td>
      <td><span class="t-price">&#8369;${order.totalPrice.toLocaleString()}</span></td>
      <td>${paymentBadge(order)}</td>
      <td>${actionButtons(order)}</td>
    </tr>`;
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderOrders(orders) {
  const byStatus = { PENDING: [], WASHING: [] };
  orders.forEach(o => {
    if (byStatus[o.status] !== undefined) byStatus[o.status].push(o);
  });

  ['PENDING', 'WASHING'].forEach(status => {
    const key = status.toLowerCase();
    const list = document.getElementById('mob-list-' + key);
    list.innerHTML = byStatus[status].length
      ? byStatus[status].map(buildMobileCard).join('')
      : '<p class="empty-state">No orders</p>';
  });

  ['PENDING', 'WASHING'].forEach(status => {
    const key = status.toLowerCase();
    const tbody = document.getElementById('desk-tbody-' + key);
    tbody.innerHTML = byStatus[status].length
      ? byStatus[status].map(buildDesktopRow).join('')
      : '<tr><td colspan="7" class="empty-state">No orders</td></tr>';
  });

  document.getElementById('chip-pending').innerHTML =
    `<span class="chip-dot blue"></span> ${byStatus.PENDING.length} Pending`;
  document.getElementById('chip-washing').innerHTML =
    `<span class="chip-dot green"></span> ${byStatus.WASHING.length} Washing`;

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
      const ok = confirm(`Delete laundry order #${orderId}? This will remove it from the database.`);
      if (!ok) return;

      this.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/washOrder/${orderId}`, {
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
    const res = await fetch(`${API_BASE}/washOrder/${orderId}/status`, {
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
    const res = await fetch(`${API_BASE}/washOrder`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    renderOrders(data.orders || []);
  } catch (err) {
    console.error('Failed to load orders:', err);
    ['pending', 'washing'].forEach(key => {
      const mob  = document.getElementById('mob-list-' + key);
      const desk = document.getElementById('desk-tbody-' + key);
      if (mob)  mob.innerHTML  = '<p class="empty-state">Failed to load orders.</p>';
      if (desk) desk.innerHTML = '<tr><td colspan="7" class="empty-state">Failed to load orders.</td></tr>';
    });
  }
}

// ─── Tab switching (mobile) ───────────────────────────────────────────────────
document.querySelectorAll('.tab-bar .tab').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.tab-bar .tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('mob-panel-' + this.dataset.tab).classList.remove('hidden');
  });
});

// ─── Tab switching (desktop) ──────────────────────────────────────────────────
document.querySelectorAll('.desk-tab').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.desk-tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    document.querySelectorAll('.desk-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('desk-panel-' + this.dataset.desktab).classList.remove('hidden');
  });
});

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