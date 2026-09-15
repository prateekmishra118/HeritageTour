const API_BASE = '/api';

function getLoggedInUser() {
  const raw = localStorage.getItem('tourismUser');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function setLoggedInUser(user) {
  localStorage.setItem('tourismUser', JSON.stringify(user));
}

function clearLoggedInUser() {
  localStorage.removeItem('tourismUser');
}

async function apiRequest(path, { method = 'GET', body = null, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const user = getLoggedInUser();
    if (user) {
      headers['x-user-id'] = user.user_id;
      headers['x-user-role'] = user.role;
    }
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (networkErr) {
    return { success: false, message: 'Could not reach the server. Please check your connection.' };
  }

  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    return { success: false, message: `Unexpected server response (status ${response.status}).` };
  }

  return data;
}

/* ---------------- Toast ---------------- */

let toastTimer = null;
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

/* ---------------- Formatting helpers ---------------- */

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `₹${num.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusClass(status) {
  return `status-${String(status).toLowerCase()}`;
}

function statusLabel(status) {
  return String(status).replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/* ---------------- Page / tab navigation ---------------- */

function showPage(pageId) {
  document.querySelectorAll('.page-section').forEach((el) => el.classList.add('hidden'));
  const target = document.getElementById(pageId);
  if (target) target.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchDashboardTab(dashboardSectionId, tabId) {
  const section = document.getElementById(dashboardSectionId);
  if (!section) return;

  section.querySelectorAll('.dashboard-tab').forEach((el) => el.classList.add('hidden'));
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.remove('hidden');

  section.querySelectorAll('.dashboard-nav-btn[data-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
}

function dashboardSectionForTab(tabId) {
  if (tabId.startsWith('tourist')) return 'touristDashboardSection';
  if (tabId.startsWith('guide')) return 'guideDashboardSection';
  if (tabId.startsWith('admin')) return 'adminDashboardSection';
  return null;
}

/* ---------------- Header state ---------------- */

function refreshHeader() {
  const user = getLoggedInUser();
  const loggedOut = document.getElementById('loggedOutActions');
  const loggedIn = document.getElementById('loggedInActions');

  if (user) {
    loggedOut.classList.add('hidden');
    loggedIn.classList.remove('hidden');
    document.getElementById('headerUserName').textContent = user.name;
  } else {
    loggedOut.classList.remove('hidden');
    loggedIn.classList.add('hidden');
  }
}

function goToDashboardForRole(user) {
  if (!user) return;
  if (user.role === 'TOURIST') {
    showPage('touristDashboardSection');
    loadTouristDashboard();
  } else if (user.role === 'TOUR_GUIDE') {
    showPage('guideDashboardSection');
    loadGuideDashboard();
  } else if (user.role === 'ADMIN') {
    showPage('adminDashboardSection');
    loadAdminDashboard();
  }
}

function logout() {
  clearLoggedInUser();
  refreshHeader();
  showPage('homeSection');
  showToast('Logged out successfully.', 'success');
}

/* ---------------- Auth modal ---------------- */

function openAuthModal(tab = 'login') {
  document.getElementById('authModal').classList.remove('hidden');
  setAuthTab(tab);
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
  document.getElementById('loginForm').reset();
  document.getElementById('registerForm').reset();
}

function setAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginBtn = document.getElementById('showLoginTab');
  const registerBtn = document.getElementById('showRegisterTab');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginBtn.classList.add('active');
    registerBtn.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    loginBtn.classList.remove('active');
    registerBtn.classList.add('active');
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  const result = await apiRequest('/auth/login', { method: 'POST', body: { email, password } });

  if (!result.success) {
    showToast(result.message || 'Login failed.', 'error');
    return;
  }

  setLoggedInUser(result.user);
  refreshHeader();
  closeAuthModal();
  showToast(`Welcome back, ${result.user.name}!`, 'success');
  goToDashboardForRole(result.user);
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const phone = document.getElementById('registerPhone').value.trim();
  const password = document.getElementById('registerPassword').value;

  const result = await apiRequest('/auth/register', { method: 'POST', body: { name, email, phone, password } });

  if (!result.success) {
    showToast(result.message || 'Registration failed.', 'error');
    return;
  }

  setLoggedInUser(result.user);
  refreshHeader();
  closeAuthModal();
  showToast('Account created successfully!', 'success');
  goToDashboardForRole(result.user);
}

/* ---------------- Data caches ---------------- */

let cachedSites = [];
let cachedGuides = [];

async function loadSitesCache() {
  const result = await apiRequest('/heritage');
  cachedSites = result.success ? result.data : [];
  return cachedSites;
}

async function loadGuidesCache() {
  const result = await apiRequest('/guides');
  cachedGuides = result.success ? result.data : [];
  return cachedGuides;
}

/* ---------------- Home page rendering ---------------- */

function renderSiteCard(site, actionsHtml) {
  return `
    <div class="site-card">
      <div class="site-card-top">
        <span class="site-icon">🏛️</span>
        <strong>${site.site_name}</strong>
      </div>
      <div class="site-card-body">
        <h3>${site.site_name}</h3>
        <div class="site-location">📍 ${site.location}</div>
        <div class="site-price">${site.ticket_price > 0 ? formatCurrency(site.ticket_price) + ' / ticket' : 'Free Entry'}</div>
        <div class="card-actions">${actionsHtml}</div>
      </div>
    </div>
  `;
}

async function loadHomeSites(search) {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const result = await apiRequest(`/heritage${query}`);
  const grid = document.getElementById('homeSitesGrid');

  if (!result.success || result.data.length === 0) {
    grid.innerHTML = '<p class="empty-state">No heritage sites found.</p>';
    return;
  }

  grid.innerHTML = result.data.map((site) => renderSiteCard(
    site,
    `<button class="btn btn-outline btn-sm" onclick="openSiteDetails(${site.site_id})">View Details</button>`
  )).join('');
}

async function loadHomeEvents() {
  const result = await apiRequest('/events');
  const grid = document.getElementById('homeEventsGrid');

  if (!result.success || result.data.length === 0) {
    grid.innerHTML = '<p class="empty-state">No upcoming events right now.</p>';
    return;
  }

  grid.innerHTML = result.data.slice(0, 6).map((ev) => `
    <div class="event-card">
      <span class="event-date-badge">${formatDate(ev.event_date)}${ev.event_time ? ' · ' + ev.event_time : ''}</span>
      <h3>${ev.event_name}</h3>
      <div class="site-location">📍 ${ev.site_name}</div>
      <p>${ev.description || ''}</p>
    </div>
  `).join('');
}

async function openSiteDetails(siteId) {
  const result = await apiRequest(`/heritage/${siteId}`);
  if (!result.success) {
    showToast(result.message || 'Could not load site details.', 'error');
    return;
  }

  const site = result.data;
  const user = getLoggedInUser();
  const canBook = user && user.role === 'TOURIST';

  document.getElementById('siteDetailsContent').innerHTML = `
    <h2>${site.site_name}</h2>
    <p class="site-location">📍 ${site.location}</p>
    <p>${site.description || 'No description available.'}</p>
    <p><strong>Timings:</strong> ${site.opening_time || '-'} – ${site.closing_time || '-'}</p>
    <p><strong>Ticket Price:</strong> ${site.ticket_price > 0 ? formatCurrency(site.ticket_price) : 'Free Entry'}</p>
    <div class="card-actions" style="margin-top: 16px;">
      ${canBook
        ? `<button class="btn btn-primary" onclick="closeModal('siteDetailsModal'); openBookingModal(${site.site_id});">Book This Site</button>`
        : `<button class="btn btn-primary" onclick="closeModal('siteDetailsModal'); openAuthModal('login');">Login to Book</button>`}
    </div>
  `;

  document.getElementById('siteDetailsModal').classList.remove('hidden');
}

/* ---------------- Generic modal close ---------------- */

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

/* ==================================================
   TOURIST DASHBOARD
   ================================================== */

async function loadTouristDashboard() {
  const user = getLoggedInUser();
  if (!user) return;

  document.getElementById('touristWelcomeName').textContent = user.name;
  document.getElementById('touristInfoName').textContent = user.name;
  document.getElementById('touristInfoEmail').textContent = user.email;
  document.getElementById('touristInfoPhone').textContent = user.phone || '-';

  await loadSitesCache();
  await loadGuidesCache();
  loadTouristSites();
  loadMyBookings();
  loadTouristGuides();
  loadTouristEvents();
  populateFeedbackSiteSelect();
}

function loadTouristSites(search) {
  const grid = document.getElementById('touristSitesGrid');
  const term = (search || '').toLowerCase();
  const filtered = term
    ? cachedSites.filter((s) => s.site_name.toLowerCase().includes(term) || s.location.toLowerCase().includes(term))
    : cachedSites;

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="empty-state">No heritage sites match your search.</p>';
    return;
  }

  grid.innerHTML = filtered.map((site) => renderSiteCard(
    site,
    `<button class="btn btn-outline btn-sm" onclick="openSiteDetails(${site.site_id})">Details</button>
     <button class="btn btn-primary btn-sm" onclick="openBookingModal(${site.site_id})">Book Visit</button>`
  )).join('');
}

async function loadMyBookings() {
  const user = getLoggedInUser();
  const list = document.getElementById('myBookingsList');

  if (!user || !user.tourist_id) {
    list.innerHTML = '<p class="empty-state">Booking history is unavailable.</p>';
    return;
  }

  const result = await apiRequest(`/bookings/tourist/${user.tourist_id}`, { auth: true });

  if (!result.success) {
    list.innerHTML = `<p class="empty-state">${result.message || 'Failed to load bookings.'}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="empty-state">You have no bookings yet. Book your first heritage visit!</p>';
    return;
  }

  list.innerHTML = result.data.map((b) => `
    <div class="booking-row">
      <div class="booking-row-main">
        <strong>#${b.booking_id} · ${b.site_name}</strong>
        <div class="booking-row-meta">
          Guide: ${b.guide_name} · Visit: ${formatDate(b.visit_date)} · Tickets: ${b.number_of_tickets} · Amount: ${formatCurrency(b.amount)}
        </div>
        <div class="booking-row-meta">
          Payment: ${statusLabel(b.payment_status)}${b.payment_method ? ' via ' + statusLabel(b.payment_method) : ''}
        </div>
      </div>
      <div class="booking-row-actions">
        <span class="status-pill ${statusClass(b.booking_status)}">${statusLabel(b.booking_status)}</span>
        ${b.booking_status === 'ACCEPTED'
          ? `<button class="btn btn-primary btn-sm" onclick="openPaymentModal(${b.booking_id}, ${b.amount})">Pay Now</button>`
          : ''}
      </div>
    </div>
  `).join('');
}

