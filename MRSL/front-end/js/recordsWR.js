/**
 * recordWR.js — Water Refill Transaction Records
 * Fetches all orders from GET /waterOrder, filters to CLAIMED status,
 * and renders them into both the mobile card list and the desktop table.
 *
 * Route:      GET /waterOrder          → { waterOrders: [...] }
 * Fields used: id, customerName, email, serviceType, quantity,
 *              totalPrice, status, createdAt, updatedAt
 */

const API_BASE = '/waterOrder';

/* ── State ── */
let allRecords   = [];
let filtered     = [];
let activeFilter = 'all';
let searchQuery  = '';
let sortMode     = 'newest';

/* ── Mobile DOM refs ── */
const mob = {
  skeletonWrap  : document.getElementById('mob-skeletonWrap'),
  emptyState    : document.getElementById('mob-emptyState'),
  errorState    : document.getElementById('mob-errorState'),
  errorMsg      : document.getElementById('mob-errorMsg'),
  recordsList   : document.getElementById('mob-recordsList'),
  resultsFooter : document.getElementById('mob-resultsFooter'),
  resultsCount  : document.getElementById('mob-resultsCount'),
  searchInput   : document.getElementById('mob-searchInput'),
  searchClear   : document.getElementById('mob-searchClear'),
  sortSelect    : document.getElementById('mob-sortSelect'),
  refreshBtn    : document.getElementById('refreshBtn'),
  retryBtn      : document.getElementById('mob-retryBtn'),
  totalCount    : document.getElementById('mob-totalCount'),
  totalRevenue  : document.getElementById('mob-totalRevenue'),
  totalGallons  : document.getElementById('mob-totalGallons'),
};

/* ── Desktop DOM refs ── */
const desk = {
  skeletonWrap  : document.getElementById('desk-skeletonWrap'),
  emptyState    : document.getElementById('desk-emptyState'),
  errorState    : document.getElementById('desk-errorState'),
  errorMsg      : document.getElementById('desk-errorMsg'),
  table         : document.getElementById('desk-table'),
  tbody         : document.getElementById('desk-tbody'),
  resultsFooter : document.getElementById('desk-resultsFooter'),
  resultsCount  : document.getElementById('desk-resultsCount'),
  searchInput   : document.getElementById('desk-searchInput'),
  searchClear   : document.getElementById('desk-searchClear'),
  sortSelect    : document.getElementById('desk-sortSelect'),
  refreshBtn    : document.getElementById('desk-refreshBtn'),
  retryBtn      : document.getElementById('desk-retryBtn'),
  totalCount    : document.getElementById('desk-totalCount'),
  totalRevenue  : document.getElementById('desk-totalRevenue'),
  totalGallons  : document.getElementById('desk-totalGallons'),
};

/* ── Drawer / Modal DOM refs ── */
const drawerOverlay = document.getElementById('drawerOverlay');
const drawerClose   = document.getElementById('drawerClose');
const drawerTitle   = document.getElementById('drawerTitle');
const drawerBody    = document.getElementById('drawerBody');

const detailModal   = document.getElementById('detailModal');
const modalClose    = document.getElementById('modalClose');
const modalTitle    = document.getElementById('modalTitle');
const modalBody     = document.getElementById('modalBody');

/* ════════════════════════════════════════════
   FETCH
════════════════════════════════════════════ */
async function loadRecords() {
  showSkeleton();
  hideError();

  try {
    const res = await fetch(API_BASE, {
      headers     : { 'Content-Type': 'application/json' },
      credentials : 'include',
    });

    if (!res.ok) throw new Error(`Server responded with ${res.status}`);

    const data = await res.json();

    // Support both { waterOrders: [...] } and a bare array
    const raw = Array.isArray(data)
      ? data
      : (data.waterOrders ?? data.orders ?? data.data ?? []);

    // Only show CLAIMED orders on this page
    allRecords = raw.filter(o => (o.status || '').toUpperCase() === 'CLAIMED');

    updateSummary();

    applyFilters();
  } catch (err) {
    showError(err.message || 'Failed to connect to server.');
  }
}

