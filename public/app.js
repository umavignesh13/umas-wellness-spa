// Aura Wellness Spa Client Logic

// Global Application State
const state = {
  user: null,
  services: [],
  selectedServiceId: null,
  selectedDuration: 30, // Default 30 mins
  selectedTimeSlot: null,
  myBookings: []
};

// DOM Elements Cache
const DOM = {
  // Navigation & Profile
  header: document.getElementById('main-header'),
  navLinkDashboard: document.getElementById('nav-link-dashboard'),
  authContainer: document.getElementById('auth-buttons-container'),
  btnLoginTrigger: document.getElementById('btn-login-trigger'),
  btnSignupTrigger: document.getElementById('btn-signup-trigger'),
  userMenu: document.getElementById('user-profile-menu'),
  userGreeting: document.getElementById('user-greeting-text'),
  btnLogout: document.getElementById('btn-logout'),
  btnMobileMenu: document.getElementById('btn-mobile-menu'),
  navMenu: document.getElementById('nav-menu'),

  // Catalog Section
  filterTabs: document.getElementById('catalog-filter-tabs'),
  catalogGrid: document.getElementById('services-catalog-grid'),

  // Booking Form
  selectService: document.getElementById('select-booking-service'),
  inputDate: document.getElementById('input-booking-date'),
  selectDuration: document.getElementById('select-booking-duration'),

  // Time Slots Selection
  summaryBanner: document.getElementById('booking-summary-banner'),
  summaryName: document.getElementById('summary-service-name'),
  summaryDuration: document.getElementById('summary-service-duration'),
  summaryPrice: document.getElementById('summary-service-price'),
  
  slotsInstructions: document.getElementById('slots-instructions'),
  slotsLoading: document.getElementById('slots-loading'),
  slotsGrid: document.getElementById('time-slots-grid'),
  slotsLegend: document.getElementById('slots-legend'),
  btnSubmitBooking: document.getElementById('btn-submit-booking'),

  // User Dashboard
  dashboardSection: document.getElementById('dashboard-section'),
  dashboardClientName: document.getElementById('dashboard-client-name'),
  dashboardClientEmail: document.getElementById('dashboard-client-email'),
  btnDashboardRefresh: document.getElementById('btn-dashboard-refresh'),
  bookingsContainer: document.getElementById('bookings-list-container'),

  // Auth Modals
  authModal: document.getElementById('auth-modal'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  loginView: document.getElementById('auth-login-view'),
  signupView: document.getElementById('auth-signup-view'),
  formLogin: document.getElementById('form-login'),
  formSignup: document.getElementById('form-signup'),
  loginIdInput: document.getElementById('input-login-id'),
  loginPasswordInput: document.getElementById('input-login-password'),
  signupUsernameInput: document.getElementById('input-signup-username'),
  signupEmailInput: document.getElementById('input-signup-email'),
  signupPhoneInput: document.getElementById('input-signup-phone'),
  signupPasswordInput: document.getElementById('input-signup-password'),
  loginErrorAlert: document.getElementById('login-error-alert'),
  signupErrorAlert: document.getElementById('signup-error-alert'),
  linkSwitchSignup: document.getElementById('link-switch-signup'),
  linkSwitchLogin: document.getElementById('link-switch-login'),

  // Feedback Toast
  toastMessage: document.getElementById('toast-message'),
  toastText: document.getElementById('toast-text')
};

// ----------------------------------------
// APP INITIALIZATION
// ----------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  setupDateConstraints();
  setupEventListeners();
  
  // 1. Load active user session
  await checkUserSession();
  
  // 2. Fetch service catalog
  await fetchServices();
});

// Setup date boundaries (starts today, ends in 30 days)
function setupDateConstraints() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  
  const minDate = `${yyyy}-${mm}-${dd}`;
  DOM.inputDate.setAttribute('min', minDate);

  const maxDateObj = new Date();
  maxDateObj.setDate(today.getDate() + 30);
  const max_yyyy = maxDateObj.getFullYear();
  const max_mm = String(maxDateObj.getMonth() + 1).padStart(2, '0');
  const max_dd = String(maxDateObj.getDate()).padStart(2, '0');
  
  const maxDate = `${max_yyyy}-${max_mm}-${max_dd}`;
  DOM.inputDate.setAttribute('max', maxDate);
}

// Check if user is logged in
async function checkUserSession() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      loginUserSession(data.user);
    } else {
      logoutUserSession();
    }
  } catch (err) {
    console.error('Session check failed:', err);
    logoutUserSession();
  }
}