function loadTouristGuides() {
  const grid = document.getElementById('touristGuidesGrid');
  renderGuideGrid(grid, cachedGuides);
}

function renderGuideGrid(grid, guides) {
  if (!guides || guides.length === 0) {
    grid.innerHTML = '<p class="empty-state">No tour guides found.</p>';
    return;
  }

  grid.innerHTML = guides.map((g) => `
    <div class="guide-card">
      <h3>${g.name}</h3>
      <div class="guide-meta">✉️ ${g.email}</div>
      <div class="guide-meta">📞 ${g.phone || '-'}</div>
      <div class="guide-meta">🧭 ${g.experience || 0} years experience</div>
      <div class="guide-meta">🗣️ ${g.language || '-'}</div>
      <span class="availability-badge ${g.availability === 'AVAILABLE' ? 'available' : 'unavailable'}">
        ${g.availability === 'AVAILABLE' ? 'Available' : 'Unavailable'}
      </span>
    </div>
  `).join('');
}

async function loadTouristEvents() {
  const result = await apiRequest('/events');
  const grid = document.getElementById('touristEventsGrid');

  if (!result.success || result.data.length === 0) {
    grid.innerHTML = '<p class="empty-state">No events available right now.</p>';
    return;
  }

  const user = getLoggedInUser();

  grid.innerHTML = result.data.map((ev) => `
    <div class="event-card">
      <span class="event-date-badge">${formatDate(ev.event_date)}${ev.event_time ? ' · ' + ev.event_time : ''}</span>
      <h3>${ev.event_name}</h3>
      <div class="site-location">📍 ${ev.site_name}</div>
      <p>${ev.description || ''}</p>
      <button class="btn btn-primary btn-sm" onclick="registerForEvent(${ev.event_id})">Register</button>
    </div>
  `).join('');
}