/* ════════════════════════════════════════════
   SUMMARY CHIPS
════════════════════════════════════════════ */
function updateSummary() {
  const count   = allRecords.length;
  const revenue = allRecords.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const gallons = allRecords.reduce((s, o) => s + (o.quantity   || 0), 0);

  const fmtRev = `₱${revenue.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
  const fmtGal = `${gallons} gal`;

  // mobile chips
  if (mob.totalCount)   mob.totalCount.textContent   = count;
  if (mob.totalRevenue) mob.totalRevenue.textContent = fmtRev;
  if (mob.totalGallons) mob.totalGallons.textContent = fmtGal;

  // desktop chips
  if (desk.totalCount)   desk.totalCount.textContent   = count;
  if (desk.totalRevenue) desk.totalRevenue.textContent = fmtRev;
  if (desk.totalGallons) desk.totalGallons.textContent = fmtGal;
}

/* ════════════════════════════════════════════
   FILTER / SEARCH / SORT
════════════════════════════════════════════ */
function applyFilters() {
  let result = [...allRecords];

  // Service type filter: all | refill | new_container
  // DB stores values as "REFILL" or "NEW_CONTAINER" (uppercase)
  if (activeFilter !== 'all') {
    result = result.filter(o =>
      (o.serviceType || '').toUpperCase() === activeFilter.toUpperCase()
    );
  }

  // Search by name, id, or email
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(o =>
      (o.customerName || '').toLowerCase().includes(q) ||
      String(o.id     || '').toLowerCase().includes(q) ||
      (o.email        || '').toLowerCase().includes(q)
    );
  }

  // Sort
  result.sort((a, b) => {
    switch (sortMode) {
      case 'oldest'    : return new Date(a.createdAt) - new Date(b.createdAt);
      case 'name_az'   : return (a.customerName || '').localeCompare(b.customerName || '');
      case 'name_za'   : return (b.customerName || '').localeCompare(a.customerName || '');
      case 'price_high': return (b.totalPrice   || 0) - (a.totalPrice || 0);
      case 'price_low' : return (a.totalPrice   || 0) - (b.totalPrice || 0);
      default          : return new Date(b.createdAt) - new Date(a.createdAt); // newest
    }
  });

  filtered = result;
  renderAll();
}

/* ════════════════════════════════════════════
   RENDER — both views
════════════════════════════════════════════ */
function renderAll() {
  hideSkeleton();

  if (filtered.length === 0) {
    showEmpty();
    return;
  }

  hideEmpty();

  const countText =
    `Showing ${filtered.length} of ${allRecords.length} record${allRecords.length !== 1 ? 's' : ''}`;

  // ── Mobile cards ──
  if (mob.recordsList) {
    mob.recordsList.innerHTML = '';
    filtered.forEach((order, idx) => mob.recordsList.appendChild(buildMobCard(order, idx)));
  }
  if (mob.resultsFooter) mob.resultsFooter.style.display = 'block';
  if (mob.resultsCount)  mob.resultsCount.textContent    = countText;

  // ── Desktop table rows ──
  if (desk.tbody) {
    desk.tbody.innerHTML = '';
    filtered.forEach((order, idx) => desk.tbody.appendChild(buildDeskRow(order, idx)));
  }
  if (desk.table)         desk.table.style.display         = '';
  if (desk.resultsFooter) desk.resultsFooter.style.display = 'block';
  if (desk.resultsCount)  desk.resultsCount.textContent    = countText;
}

/* ── Mobile card ── */
function buildMobCard(order, idx) {
  const el = document.createElement('div');
  el.className = 'record-card';
  el.style.setProperty('--d', `${Math.min(idx * 45, 300)}ms`);

  const serviceLbl = formatService(order.serviceType);
  const price      = formatPrice(order.totalPrice);
  const date       = formatDate(order.updatedAt || order.createdAt);
  const shortId    = shortOrderId(order.id);

  el.innerHTML = `
    <div class="card-row1">
      <span class="card-name">${escHtml(order.customerName || '—')}</span>
      <span class="card-amount">${price}</span>
    </div>
    <div class="card-row2">
      <span class="card-order-id">#${shortId}</span>
      <span class="badge badge-service">${serviceLbl}</span>
    </div>
    <div class="card-row3">
      <div class="card-meta">
        <span class="card-meta-item">
          <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
            <path d="M8 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 7c-3.3 0-6 1.3-6 3v1h12v-1c0-1.7-2.7-3-6-3z" fill="currentColor"/>
          </svg>
          ${escHtml((order.customerName || '—').split(' ')[0])}
        </span>
        <span class="card-meta-item">
          <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
            <path d="M8 2C8 2 3 7 3 10.5a5 5 0 0 0 10 0C13 7 8 2 8 2z" stroke="currentColor" stroke-width="1.4" fill="none"/>
          </svg>
          ${order.quantity || 0} gal
        </span>
      </div>
      <span class="card-date">${date}</span>
      ${deleteRecordBtn(order.id)}
    </div>
  `;

  el.querySelector('.record-delete-btn')?.addEventListener('click', (event) => {
    event.stopPropagation();
    deleteRecord(order.id);
  });
  el.addEventListener('click', () => openDrawer(order));
  return el;
}

/* ── Desktop table row ── */
function buildDeskRow(order, idx) {
  const tr = document.createElement('tr');
  tr.style.setProperty('--d', `${Math.min(idx * 30, 300)}ms`);
  tr.className = 'desk-row';

  const timeIn  = formatDateLong(order.createdAt);
  const timeOut = formatDateLong(order.updatedAt || order.createdAt);

  tr.innerHTML = `
    <td class="td-id">#${shortOrderId(order.id)}</td>
    <td class="td-name">
      <div class="td-name-wrap">
        <div>
          <p class="td-name-main">${escHtml(order.customerName || '—')}</p>
          ${order.email ? `<p class="td-name-sub">${escHtml(order.email)}</p>` : ''}
        </div>
      </div>
    </td>
    <td>
      <span class="badge badge-service">${formatService(order.serviceType)}</span>
    </td>
    <td class="td-qty">${order.quantity ?? '—'} gal</td>
    <td class="td-date">${timeIn}</td>
    <td class="td-date">${timeOut}</td>
    <td class="td-price">${formatPrice(order.totalPrice)}</td>
    <td><span class="badge badge-payment">Cash</span></td>
    <td>${deleteRecordBtn(order.id)}</td>
  `;

  tr.querySelector('.record-delete-btn')?.addEventListener('click', (event) => {
    event.stopPropagation();
    deleteRecord(order.id);
  });
  tr.addEventListener('click', () => openModal(order));
  return tr;
}

/* ════════════════════════════════════════════
   DRAWER (mobile detail)
════════════════════════════════════════════ */
function openDrawer(order) {
  drawerTitle.textContent = order.customerName || 'Order Detail';
  drawerBody.innerHTML    = buildDetailContent(order);
  drawerOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  drawerOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

/* ════════════════════════════════════════════
   MODAL (desktop detail)
════════════════════════════════════════════ */
function openModal(order) {
  modalTitle.textContent = order.customerName || 'Order Detail';
  modalBody.innerHTML    = buildDetailContent(order);
  detailModal.removeAttribute('aria-hidden');
  detailModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  detailModal.setAttribute('aria-hidden', 'true');
  detailModal.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Shared detail content ── */
function buildDetailContent(o) {
  const row = (label, value, cls = '') =>
    `<div class="detail-row">
       <span class="detail-key">${label}</span>
       <span class="detail-val ${cls}">${value}</span>
     </div>`;

  return `
    <div class="detail-section">
      <p class="detail-section-title">Customer Info</p>
      ${row('Full Name', escHtml(o.customerName || '—'))}
      ${row('Email',     escHtml(o.email || 'Not provided'))}
    </div>

    <div class="detail-section">
      <p class="detail-section-title">Order Details</p>
      ${row('Order ID',     `#${shortOrderId(o.id)}`)}
      ${row('Service Type', formatService(o.serviceType))}
      ${row('Quantity',     `${o.quantity ?? '—'} gallon${(o.quantity || 0) !== 1 ? 's' : ''}`)}
      ${row('Status',       capFirst((o.status || '—').toLowerCase()), 'success')}
    </div>

    <div class="detail-section">
      <p class="detail-section-title">Payment</p>
      ${row('Total Amount', formatPrice(o.totalPrice), 'accent')}
      ${row('Method',       'Cash')}
    </div>

    <div class="detail-section">
      <p class="detail-section-title">Timestamps</p>
      ${row('Time In',  formatDateLong(o.createdAt))}
      ${row('Time Out', formatDateLong(o.updatedAt || o.createdAt))}
    </div>
  `;
}

/* ════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════ */
function formatService(type) {
  const map = {
    new_container : 'New Container',
    refill        : 'Refill',
    NEW_CONTAINER : 'New Container',
    REFILL        : 'Refill',
  };
  return map[type] || capFirst((type || '—').toLowerCase().replace(/_/g, ' '));
}

function formatPrice(n) {
  if (n == null || isNaN(n)) return '—';
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: '2-digit' });
}

function formatDateLong(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-PH', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function shortOrderId(id) {
  if (!id) return '???';
  const s = String(id);
  return s.length > 6 ? s.slice(-6).toUpperCase() : s.toUpperCase();
}

function capFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

function deleteRecordBtn(orderId) {
  return `
    <button class="record-delete-btn" type="button" aria-label="Delete record" data-delete-order="${orderId}">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 7h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M6 7l1 14h10l1-14M9 7V4h6v3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>`;
}

async function deleteRecord(orderId) {
  const ok = confirm(`Delete water record #${orderId}? This will remove it from the database.`);
  if (!ok) return;

  try {
    const res = await fetch(`/waterOrder/${orderId}`, { method: 'DELETE' });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert('Delete failed: ' + (err.error || res.statusText));
      return;
    }

    await loadRecords();
  } catch (err) {
    console.error('Delete record error:', err);
    alert('Network error - please try again.');
  }
}