// Log in user on the UI
function loginUserSession(user) {
  state.user = user;
  
  // Update Header UI
  DOM.btnLoginTrigger.classList.add('hidden');
  DOM.btnSignupTrigger.classList.add('hidden');
  DOM.userGreeting.innerText = `Hello, ${user.username}`;
  DOM.userMenu.classList.remove('hidden');
  DOM.navLinkDashboard.classList.remove('hidden');

  // Update Dashboard Profile
  DOM.dashboardClientName.innerText = user.username;
  DOM.dashboardClientEmail.innerText = user.email;
  DOM.dashboardSection.classList.remove('hidden');

  // Load user reservations
  fetchUserBookings();
}

// Log out user on the UI
function logoutUserSession() {
  state.user = null;
  
  DOM.btnLoginTrigger.classList.remove('hidden');
  DOM.btnSignupTrigger.classList.remove('hidden');
  DOM.userMenu.classList.add('hidden');
  DOM.navLinkDashboard.classList.add('hidden');
  DOM.dashboardSection.classList.add('hidden');
  
  // Disable book confirm button if logged out
  DOM.btnSubmitBooking.innerText = 'Sign In to Reserve';
  DOM.btnSubmitBooking.removeAttribute('disabled');
}

// Fetch signature services from backend API
async function fetchServices() {
  try {
    const res = await fetch('/api/services');
    if (res.ok) {
      state.services = await res.json();
      renderCatalog('all');
      populateServiceDropdown();
    } else {
      DOM.catalogGrid.innerHTML = `<div class="slots-message text-danger"><i class="fa-solid fa-circle-exclamation"></i> Error loading spa catalog.</div>`;
    }
  } catch (err) {
    console.error('Services fetch error:', err);
    DOM.catalogGrid.innerHTML = `<div class="slots-message text-danger"><i class="fa-solid fa-triangle-exclamation"></i> Offline: Failed to fetch spa services.</div>`;
  }
}

// ----------------------------------------
// RENDERING LOGIC
// ----------------------------------------

// Render the catalog grids
function renderCatalog(filter = 'all') {
  DOM.catalogGrid.innerHTML = '';
  
  const filtered = state.services.filter(s => filter === 'all' || s.category === filter);
  
  if (filtered.length === 0) {
    DOM.catalogGrid.innerHTML = `<div class="slots-message">No signature massages found in this category.</div>`;
    return;
  }

  filtered.forEach(s => {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.innerHTML = `
      <div class="service-img-wrapper">
        <img src="${s.image_path}" alt="${s.name}" class="service-img" onerror="this.src='https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500'">
        <span class="service-category-badge ${s.category.toLowerCase()}">${s.category}</span>
      </div>
      <div class="service-body">
        <h3 class="service-title">${s.name}</h3>
        <div class="service-meta">
          <span class="service-price">₹${s.price.toFixed(2)}</span>
          <span class="service-duration"><i class="fa-regular fa-clock"></i> 30+ Mins</span>
        </div>
        <p class="service-desc">${s.description}</p>
        <button class="btn btn-outline btn-block select-service-btn" data-id="${s.id}">Select & Book</button>
      </div>
    `;
    DOM.catalogGrid.appendChild(card);
  });

  // Bind click events to 'Select & Book' buttons
  document.querySelectorAll('.select-service-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sId = parseInt(e.target.dataset.id);
      selectServiceForBooking(sId);
      // Scroll to booking console
      document.getElementById('booking-section').scrollIntoView({ behavior: 'smooth' });
    });
  });
}

// Populate Treatment Select input
function populateServiceDropdown() {
  DOM.selectService.innerHTML = '<option value="" disabled selected>Select a massage therapy...</option>';
  state.services.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.innerText = `${s.name} (₹${s.price.toFixed(2)})`;
    DOM.selectService.appendChild(opt);
  });
}

// Auto-select a service from catalog click
function selectServiceForBooking(serviceId) {
  state.selectedServiceId = serviceId;
  DOM.selectService.value = serviceId;
  updateBookingSummary();
  triggerSlotsRefresh();
}

// Update the booking details card summary
function updateBookingSummary() {
  const service = state.services.find(s => s.id === state.selectedServiceId);
  if (!service) {
    DOM.summaryBanner.classList.add('hidden');
    return;
  }

  // Calculate pricing based on selected duration: first 30 mins is base price, each extra 30 mins adds 60% of base price
  const basePrice = service.price;
  const intervals = state.selectedDuration / 30;
  const actualPrice = basePrice * (1 + (intervals - 1) * 0.6);

  DOM.summaryName.innerText = service.name;
  DOM.summaryDuration.innerText = `${state.selectedDuration} Minutes`;
  DOM.summaryPrice.innerText = `₹${actualPrice.toFixed(2)}`;
  
  DOM.summaryBanner.classList.remove('hidden');
}