async function registerForEvent(eventId) {
  const user = getLoggedInUser();
  if (!user || !user.tourist_id) {
    showToast('Please login as a tourist to register for events.', 'error');
    openAuthModal('login');
    return;
  }

  const result = await apiRequest(`/events/${eventId}/register`, {
    method: 'POST',
    body: { tourist_id: user.tourist_id },
    auth: true
  });

  showToast(result.message, result.success ? 'success' : 'error');
}

function populateFeedbackSiteSelect() {
  const select = document.getElementById('feedbackSiteSelect');
  select.innerHTML = cachedSites.map((s) => `<option value="${s.site_id}">${s.site_name}</option>`).join('');
}

async function handleFeedbackSubmit(e) {
  e.preventDefault();
  const user = getLoggedInUser();
  if (!user || !user.tourist_id) {
    showToast('Please login as a tourist to submit feedback.', 'error');
    return;
  }

  const site_id = document.getElementById('feedbackSiteSelect').value;
  const rating = document.getElementById('feedbackRatingSelect').value;
  const comments = document.getElementById('feedbackComments').value.trim();

  const result = await apiRequest('/feedback', {
    method: 'POST',
    body: { tourist_id: user.tourist_id, site_id, rating, comments },
    auth: true
  });

  showToast(result.message, result.success ? 'success' : 'error');
  if (result.success) {
    document.getElementById('feedbackForm').reset();
  }
}