/* ════════════════════════════════════════════
   UI STATE HELPERS
════════════════════════════════════════════ */
function showSkeleton() {
  if (mob.skeletonWrap)   mob.skeletonWrap.style.display   = 'block';
  if (mob.recordsList)    mob.recordsList.innerHTML         = '';
  if (mob.resultsFooter)  mob.resultsFooter.style.display   = 'none';
  if (desk.skeletonWrap)  desk.skeletonWrap.style.display   = 'block';
  if (desk.tbody)         desk.tbody.innerHTML              = '';
  if (desk.table)         desk.table.style.display          = 'none';
  if (desk.resultsFooter) desk.resultsFooter.style.display  = 'none';
  hideEmpty();
  hideError();
}

function hideSkeleton() {
  if (mob.skeletonWrap)  mob.skeletonWrap.style.display  = 'none';
  if (desk.skeletonWrap) desk.skeletonWrap.style.display = 'none';
}

function showEmpty() {
  if (mob.emptyState)  mob.emptyState.style.display  = 'flex';
  if (desk.emptyState) desk.emptyState.style.display = 'flex';
  if (desk.table)      desk.table.style.display      = 'none';
}

function hideEmpty() {
  if (mob.emptyState)  mob.emptyState.style.display  = 'none';
  if (desk.emptyState) desk.emptyState.style.display = 'none';
}