// Trigger availability check when form details change
function triggerSlotsRefresh() {
  const serviceId = DOM.selectService.value;
  const date = DOM.inputDate.value;
  const duration = state.selectedDuration;

  if (!serviceId || !date) {
    DOM.slotsInstructions.classList.remove('hidden');
    DOM.slotsLoading.classList.add('hidden');
    DOM.slotsGrid.classList.add('hidden');
    DOM.slotsLegend.classList.add('hidden');
    DOM.btnSubmitBooking.classList.add('hidden');
    return;
  }

  fetchAvailableSlots(serviceId, date, duration);
}

// Fetch available slots from Express server API
async function fetchAvailableSlots(serviceId, date, duration) {
  DOM.slotsInstructions.classList.add('hidden');
  DOM.slotsLoading.classList.remove('hidden');
  DOM.slotsGrid.classList.add('hidden');
  DOM.slotsLegend.classList.add('hidden');
  DOM.btnSubmitBooking.classList.add('hidden');
  
  state.selectedTimeSlot = null;
  DOM.btnSubmitBooking.setAttribute('disabled', 'true');

  try {
    const res = await fetch(`/api/bookings/available-slots?serviceId=${serviceId}&date=${date}&duration=${duration}`);
    if (res.ok) {
      const slots = await res.json();
      renderTimeSlots(slots);
    } else {
      DOM.slotsLoading.classList.add('hidden');
      DOM.slotsInstructions.innerText = 'Error loading slots. Please try changing your date selection.';
      DOM.slotsInstructions.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Error fetching slots:', err);
    DOM.slotsLoading.classList.add('hidden');
    DOM.slotsInstructions.innerText = 'System offline. Check connection.';
    DOM.slotsInstructions.classList.remove('hidden');
  }
}

// Render the timeslots buttons grid
function renderTimeSlots(slots) {
  DOM.slotsLoading.classList.add('hidden');
  DOM.slotsGrid.innerHTML = '';

  if (slots.length === 0) {
    DOM.slotsInstructions.innerText = 'No scheduling options available for the selected duration.';
    DOM.slotsInstructions.classList.remove('hidden');
    return;
  }

  slots.forEach(slot => {
    const btn = document.createElement('button');
    btn.className = 'slot-btn';
    btn.type = 'button';
    btn.innerText = formatTimeLabel(slot.time);
    
    if (!slot.available) {
      btn.classList.add('booked');
      btn.setAttribute('disabled', 'true');
    } else {
      btn.addEventListener('click', () => {
        // Clear active buttons
        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedTimeSlot = slot.time;
        
        // Activate confirm booking CTA
        DOM.btnSubmitBooking.removeAttribute('disabled');
      });
    }
    DOM.slotsGrid.appendChild(btn);
  });

  DOM.slotsGrid.classList.remove('hidden');
  DOM.slotsLegend.classList.remove('hidden');
  DOM.btnSubmitBooking.classList.remove('hidden');

  // If user is logged out, the booking submit acts as login prompt
  if (!state.user) {
    DOM.btnSubmitBooking.removeAttribute('disabled');
    DOM.btnSubmitBooking.innerText = 'Sign In to Book Session';
  } else {
    DOM.btnSubmitBooking.innerText = 'Confirm Reservation';
  }
}

// Helper: Format 24H string to readable 12H format
function formatTimeLabel(time24) {
  const [hours, minutes] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

// Fetch user's booking history for dashboard
async function fetchUserBookings() {
  if (!state.user) return;
  
  DOM.bookingsContainer.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Refreshing reservations list...</div>`;

  try {
    const res = await fetch('/api/bookings/my');
    if (res.ok) {
      state.myBookings = await res.json();
      renderMyBookings();
    } else {
      DOM.bookingsContainer.innerHTML = `<div class="slots-message text-danger">Failed to retrieve bookings history.</div>`;
    }
  } catch (err) {
    console.error('Error fetching bookings:', err);
    DOM.bookingsContainer.innerHTML = `<div class="slots-message text-danger">Offline: Cannot reload bookings.</div>`;
  }
}

// Render scheduled sessions table
function renderMyBookings() {
  if (state.myBookings.length === 0) {
    DOM.bookingsContainer.innerHTML = `
      <div class="empty-bookings-state">
        <i class="fa-regular fa-calendar-times"></i>
        <p>You have no spa sessions booked yet.</p>
        <a href="#booking-section" class="btn btn-outline" style="margin-top:16px;">Book First Session</a>
      </div>
    `;
    return;
  }

  let html = `
    <table class="bookings-table">
      <thead>
        <tr>
          <th>Treatment</th>
          <th>Category</th>
          <th>Date</th>
          <th>Time</th>
          <th>Duration</th>
          <th>Price</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  state.myBookings.forEach(b => {
    // Re-calculate price for session duration scaling
    const intervals = b.duration / 30;
    const finalPrice = b.service_price * (1 + (intervals - 1) * 0.6);
    
    html += `
      <tr>
        <td style="font-weight:600;">${b.service_name}</td>
        <td><span class="booking-category-tag ${b.service_category.toLowerCase()}">${b.service_category}</span></td>
        <td>${formatDate(b.booking_date)}</td>
        <td style="font-weight:500; color:var(--primary);">${formatTimeLabel(b.booking_time)}</td>
        <td>${b.duration} Minutes</td>
        <td style="font-weight:600; color:var(--primary);">₹${finalPrice.toFixed(2)}</td>
        <td>
          <button class="btn btn-danger btn-cancel-booking" data-id="${b.id}" aria-label="Cancel session"><i class="fa-regular fa-trash-can"></i> Cancel</button>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  DOM.bookingsContainer.innerHTML = html;

  // Bind cancel operations
  document.querySelectorAll('.btn-cancel-booking').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const bId = e.currentTarget.dataset.id;
      if (confirm('Are you sure you want to cancel this scheduled massage session?')) {
        await cancelBooking(bId);
      }
    });
  });
}

// Format Date from YYYY-MM-DD to readable date
function formatDate(dateStr) {
  const [yyyy, mm, dd] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(mm) - 1]} ${parseInt(dd)}, ${yyyy}`;
}

// ----------------------------------------
// ACTION OPERATIONS (APIs)
// ----------------------------------------

// Cancel booking via API
async function cancelBooking(id) {
  try {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      showToast('Booking cancelled successfully.');
      await fetchUserBookings();
      triggerSlotsRefresh(); // Refresh slots grid to free up slot immediately
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to cancel reservation.');
    }
  } catch (err) {
    console.error('Cancel booking error:', err);
    alert('System error. Check connection.');
  }
}

// Submit a new booking
async function submitBookingReservation() {
  if (!state.user) {
    openAuthModal('login');
    return;
  }

  const serviceId = parseInt(DOM.selectService.value);
  const bookingDate = DOM.inputDate.value;
  const bookingTime = state.selectedTimeSlot;
  const duration = state.selectedDuration;

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ serviceId, bookingDate, bookingTime, duration })
    });

    if (res.ok) {
      showToast('Session booked successfully!');
      
      // Reset time selection
      state.selectedTimeSlot = null;
      
      // Update UI panels
      triggerSlotsRefresh();
      await fetchUserBookings();

      // Scroll to dashboard area
      DOM.dashboardSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to book slot.');
    }
  } catch (err) {
    console.error('Booking confirmation failed:', err);
    alert('System failure. Please check connection and try again.');
  }
}