/* ==================================================
   BOOKING MODAL
   ================================================== */

function openBookingModal(presetSiteId) {
  const user = getLoggedInUser();
  if (!user || user.role !== 'TOURIST') {
    showToast('Please login as a tourist to book a visit.', 'error');
    openAuthModal('login');
    return;
  }

  const siteSelect = document.getElementById('bookingSiteSelect');
  const guideSelect = document.getElementById('bookingGuideSelect');

  siteSelect.innerHTML = cachedSites.map((s) => `<option value="${s.site_id}">${s.site_name} (${s.location})</option>`).join('');
  guideSelect.innerHTML = '<option value="">Select a tour guide</option>' +
    cachedGuides.map((g) => `<option value="${g.guide_id}">${g.name} - ${g.language || ''}</option>`).join('');

  if (presetSiteId) {
    siteSelect.value = presetSiteId;
  }

  document.getElementById('bookingVisitDate').value = '';
  document.getElementById('bookingTickets').value = 1;
  document.getElementById('bookingGuideSelect').value = '';

  recalcBookingAmount();

  document.getElementById('bookingModal').classList.remove('hidden');
}

function recalcBookingAmount() {
  const siteId = document.getElementById('bookingSiteSelect').value;
  const tickets = Number(document.getElementById('bookingTickets').value) || 0;
  const site = cachedSites.find((s) => String(s.site_id) === String(siteId));
  const amount = site ? site.ticket_price * tickets : 0;
  document.getElementById('bookingAmountDisplay').textContent = formatCurrency(amount);
}

async function handleBookingSubmit(e) {
  e.preventDefault();

  const user = getLoggedInUser();
  const site_id = document.getElementById('bookingSiteSelect').value;
  const guide_id = document.getElementById('bookingGuideSelect').value;
  const visit_date = document.getElementById('bookingVisitDate').value;
  const number_of_tickets = document.getElementById('bookingTickets').value;

  if (!guide_id) {
    showToast('Please select a tour guide.', 'error');
    return;
  }

  if (!visit_date) {
    showToast('Please select a visit date.', 'error');
    return;
  }

  const result = await apiRequest('/bookings', {
    method: 'POST',
    body: {
      tourist_id: user.tourist_id,
      site_id,
      guide_id,
      visit_date,
      number_of_tickets
    },
    auth: true
  });

  if (!result.success) {
    showToast(result.message || 'Booking failed.', 'error');
    return;
  }

  showToast(`Booking #${result.data.booking_id} created! Waiting for the guide to accept.`, 'success');
  closeModal('bookingModal');
  switchDashboardTab('touristDashboardSection', 'touristBookingsTab');
  loadMyBookings();
}

/* ==================================================
   PAYMENT MODAL
   ================================================== */

let currentPaymentBookingId = null;

function openPaymentModal(bookingId, amount) {
  currentPaymentBookingId = bookingId;
  document.getElementById('paymentBookingIdDisplay').textContent = `#${bookingId}`;
  document.getElementById('paymentAmountDisplay').textContent = formatCurrency(amount);
  document.getElementById('paymentModal').classList.remove('hidden');
}

async function handlePaymentSubmit(e) {
  e.preventDefault();

  const payment_method = document.getElementById('paymentMethodSelect').value;

  const result = await apiRequest('/payments', {
    method: 'POST',
    body: { booking_id: currentPaymentBookingId, payment_method },
    auth: true
  });

  showToast(result.message, result.success ? 'success' : 'error');
  closeModal('paymentModal');
  loadMyBookings();
}

/* ==================================================
   GUIDE DASHBOARD
   ================================================== */