function showError(msg) {
  hideSkeleton();
  if (mob.errorMsg)    mob.errorMsg.textContent        = msg;
  if (desk.errorMsg)   desk.errorMsg.textContent       = msg;
  if (mob.errorState)  mob.errorState.style.display    = 'flex';
  if (desk.errorState) desk.errorState.style.display   = 'flex';
  if (desk.table)      desk.table.style.display        = 'none';
}

function hideError() {
  if (mob.errorState)  mob.errorState.style.display  = 'none';
  if (desk.errorState) desk.errorState.style.display = 'none';
}

/* ════════════════════════════════════════════
   EVENT LISTENERS — shared helpers
════════════════════════════════════════════ */
function bindSearch(input, clearBtn) {
  if (!input) return;
  input.addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    // sync both inputs
    if (mob.searchInput  && mob.searchInput  !== input) mob.searchInput.value  = searchQuery;
    if (desk.searchInput && desk.searchInput !== input) desk.searchInput.value = searchQuery;
    if (clearBtn) clearBtn.style.display = searchQuery ? 'flex' : 'none';
    applyFilters();
  });
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchQuery = '';
      if (mob.searchInput)  mob.searchInput.value  = '';
      if (desk.searchInput) desk.searchInput.value = '';
      clearBtn.style.display = 'none';
      applyFilters();
      input.focus();
    });
  }
}

function bindSort(select) {
  if (!select) return;
  select.addEventListener('change', () => {
    sortMode = select.value;
    if (mob.sortSelect  && mob.sortSelect  !== select) mob.sortSelect.value  = sortMode;
    if (desk.sortSelect && desk.sortSelect !== select) desk.sortSelect.value = sortMode;
    applyFilters();
  });
}

function bindRefresh(btn) {
  if (!btn) return;
  btn.addEventListener('click', () => {
    btn.classList.add('spinning');
    loadRecords().finally(() =>
      setTimeout(() => btn.classList.remove('spinning'), 600)
    );
  });
}

/* ── Search ── */
bindSearch(mob.searchInput,  mob.searchClear);
bindSearch(desk.searchInput, desk.searchClear);

/* ── Sort ── */
bindSort(mob.sortSelect);
bindSort(desk.sortSelect);

/* ── Refresh ── */
bindRefresh(mob.refreshBtn);
bindRefresh(desk.refreshBtn);

/* ── Retry ── */
if (mob.retryBtn)  mob.retryBtn.addEventListener('click',  loadRecords);
if (desk.retryBtn) desk.retryBtn.addEventListener('click', loadRecords);

/* ── Filter pills (both rows, synced) ── */
document.querySelectorAll('.filter-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
    // activate matching pill in BOTH bars (mobile + desktop)
    document.querySelectorAll(`.filter-pill[data-filter="${btn.dataset.filter}"]`)
      .forEach(b => b.classList.add('active'));
    activeFilter = btn.dataset.filter;
    applyFilters();
  });
});

/* ── Drawer (mobile) ── */
if (drawerClose)   drawerClose.addEventListener('click', closeDrawer);
if (drawerOverlay) drawerOverlay.addEventListener('click', e => {
  if (e.target === drawerOverlay) closeDrawer();
});

/* ── Modal (desktop) ── */
if (modalClose)  modalClose.addEventListener('click', closeModal);
if (detailModal) detailModal.addEventListener('click', e => {
  if (e.target === detailModal) closeModal();
});

/* ── Keyboard ── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeDrawer(); closeModal(); }
});

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */
loadRecords();