// ----------------------------------------
// DOM EVENT LISTENERS SETUP
// ----------------------------------------
function setupEventListeners() {
  // Navigation active state tracker
  const sections = document.querySelectorAll('section');
  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPos = window.scrollY + 100;
    
    sections.forEach(s => {
      const top = s.offsetTop;
      const height = s.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        current = s.getAttribute('id');
      }
    });

    document.querySelectorAll('.nav-item').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  // Mobile Menu toggle
  DOM.btnMobileMenu.addEventListener('click', () => {
    DOM.navMenu.classList.toggle('active');
    const isActive = DOM.navMenu.classList.contains('active');
    DOM.btnMobileMenu.innerHTML = isActive ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
  });

  // Close Mobile Menu on clicking link
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      DOM.navMenu.classList.remove('active');
      DOM.btnMobileMenu.innerHTML = '<i class="fa-solid fa-bars"></i>';
    });
  });

  // Catalog Filters Toggles
  DOM.filterTabs.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-tab')) {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      renderCatalog(e.target.dataset.filter);
    }
  });

  // Booking Form events
  DOM.selectService.addEventListener('change', (e) => {
    state.selectedServiceId = parseInt(e.target.value);
    updateBookingSummary();
    triggerSlotsRefresh();
  });

  DOM.inputDate.addEventListener('change', () => {
    triggerSlotsRefresh();
  });

  // Duration selector change
  DOM.selectDuration.addEventListener('change', (e) => {
    state.selectedDuration = parseInt(e.target.value);
    updateBookingSummary();
    triggerSlotsRefresh();
  });

  // Final confirmation action
  DOM.btnSubmitBooking.addEventListener('click', submitBookingReservation);

  // Refresh bookings list
  DOM.btnDashboardRefresh.addEventListener('click', fetchUserBookings);

  // Auth triggers
  DOM.btnLoginTrigger.addEventListener('click', () => openAuthModal('login'));
  DOM.btnSignupTrigger.addEventListener('click', () => openAuthModal('signup'));
  DOM.btnCloseModal.addEventListener('click', closeAuthModal);
  DOM.linkSwitchSignup.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('signup');
  });
  DOM.linkSwitchLogin.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('login');
  });

  // Modal backdrop click closes modal
  DOM.authModal.addEventListener('click', (e) => {
    if (e.target === DOM.authModal) {
      closeAuthModal();
    }
  });

  // Form Submissions
  DOM.formLogin.addEventListener('submit', handleLoginSubmit);
  DOM.formSignup.addEventListener('submit', handleSignupSubmit);

  // Logout trigger
  DOM.btnLogout.addEventListener('click', handleLogoutClick);
}