async function loadGuideDashboard() {
  const user = getLoggedInUser();
  if (!user) return;

  document.getElementById('guideWelcomeName').textContent = user.name;

  const result = await apiRequest(`/guides/profile/${user.user_id}`, { auth: true });
  if (result.success) {
    const g = result.data;
    document.getElementById('guideProfileName').textContent = g.name;
    document.getElementById('guideProfileEmail').textContent = g.email;
    document.getElementById('guideProfilePhone').textContent = g.phone || '-';
    document.getElementById('guideProfileExperience').textContent = g.experience || 0;
    document.getElementById('guideProfileLanguage').textContent = g.language || '-';
    document.getElementById('guideProfileAvailability').textContent = g.availability === 'AVAILABLE' ? 'Available' : 'Unavailable';
    document.getElementById('guideAvailabilitySelect').value = g.availability;
  }

  loadGuideBookings();
}

async function handleUpdateAvailability() {
  const user = getLoggedInUser();
  if (!user || !user.guide_id) return;

  const availability = document.getElementById('guideAvailabilitySelect').value;

  const result = await apiRequest(`/guides/${user.guide_id}/availability`, {
    method: 'PUT',
    body: { availability },
    auth: true
  });

  showToast(result.message, result.success ? 'success' : 'error');
  if (result.success) {
    document.getElementById('guideProfileAvailability').textContent = availability === 'AVAILABLE' ? 'Available' : 'Unavailable';
  }
}