// ----------------------------------------
// MODAL & AUTHENTICATION HANDLERS
// ----------------------------------------
function openAuthModal(view = 'login') {
  DOM.authModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Stop background scrolling
  
  DOM.loginErrorAlert.classList.add('hidden');
  DOM.signupErrorAlert.classList.add('hidden');

  if (view === 'login') {
    DOM.signupView.classList.add('hidden');
    DOM.loginView.classList.remove('hidden');
    DOM.loginIdInput.focus();
  } else {
    DOM.loginView.classList.add('hidden');
    DOM.signupView.classList.remove('hidden');
    DOM.signupUsernameInput.focus();
  }
}

function closeAuthModal() {
  DOM.authModal.classList.add('hidden');
  document.body.style.overflow = ''; // Restore background scrolling
  DOM.formLogin.reset();
  DOM.formSignup.reset();
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  DOM.loginErrorAlert.classList.add('hidden');
  
  const loginId = DOM.loginIdInput.value;
  const password = DOM.loginPasswordInput.value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ loginId, password })
    });

    if (res.ok) {
      const data = await res.json();
      loginUserSession(data.user);
      showToast(`Welcome back, ${data.user.username}!`);
      closeAuthModal();
      triggerSlotsRefresh(); // Update slots submit action dynamically
    } else {
      const err = await res.json();
      DOM.loginErrorAlert.innerText = err.error || 'Invalid credentials.';
      DOM.loginErrorAlert.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Login submit error:', err);
    DOM.loginErrorAlert.innerText = 'Network error. Please try again.';
    DOM.loginErrorAlert.classList.remove('hidden');
  }
}

async function handleSignupSubmit(e) {
  e.preventDefault();
  DOM.signupErrorAlert.classList.add('hidden');

  const username = DOM.signupUsernameInput.value;
  const email = DOM.signupEmailInput.value;
  const phone = DOM.signupPhoneInput.value;
  const password = DOM.signupPasswordInput.value;

  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, phone, password })
    });

    if (res.ok) {
      const data = await res.json();
      loginUserSession(data.user);
      showToast('Registration successful! Profile active.');
      closeAuthModal();
      triggerSlotsRefresh();
    } else {
      const err = await res.json();
      DOM.signupErrorAlert.innerText = err.error || 'Registration failed.';
      DOM.signupErrorAlert.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Signup submit error:', err);
    DOM.signupErrorAlert.innerText = 'Network error. Please try again.';
    DOM.signupErrorAlert.classList.remove('hidden');
  }
}

async function handleLogoutClick() {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) {
      logoutUserSession();
      showToast('Logged out successfully.');
      triggerSlotsRefresh();
      // Scroll to Home
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert('Logout failed. Try again.');
    }
  } catch (err) {
    console.error('Logout error:', err);
    alert('System issue during logout.');
  }
}

// ----------------------------------------
// FEEDBACK UTILITIES
// ----------------------------------------
function showToast(message) {
  DOM.toastText.innerText = message;
  DOM.toastMessage.classList.remove('hidden');
  
  setTimeout(() => {
    DOM.toastMessage.classList.add('hidden');
  }, 4000);
}