async function loadGuideBookings() {
  const user = getLoggedInUser();
  const list = document.getElementById('guideBookingsList');

  if (!user || !user.guide_id) {
    list.innerHTML = '<p class="empty-state">No assigned bookings available.</p>';
    return;
  }

  const result = await apiRequest(`/guides/${user.guide_id}/bookings`, { auth: true });

  if (!result.success) {
    list.innerHTML = `<p class="empty-state">${result.message || 'Failed to load bookings.'}</p>`;
    return;
  }

  if (result.data.length === 0) {
    list.innerHTML = '<p class="empty-state">No bookings have been assigned to you yet.</p>';
    return;
  }

  list.innerHTML = result.data.map((b) => `
    <div class="booking-row">
      <div class="booking-row-main">
        <strong>#${b.booking_id} · ${b.site_name}</strong>
        <div class="booking-row-meta">
          Tourist: ${b.tourist_name} (${b.tourist_phone || '-'}) · Visit: ${formatDate(b.visit_date)} · Tickets: ${b.number_of_tickets} · Amount: ${formatCurrency(b.amount)}
        </div>
      </div>
      <div class="booking-row-actions">
        <span class="status-pill ${statusClass(b.booking_status)}">${statusLabel(b.booking_status)}</span>
        ${b.booking_status === 'PENDING' ? `
          <button class="btn btn-primary btn-sm" onclick="respondToGuideBooking(${b.booking_id}, 'accept')">Accept</button>
          <button class="btn btn-danger btn-sm" onclick="respondToGuideBooking(${b.booking_id}, 'reject')">Reject</button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

async function respondToGuideBooking(bookingId, action) {
  const result = await apiRequest(`/guides/bookings/${bookingId}/${action}`, { method: 'PUT', auth: true });
  showToast(result.message, result.success ? 'success' : 'error');
  loadGuideBookings();
}

/* ==================================================
   ADMIN DASHBOARD
   ================================================== */

async function loadAdminDashboard() {
  const user = getLoggedInUser();
  if (!user) return;

  document.getElementById('adminWelcomeName').textContent = user.name;

  await loadSitesCache();

  loadAdminStats();
  loadAdminUsers();
  loadAdminSites();
  loadAdminGuides();
  loadAdminEvents();
  loadAdminBookings();
  loadAdminReports();
}

async function loadAdminStats() {
  const result = await apiRequest('/admin/dashboard', { auth: true });
  const grid = document.getElementById('adminStatsGrid');

  if (!result.success) {
    grid.innerHTML = `<p class="empty-state">${result.message || 'Failed to load statistics.'}</p>`;
    return;
  }

  const d = result.data;
  const stats = [
    ['Total Tourists', d.total_tourists],
    ['Heritage Sites', d.total_heritage_sites],
    ['Tour Guides', d.total_tour_guides],
    ['Total Bookings', d.total_bookings],
    ['Total Events', d.total_events],
    ['Successful Payments', d.total_successful_payments]
  ];

  grid.innerHTML = stats.map(([label, value]) => `
    <div class="stat-card">
      <div class="stat-number">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  `).join('');
}

async function loadAdminUsers() {
  const result = await apiRequest('/admin/users', { auth: true });
  const tbody = document.getElementById('adminUsersTableBody');

  if (!result.success) {
    tbody.innerHTML = `<tr><td colspan="5">${result.message || 'Failed to load users.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = result.data.map((u) => `
    <tr>
      <td>${u.user_id}</td>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.phone || '-'}</td>
      <td>${u.role}</td>
    </tr>
  `).join('');
}

async function loadAdminSites() {
  const result = await apiRequest('/admin/heritage', { auth: true });
  const tbody = document.getElementById('adminSitesTableBody');

  if (!result.success) {
    tbody.innerHTML = `<tr><td colspan="6">${result.message || 'Failed to load heritage sites.'}</td></tr>`;
    return;
  }

  cachedSites = result.data;

  tbody.innerHTML = result.data.map((s) => `
    <tr>
      <td>${s.site_id}</td>
      <td>${s.site_name}</td>
      <td>${s.location}</td>
      <td>${s.ticket_price > 0 ? formatCurrency(s.ticket_price) : 'Free'}</td>
      <td>${s.opening_time || '-'} - ${s.closing_time || '-'}</td>
      <td class="table-actions">
        <button class="btn btn-outline btn-sm" onclick='openAdminSiteModal(${JSON.stringify(s)})'>Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteAdminSite(${s.site_id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function openAdminSiteModal(site) {
  document.getElementById('adminSiteModalTitle').textContent = site ? 'Edit Heritage Site' : 'Add Heritage Site';
  document.getElementById('adminSiteId').value = site ? site.site_id : '';
  document.getElementById('adminSiteName').value = site ? site.site_name : '';
  document.getElementById('adminSiteLocation').value = site ? site.location : '';
  document.getElementById('adminSiteDescription').value = site ? (site.description || '') : '';
  document.getElementById('adminSiteOpeningTime').value = site ? (site.opening_time || '') : '';
  document.getElementById('adminSiteClosingTime').value = site ? (site.closing_time || '') : '';
  document.getElementById('adminSiteTicketPrice').value = site ? site.ticket_price : 0;
  document.getElementById('adminSiteModal').classList.remove('hidden');
}

async function handleAdminSiteSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('adminSiteId').value;
  const body = {
    site_name: document.getElementById('adminSiteName').value.trim(),
    location: document.getElementById('adminSiteLocation').value.trim(),
    description: document.getElementById('adminSiteDescription').value.trim(),
    opening_time: document.getElementById('adminSiteOpeningTime').value.trim(),
    closing_time: document.getElementById('adminSiteClosingTime').value.trim(),
    ticket_price: Number(document.getElementById('adminSiteTicketPrice').value) || 0
  };

  const result = id
    ? await apiRequest(`/admin/heritage/${id}`, { method: 'PUT', body, auth: true })
    : await apiRequest('/admin/heritage', { method: 'POST', body, auth: true });

  showToast(result.message, result.success ? 'success' : 'error');
  if (result.success) {
    closeModal('adminSiteModal');
    loadAdminSites();
  }
}

async function deleteAdminSite(siteId) {
  if (!confirm('Delete this heritage site? This cannot be undone.')) return;
  const result = await apiRequest(`/admin/heritage/${siteId}`, { method: 'DELETE', auth: true });
  showToast(result.message, result.success ? 'success' : 'error');
  loadAdminSites();
}

async function loadAdminGuides() {
  const result = await apiRequest('/admin/guides', { auth: true });
  const tbody = document.getElementById('adminGuidesTableBody');

  if (!result.success) {
    tbody.innerHTML = `<tr><td colspan="6">${result.message || 'Failed to load tour guides.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = result.data.map((g) => `
    <tr>
      <td>${g.guide_id}</td>
      <td>${g.name}</td>
      <td>${g.email}</td>
      <td>${g.experience || 0} yrs</td>
      <td>${g.language || '-'}</td>
      <td>
        <span class="availability-badge ${g.availability === 'AVAILABLE' ? 'available' : 'unavailable'}">
          ${g.availability === 'AVAILABLE' ? 'Available' : 'Unavailable'}
        </span>
      </td>
    </tr>
  `).join('');
}

async function loadAdminEvents() {
  const result = await apiRequest('/events');
  const tbody = document.getElementById('adminEventsTableBody');

  if (!result.success) {
    tbody.innerHTML = `<tr><td colspan="6">${result.message || 'Failed to load events.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = result.data.map((ev) => `
    <tr>
      <td>${ev.event_id}</td>
      <td>${ev.event_name}</td>
      <td>${ev.site_name}</td>
      <td>${formatDate(ev.event_date)}</td>
      <td>${ev.event_time || '-'}</td>
      <td class="table-actions">
        <button class="btn btn-outline btn-sm" onclick='openAdminEventModal(${JSON.stringify(ev)})'>Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteAdminEvent(${ev.event_id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function openAdminEventModal(ev) {
  document.getElementById('adminEventModalTitle').textContent = ev ? 'Edit Event' : 'Add Event';
  document.getElementById('adminEventId').value = ev ? ev.event_id : '';

  const siteSelect = document.getElementById('adminEventSiteSelect');
  siteSelect.innerHTML = cachedSites.map((s) => `<option value="${s.site_id}">${s.site_name}</option>`).join('');
  if (ev) siteSelect.value = ev.site_id;

  document.getElementById('adminEventName').value = ev ? ev.event_name : '';
  document.getElementById('adminEventDate').value = ev ? String(ev.event_date).substring(0, 10) : '';
  document.getElementById('adminEventTime').value = ev ? (ev.event_time || '') : '';
  document.getElementById('adminEventDescription').value = ev ? (ev.description || '') : '';

  document.getElementById('adminEventModal').classList.remove('hidden');
}

async function handleAdminEventSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('adminEventId').value;
  const body = {
    site_id: document.getElementById('adminEventSiteSelect').value,
    event_name: document.getElementById('adminEventName').value.trim(),
    event_date: document.getElementById('adminEventDate').value,
    event_time: document.getElementById('adminEventTime').value.trim(),
    description: document.getElementById('adminEventDescription').value.trim()
  };

  const result = id
    ? await apiRequest(`/admin/events/${id}`, { method: 'PUT', body, auth: true })
    : await apiRequest('/admin/events', { method: 'POST', body, auth: true });

  showToast(result.message, result.success ? 'success' : 'error');
  if (result.success) {
    closeModal('adminEventModal');
    loadAdminEvents();
  }
}

async function deleteAdminEvent(eventId) {
  if (!confirm('Delete this event? This cannot be undone.')) return;
  const result = await apiRequest(`/admin/events/${eventId}`, { method: 'DELETE', auth: true });
  showToast(result.message, result.success ? 'success' : 'error');
  loadAdminEvents();
}

async function loadAdminBookings() {
  const result = await apiRequest('/admin/bookings', { auth: true });
  const tbody = document.getElementById('adminBookingsTableBody');

  if (!result.success) {
    tbody.innerHTML = `<tr><td colspan="9">${result.message || 'Failed to load bookings.'}</td></tr>`;
    return;
  }

  if (result.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9">No bookings yet.</td></tr>';
    return;
  }

  tbody.innerHTML = result.data.map((b) => `
    <tr>
      <td>${b.booking_id}</td>
      <td>${b.tourist_name}</td>
      <td>${b.site_name}</td>
      <td>${b.guide_name}</td>
      <td>${formatDate(b.visit_date)}</td>
      <td>${b.number_of_tickets}</td>
      <td>${formatCurrency(b.amount)}</td>
      <td><span class="status-pill ${statusClass(b.booking_status)}">${statusLabel(b.booking_status)}</span></td>
      <td>${statusLabel(b.payment_status)}</td>
    </tr>
  `).join('');
}

async function loadAdminReports() {
  const result = await apiRequest('/admin/reports', { auth: true });
  const container = document.getElementById('adminReportsContent');

  if (!result.success) {
    container.innerHTML = `<p class="empty-state">${result.message || 'Failed to load reports.'}</p>`;
    return;
  }

  const d = result.data;

  const statusRows = d.bookings_by_status.map((s) => `
    <tr><td>${statusLabel(s.status)}</td><td>${s.total}</td></tr>
  `).join('');

  const siteRows = d.bookings_by_site.map((s) => `
    <tr><td>${s.site_name}</td><td>${s.total_bookings}</td></tr>
  `).join('');

  container.innerHTML = `
    <div class="info-card" style="max-width: 320px;">
      <h3>Total Revenue</h3>
      <p style="font-size: 1.6rem; font-weight: 700; color: var(--sandstone);">${formatCurrency(d.total_revenue)}</p>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Booking Status</th><th>Count</th></tr></thead>
          <tbody>${statusRows || '<tr><td colspan="2">No data yet.</td></tr>'}</tbody>
        </table>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Heritage Site</th><th>Bookings</th></tr></thead>
          <tbody>${siteRows || '<tr><td colspan="2">No data yet.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

/* ==================================================
   EVENT LISTENERS / INITIALIZATION
   ================================================== */

document.addEventListener('DOMContentLoaded', () => {
  refreshHeader();

  // ---- Home nav ----
  document.getElementById('brandLogo').addEventListener('click', () => showPage('homeSection'));
  document.getElementById('navHome').addEventListener('click', (e) => { e.preventDefault(); showPage('homeSection'); });
  document.getElementById('navSites').addEventListener('click', (e) => {
    e.preventDefault();
    showPage('homeSection');
    document.getElementById('sitesSection').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('navFeatures').addEventListener('click', (e) => {
    e.preventDefault();
    showPage('homeSection');
    document.getElementById('featuresSection').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('navEvents').addEventListener('click', (e) => {
    e.preventDefault();
    showPage('homeSection');
    document.getElementById('homeEventsSection').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('navLoginBtn').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('heroLoginBtn').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('heroExploreBtn').addEventListener('click', () => {
    document.getElementById('sitesSection').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('heroSearchBtn').addEventListener('click', () => {
    loadHomeSites(document.getElementById('heroSearchInput').value.trim());
    document.getElementById('sitesSection').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('navDashboardBtn').addEventListener('click', () => goToDashboardForRole(getLoggedInUser()));
  document.getElementById('navLogoutBtn').addEventListener('click', logout);

  // ---- Auth modal ----
  document.getElementById('closeAuthModal').addEventListener('click', closeAuthModal);
  document.getElementById('showLoginTab').addEventListener('click', () => setAuthTab('login'));
  document.getElementById('showRegisterTab').addEventListener('click', () => setAuthTab('register'));
  document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);
  document.getElementById('registerForm').addEventListener('submit', handleRegisterSubmit);

  // ---- Site details modal ----
  document.getElementById('closeSiteDetailsModal').addEventListener('click', () => closeModal('siteDetailsModal'));

  // ---- Booking modal ----
  document.getElementById('closeBookingModal').addEventListener('click', () => closeModal('bookingModal'));
  document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
  document.getElementById('bookingSiteSelect').addEventListener('change', recalcBookingAmount);
  document.getElementById('bookingTickets').addEventListener('input', recalcBookingAmount);
  document.getElementById('newBookingBtn').addEventListener('click', () => openBookingModal());
  document.getElementById('quickBookVisitBtn').addEventListener('click', () => openBookingModal());

  // ---- Payment modal ----
  document.getElementById('closePaymentModal').addEventListener('click', () => closeModal('paymentModal'));
  document.getElementById('paymentForm').addEventListener('submit', handlePaymentSubmit);

  // ---- Tourist dashboard nav ----
  document.querySelectorAll('#touristDashboardSection .dashboard-nav-btn[data-tab], #touristDashboardSection .quick-action-btn[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchDashboardTab('touristDashboardSection', btn.dataset.tab));
  });
  document.getElementById('touristLogoutBtn').addEventListener('click', logout);
  document.getElementById('touristSitesSearch').addEventListener('input', (e) => loadTouristSites(e.target.value));
  document.getElementById('feedbackForm').addEventListener('submit', handleFeedbackSubmit);

  // ---- Guide dashboard nav ----
  document.querySelectorAll('#guideDashboardSection .dashboard-nav-btn[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchDashboardTab('guideDashboardSection', btn.dataset.tab));
  });
  document.getElementById('guideLogoutBtn').addEventListener('click', logout);
  document.getElementById('updateAvailabilityBtn').addEventListener('click', handleUpdateAvailability);

  // ---- Admin dashboard nav ----
  document.querySelectorAll('#adminDashboardSection .dashboard-nav-btn[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchDashboardTab('adminDashboardSection', btn.dataset.tab));
  });
  document.getElementById('adminLogoutBtn').addEventListener('click', logout);

  document.getElementById('addSiteBtn').addEventListener('click', () => openAdminSiteModal(null));
  document.getElementById('closeAdminSiteModal').addEventListener('click', () => closeModal('adminSiteModal'));
  document.getElementById('adminSiteForm').addEventListener('submit', handleAdminSiteSubmit);

  document.getElementById('addEventBtn').addEventListener('click', () => openAdminEventModal(null));
  document.getElementById('closeAdminEventModal').addEventListener('click', () => closeModal('adminEventModal'));
  document.getElementById('adminEventForm').addEventListener('submit', handleAdminEventSubmit);

  // ---- Initial data load ----
  loadSitesCache().then(() => loadHomeSites());
  loadGuidesCache();
  loadHomeEvents();

  // ---- Resume session ----
  const user = getLoggedInUser();
  if (user) {
    goToDashboardForRole(user);
  }
});
