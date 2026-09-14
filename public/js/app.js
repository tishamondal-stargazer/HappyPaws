/**
 * HappyPaws - Tisha Mondal Sanctuary Edition
 * Full-Stack SPA Client Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    currentUser: null,
    pets: [],
    requests: [],
    medicalLogs: [],
    inventory: [],
    donations: [],
    shelterProfile: {},
    stats: {
      totalPets: 0,
      totalAdoptions: 0,
      pendingRequests: 0,
      availablePets: 0,
      lowStockCount: 0,
      totalDonations: 0
    },
    activeView: 'dashboard',
    searchQuery: '',
    selectedSpecies: 'All',
    selectedStatus: 'All',
    editingPetId: null,
    deletingPetId: null,
    darkMode: localStorage.getItem('happypaws_theme') === 'dark'
  };

  // DOM Elements
  const elements = {
    // Theme & Auth
    body: document.body,
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    loginScreen: document.getElementById('login-screen'),
    appScreen: document.getElementById('app-screen'),
    loginForm: document.getElementById('login-form'),
    usernameInput: document.getElementById('login-username'),
    passwordInput: document.getElementById('login-password'),
    loginError: document.getElementById('login-error'),
    loginErrorText: document.getElementById('login-error-text'),
    btnFillDemo: document.getElementById('btn-fill-demo'),
    btnLogout: document.getElementById('btn-logout'),
    userAvatar: document.getElementById('user-avatar'),
    userDisplayName: document.getElementById('user-display-name'),
    userDisplayRole: document.getElementById('user-display-role'),

    // Global Header Bar
    globalSearchInput: document.getElementById('global-search-input'),
    btnNotifToggle: document.getElementById('btn-notif-toggle'),
    notifDropdown: document.getElementById('notif-dropdown'),
    notifCount: document.getElementById('notif-count'),
    btnClearNotif: document.getElementById('btn-clear-notif'),

    // Navigation & Views
    navItems: document.querySelectorAll('.nav-item'),
    pageTitle: document.getElementById('page-title'),
    views: {
      dashboard: document.getElementById('view-dashboard'),
      pets: document.getElementById('view-pets'),
      requests: document.getElementById('view-requests'),
      medical: document.getElementById('view-medical'),
      inventory: document.getElementById('view-inventory'),
      donations: document.getElementById('view-donations'),
      shelter: document.getElementById('view-shelter')
    },

    // Dashboard Stats & Chart
    statTotalPets: document.getElementById('stat-total-pets'),
    statTotalAdoptions: document.getElementById('stat-total-adoptions'),
    statPendingRequests: document.getElementById('stat-pending-requests'),
    statAvailablePets: document.getElementById('stat-available-pets'),
    speciesDonutSvg: document.getElementById('species-donut-svg'),
    donutLegend: document.getElementById('donut-legend'),
    activityFeed: document.getElementById('activity-feed-container'),
    btnQuickAddPet: document.getElementById('btn-quick-add-pet'),

    // Pets Toolbar & Grid
    searchBar: document.getElementById('pet-search-input'),
    speciesFilter: document.getElementById('species-filter'),
    statusFilter: document.getElementById('status-filter'),
    btnOpenAddModal: document.getElementById('btn-open-add-modal'),
    petsContainer: document.getElementById('pets-container'),

    // Tables
    requestsTableBody: document.getElementById('requests-table-body'),
    medicalTableBody: document.getElementById('medical-table-body'),
    inventoryTableBody: document.getElementById('inventory-table-body'),
    donationsTableBody: document.getElementById('donations-table-body'),
    shelterProfileForm: document.getElementById('shelter-profile-form'),

    // Pet Modal (Add/Edit)
    petModal: document.getElementById('pet-modal'),
    petModalTitle: document.getElementById('pet-modal-title'),
    petForm: document.getElementById('pet-form'),
    formMode: document.getElementById('form-mode'),
    petIdInput: document.getElementById('pet-id-input'),
    petNameInput: document.getElementById('pet-name-input'),
    petSpeciesInput: document.getElementById('pet-species-input'),
    petBreedInput: document.getElementById('pet-breed-input'),
    petAgeInput: document.getElementById('pet-age-input'),
    petGenderInput: document.getElementById('pet-gender-input'),
    petStatusInput: document.getElementById('pet-status-input'),
    petVaccinatedInput: document.getElementById('pet-vaccinated-input'),
    petNotesInput: document.getElementById('pet-notes-input'),
    btnClosePetModal: document.getElementById('btn-close-pet-modal'),
    btnCancelPetModal: document.getElementById('btn-cancel-pet-modal'),

    // Delete Modal
    deleteModal: document.getElementById('delete-modal'),
    deletePetNameDisplay: document.getElementById('delete-pet-name-display'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete'),
    btnCloseDeleteModal: document.getElementById('btn-close-delete-modal'),
    btnCancelDelete: document.getElementById('btn-cancel-delete'),

    // Toasts
    toastContainer: document.getElementById('toast-container')
  };

  // ----------------------------------------------------
  // INITIALIZATION & THEME SETTINGS
  // ----------------------------------------------------
  function init() {
    applyTheme();
    checkSavedAuth();
    attachEventListeners();
  }

  function applyTheme() {
    if (state.darkMode) {
      elements.body.classList.add('dark-mode');
      elements.themeIcon.className = 'fa-solid fa-sun';
    } else {
      elements.body.classList.remove('dark-mode');
      elements.themeIcon.className = 'fa-solid fa-moon';
    }
  }

  function toggleTheme() {
    state.darkMode = !state.darkMode;
    localStorage.setItem('happypaws_theme', state.darkMode ? 'dark' : 'light');
    applyTheme();
  }

  function checkSavedAuth() {
    const savedUser = localStorage.getItem('happypaws_user');
    if (savedUser) {
      state.currentUser = JSON.parse(savedUser);
      // Enforce Tisha Mondal branding
      if (state.currentUser.username === 'admin@happypaws.com') {
        state.currentUser.name = 'Tisha Mondal';
      }
      showAppScreen();
    } else {
      showLoginScreen();
    }
  }

  function showLoginScreen() {
    elements.loginScreen.classList.remove('hidden');
    elements.appScreen.classList.add('hidden');
  }

  function showAppScreen() {
    elements.loginScreen.classList.add('hidden');
    elements.appScreen.classList.remove('hidden');

    if (state.currentUser) {
      elements.userDisplayName.textContent = state.currentUser.name || 'Tisha Mondal';
      elements.userDisplayRole.textContent = state.currentUser.role || 'Shelter Administrator';
      elements.userAvatar.textContent = 'TM';
    }

    loadAllData();
  }

  // ----------------------------------------------------
  // API HELPERS
  // ----------------------------------------------------
  async function apiRequest(url, method = 'GET', data = null) {
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (data) {
        options.body = JSON.stringify(data);
      }
      const response = await fetch(url, options);
      return await response.json();
    } catch (err) {
      console.error(`API Error on ${url}:`, err);
      showToast('Network error connecting to server.', 'error');
      return { success: false, message: 'Server connection failed.' };
    }
  }

  async function loadAllData() {
    await Promise.all([
      fetchDashboardStats(),
      fetchPets(),
      fetchAdoptionRequests(),
      fetchMedicalLogs(),
      fetchInventory(),
      fetchDonations(),
      fetchShelterProfile()
    ]);
    renderCurrentView();
  }

  async function fetchDashboardStats() {
    const res = await apiRequest('/api/stats');
    if (res.success) {
      state.stats = res.stats;
      updateDashboardStatsUI();
    }
  }

  async function fetchPets() {
    const query = new URLSearchParams({
      search: state.searchQuery,
      species: state.selectedSpecies,
      status: state.selectedStatus
    });
    const res = await apiRequest(`/api/pets?${query.toString()}`);
    if (res.success) {
      state.pets = res.pets;
      renderPetsGrid();
      renderDoughnutChart();
      renderActivityFeed();
    }
  }

  async function fetchAdoptionRequests() {
    const res = await apiRequest('/api/requests');
    if (res.success) {
      state.requests = res.requests;
      renderRequestsTable();
    }
  }

  async function fetchMedicalLogs() {
    const res = await apiRequest('/api/medical');
    if (res.success) {
      state.medicalLogs = res.medicalLogs;
      renderMedicalTable();
    }
  }

  async function fetchInventory() {
    const res = await apiRequest('/api/inventory');
    if (res.success) {
      state.inventory = res.inventory;
      renderInventoryTable();
    }
  }

  async function fetchDonations() {
    const res = await apiRequest('/api/donations');
    if (res.success) {
      state.donations = res.donations;
      renderDonationsTable();
    }
  }

  async function fetchShelterProfile() {
    const res = await apiRequest('/api/shelter');
    if (res.success) {
      state.shelterProfile = res.shelter;
    }
  }

  // ----------------------------------------------------
  // DASHBOARD & DYNAMIC SVG DOUGHNUT CHART
  // ----------------------------------------------------
  function updateDashboardStatsUI() {
    elements.statTotalPets.textContent = state.stats.totalPets;
    elements.statTotalAdoptions.textContent = state.stats.totalAdoptions;
    elements.statPendingRequests.textContent = state.stats.pendingRequests;
    elements.statAvailablePets.textContent = state.stats.availablePets;
  }

  function renderDoughnutChart() {
    if (!elements.speciesDonutSvg || !elements.donutLegend) return;

    const total = state.pets.length || 1;
    const available = state.pets.filter(p => p.adoptionStatus === 'Available').length;
    const pending = state.pets.filter(p => p.adoptionStatus === 'Pending').length;
    const adopted = state.pets.filter(p => p.adoptionStatus === 'Adopted').length;

    const pAvail = (available / total) * 100;
    const pPend = (pending / total) * 100;
    const pAdopt = (adopted / total) * 100;

    // Build SVG stroke-dasharray values
    // Circumference = 2 * PI * r = 2 * 3.14159 * 15.9155 ≈ 100
    const availDash = `${pAvail} ${100 - pAvail}`;
    const pendDash = `${pPend} ${100 - pPend}`;
    const adoptDash = `${pAdopt} ${100 - pAdopt}`;

    const pendOffset = 100 - pAvail;
    const adoptOffset = 100 - pAvail - pPend;

    elements.speciesDonutSvg.innerHTML = `
      <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--bg-surface-secondary)" stroke-width="5" />
      <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#10b981" stroke-width="5" stroke-dasharray="${availDash}" stroke-dashoffset="0" />
      <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#f59e0b" stroke-width="5" stroke-dasharray="${pendDash}" stroke-dashoffset="${pendOffset}" />
      <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#64748b" stroke-width="5" stroke-dasharray="${adoptDash}" stroke-dashoffset="${adoptOffset}" />
      <text x="21" y="23" text-anchor="middle" font-size="6.5" font-weight="bold" fill="var(--text-main)" transform="rotate(90 21 21)">${total} Pets</text>
    `;

    elements.donutLegend.innerHTML = `
      <div class="legend-item"><span class="legend-color" style="background-color: #10b981;"></span> Available: ${available} (${Math.round(pAvail)}%)</div>
      <div class="legend-item"><span class="legend-color" style="background-color: #f59e0b;"></span> Pending: ${pending} (${Math.round(pPend)}%)</div>
      <div class="legend-item"><span class="legend-color" style="background-color: #64748b;"></span> Adopted: ${adopted} (${Math.round(pAdopt)}%)</div>
    `;
  }

  function renderActivityFeed() {
    if (!elements.activityFeed) return;
    elements.activityFeed.innerHTML = '';

    const recent = state.pets.slice(0, 4);
    if (recent.length === 0) {
      elements.activityFeed.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No recent records.</p>`;
      return;
    }

    recent.forEach(pet => {
      const item = document.createElement('div');
      item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 10px; background: var(--bg-surface-secondary); border-radius: var(--radius-md); font-size: 13px;';
      
      let badgeClass = 'badge-available';
      if (pet.adoptionStatus === 'Adopted') badgeClass = 'badge-adopted';
      if (pet.adoptionStatus === 'Pending') badgeClass = 'badge-pending';

      item.innerHTML = `
        <div>
          <strong>${pet.name}</strong> (${pet.species} • ${pet.breed})
          <div style="font-size: 11.5px; color: var(--text-muted);">${pet.age} • Vaccinated: ${pet.vaccinated ? 'Yes' : 'No'}</div>
        </div>
        <span class="badge ${badgeClass}">${pet.adoptionStatus}</span>
      `;
      elements.activityFeed.appendChild(item);
    });
  }

  // ----------------------------------------------------
  // PETS MANAGEMENT RENDERER
  // ----------------------------------------------------
  function renderPetsGrid() {
    elements.petsContainer.innerHTML = '';

    if (state.pets.length === 0) {
      elements.petsContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 48px; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
          <i class="fa-solid fa-paw" style="font-size: 40px; color: var(--text-light); margin-bottom: 12px;"></i>
          <h4>No Pets Found</h4>
          <p style="color: var(--text-muted); font-size: 13px;">Try adjusting your search criteria or register a new pet.</p>
        </div>
      `;
      return;
    }

    state.pets.forEach(pet => {
      const card = document.createElement('div');
      card.className = 'pet-card';

      let speciesIcon = 'fa-paw';
      if (pet.species === 'Dog') speciesIcon = 'fa-dog';
      else if (pet.species === 'Cat') speciesIcon = 'fa-cat';
      else if (pet.species === 'Rabbit') speciesIcon = 'fa-feather';

      let statusBadgeClass = 'badge-available';
      if (pet.adoptionStatus === 'Adopted') statusBadgeClass = 'badge-adopted';
      else if (pet.adoptionStatus === 'Pending') statusBadgeClass = 'badge-pending';

      card.innerHTML = `
        <div class="pet-card-header">
          <div class="pet-avatar">
            <i class="fa-solid ${speciesIcon}"></i>
          </div>
          <span class="pet-tag-id">${pet.id}</span>
        </div>
        <div class="pet-card-body">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div class="pet-name">${pet.name}</div>
            <span class="badge ${statusBadgeClass}">${pet.adoptionStatus}</span>
          </div>

          <div class="pill-tags-wrapper">
            <span class="tag-chip"><i class="fa-solid fa-layer-group"></i> ${pet.species}</span>
            <span class="tag-chip"><i class="fa-solid fa-dna"></i> ${pet.breed}</span>
            <span class="tag-chip"><i class="fa-solid fa-hourglass-half"></i> ${pet.age}</span>
            <span class="tag-chip"><i class="fa-solid fa-venus-mars"></i> ${pet.gender}</span>
          </div>

          <div style="font-size: 12.5px; font-weight: 600; color: ${pet.vaccinated ? 'var(--status-available)' : 'var(--status-danger)'};">
            <i class="fa-solid ${pet.vaccinated ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
            ${pet.vaccinated ? 'Vaccines Up to Date' : 'Vaccination Needed'}
          </div>

          ${pet.notes ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 8px; font-style: italic;">"${pet.notes}"</div>` : ''}
        </div>
        <div class="pet-card-footer">
          <button class="btn-action-sm btn-edit" data-id="${pet.id}">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button class="btn-action-sm btn-delete" data-id="${pet.id}" data-name="${pet.name}">
            <i class="fa-solid fa-trash-can"></i> Delete
          </button>
        </div>
      `;

      elements.petsContainer.appendChild(card);
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => openEditPetModal(e.currentTarget.dataset.id));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => openDeletePetModal(e.currentTarget.dataset.id, e.currentTarget.dataset.name));
    });
  }

  // ----------------------------------------------------
  // MODULE TABLES RENDERERS
  // ----------------------------------------------------
  function renderRequestsTable() {
    elements.requestsTableBody.innerHTML = '';
    if (state.requests.length === 0) {
      elements.requestsTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No adoption applications submitted.</td></tr>`;
      return;
    }

    state.requests.forEach(req => {
      const tr = document.createElement('tr');
      let badgeClass = 'badge-pending';
      if (req.status === 'Approved') badgeClass = 'badge-available';
      if (req.status === 'Rejected') badgeClass = 'badge-adopted';

      tr.innerHTML = `
        <td><strong>${req.id}</strong></td>
        <td><strong style="color: var(--primary-600);">${req.petName}</strong> (${req.petId})</td>
        <td>${req.applicantName}</td>
        <td>${req.applicantEmail}</td>
        <td>${req.requestDate ? new Date(req.requestDate).toLocaleDateString() : 'N/A'}</td>
        <td><span class="badge ${badgeClass}">${req.status}</span></td>
        <td style="text-align: right;">
          ${req.status === 'Pending' ? `
            <button class="btn-action-sm btn-edit btn-approve-req" data-id="${req.id}" style="display: inline-flex; width: auto; margin-right: 6px; background-color: var(--status-available-bg); color: var(--status-available);">
              <i class="fa-solid fa-check"></i> Approve
            </button>
            <button class="btn-action-sm btn-delete btn-reject-req" data-id="${req.id}" style="display: inline-flex; width: auto;">
              <i class="fa-solid fa-xmark"></i> Reject
            </button>
          ` : `<span style="font-size: 12px; color: var(--text-light);">Completed</span>`}
        </td>
      `;
      elements.requestsTableBody.appendChild(tr);
    });

    document.querySelectorAll('.btn-approve-req').forEach(btn => {
      btn.addEventListener('click', (e) => handleUpdateRequestStatus(e.currentTarget.dataset.id, 'Approved'));
    });
    document.querySelectorAll('.btn-reject-req').forEach(btn => {
      btn.addEventListener('click', (e) => handleUpdateRequestStatus(e.currentTarget.dataset.id, 'Rejected'));
    });
  }

  async function handleUpdateRequestStatus(requestId, newStatus) {
    const res = await apiRequest(`/api/requests/${requestId}`, 'PUT', { status: newStatus });
    if (res.success) {
      showToast(`Adoption Application ${requestId} ${newStatus}!`, 'success');
      loadAllData();
    }
  }

  function renderMedicalTable() {
    elements.medicalTableBody.innerHTML = '';
    state.medicalLogs.forEach(med => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${med.id}</strong></td>
        <td><strong style="color: var(--primary-600);">${med.petName}</strong> (${med.petId})</td>
        <td>${med.treatment}</td>
        <td>${med.veterinarian}</td>
        <td>${med.date}</td>
        <td>${med.nextDueDate || 'N/A'}</td>
        <td><span class="badge badge-available">${med.status}</span></td>
      `;
      elements.medicalTableBody.appendChild(tr);
    });
  }

  function renderInventoryTable() {
    elements.inventoryTableBody.innerHTML = '';
    state.inventory.forEach(inv => {
      const tr = document.createElement('tr');
      const isLow = inv.quantity <= inv.minThreshold;
      tr.innerHTML = `
        <td><strong>${inv.id}</strong></td>
        <td><strong>${inv.item}</strong></td>
        <td>${inv.category}</td>
        <td><strong style="color: ${isLow ? 'var(--status-danger)' : 'var(--text-main)'};">${inv.quantity} ${inv.unit}</strong></td>
        <td>${inv.minThreshold} ${inv.unit}</td>
        <td><span class="badge ${isLow ? 'badge-pending' : 'badge-available'}">${isLow ? 'Low Stock Alert' : 'In Stock'}</span></td>
      `;
      elements.inventoryTableBody.appendChild(tr);
    });
  }

  function renderDonationsTable() {
    elements.donationsTableBody.innerHTML = '';
    state.donations.forEach(don => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${don.id}</strong></td>
        <td><strong>${don.donorName}</strong></td>
        <td><strong style="color: var(--primary-600);">$${don.amount.toLocaleString()}</strong></td>
        <td>${don.date}</td>
        <td>${don.cause}</td>
        <td><span class="tag-chip">${don.sponsoredPet}</span></td>
      `;
      elements.donationsTableBody.appendChild(tr);
    });
  }

  // ----------------------------------------------------
  // MODALS & CRUD HANDLERS
  // ----------------------------------------------------
  function openAddPetModal() {
    state.editingPetId = null;
    elements.formMode.value = 'ADD';
    elements.petModalTitle.textContent = 'Add New Pet Record';
    elements.petForm.reset();

    const nextNum = 1000 + state.pets.length + 1;
    elements.petIdInput.value = `PET-${nextNum}`;
    elements.petIdInput.removeAttribute('readonly');
    elements.petModal.classList.remove('hidden');
  }

  function openEditPetModal(petId) {
    const pet = state.pets.find(p => p.id.toUpperCase() === petId.toUpperCase());
    if (!pet) return;

    state.editingPetId = pet.id;
    elements.formMode.value = 'EDIT';
    elements.petModalTitle.textContent = `Edit Pet Record (${pet.id})`;

    elements.petIdInput.value = pet.id;
    elements.petIdInput.setAttribute('readonly', 'true');
    elements.petNameInput.value = pet.name;
    elements.petSpeciesInput.value = pet.species;
    elements.petBreedInput.value = pet.breed;
    elements.petAgeInput.value = pet.age;
    elements.petGenderInput.value = pet.gender;
    elements.petStatusInput.value = pet.adoptionStatus;
    elements.petVaccinatedInput.checked = Boolean(pet.vaccinated);
    elements.petNotesInput.value = pet.notes || '';

    elements.petModal.classList.remove('hidden');
  }

  function closePetModal() {
    elements.petModal.classList.add('hidden');
  }

  async function handlePetFormSubmit(e) {
    e.preventDefault();

    const petData = {
      id: elements.petIdInput.value,
      name: elements.petNameInput.value,
      species: elements.petSpeciesInput.value,
      breed: elements.petBreedInput.value,
      age: elements.petAgeInput.value,
      gender: elements.petGenderInput.value,
      adoptionStatus: elements.petStatusInput.value,
      vaccinated: elements.petVaccinatedInput.checked,
      notes: elements.petNotesInput.value
    };

    let res;
    if (elements.formMode.value === 'ADD') {
      res = await apiRequest('/api/pets', 'POST', petData);
    } else {
      res = await apiRequest(`/api/pets/${state.editingPetId}`, 'PUT', petData);
    }

    if (res.success) {
      showToast(res.message, 'success');
      closePetModal();
      loadAllData();
    } else {
      showToast(res.message || 'Operation failed.', 'error');
    }
  }

  function openDeletePetModal(id, name) {
    state.deletingPetId = id;
    elements.deletePetNameDisplay.textContent = `Target: ${name} (${id})`;
    elements.deleteModal.classList.remove('hidden');
  }

  function closeDeleteModal() {
    elements.deleteModal.classList.add('hidden');
    state.deletingPetId = null;
  }

  async function confirmDeletePet() {
    if (!state.deletingPetId) return;

    const res = await apiRequest(`/api/pets/${state.deletingPetId}`, 'DELETE');
    if (res.success) {
      showToast(res.message, 'success');
      closeDeleteModal();
      loadAllData();
    } else {
      showToast(res.message || 'Failed to delete pet.', 'error');
    }
  }

  // ----------------------------------------------------
  // NAVIGATION & VIEW SWITCHING (7 TABS)
  // ----------------------------------------------------
  function switchView(viewName) {
    state.activeView = viewName;

    elements.navItems.forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    Object.keys(elements.views).forEach(key => {
      if (elements.views[key]) {
        if (key === viewName) {
          elements.views[key].classList.remove('hidden');
        } else {
          elements.views[key].classList.add('hidden');
        }
      }
    });

    const titles = {
      dashboard: 'HappyPaws - Tisha Mondal Sanctuary Dashboard',
      pets: 'Pet Inventory & Adoption Records',
      requests: 'Adoption Applications Management',
      medical: 'Medical & Vaccine Schedules',
      inventory: 'Inventory & Supplies Tracker',
      donations: 'Donor Wall & Financial Support',
      shelter: 'Sanctuary Profile & Admin Settings'
    };

    elements.pageTitle.textContent = titles[viewName] || 'HappyPaws - Tisha Mondal';
  }

  function renderCurrentView() {
    switchView(state.activeView);
  }

  // ----------------------------------------------------
  // TOAST DISPATCHER
  // ----------------------------------------------------
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ----------------------------------------------------
  // EVENT LISTENERS
  // ----------------------------------------------------
  function attachEventListeners() {
    // Theme Toggle
    elements.btnThemeToggle.addEventListener('click', toggleTheme);

    // Notification Dropdown Toggle
    elements.btnNotifToggle.addEventListener('click', () => {
      elements.notifDropdown.classList.toggle('hidden');
    });

    elements.btnClearNotif.addEventListener('click', () => {
      document.getElementById('notif-list').innerHTML = `<p style="font-size: 12px; color: var(--text-muted);">No unread notifications.</p>`;
      elements.notifCount.textContent = '0';
    });

    // Auth Form
    elements.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      elements.loginError.classList.add('hidden');

      const username = elements.usernameInput.value;
      const password = elements.passwordInput.value;

      const res = await apiRequest('/api/login', 'POST', { username, password });

      if (res.success) {
        state.currentUser = res.user;
        state.currentUser.name = 'Tisha Mondal'; // Ensure admin name
        localStorage.setItem('happypaws_user', JSON.stringify(res.user));
        showToast('Login successful! Welcome back, Tisha Mondal.', 'success');
        showAppScreen();
      } else {
        elements.loginErrorText.textContent = res.message || 'Invalid credentials';
        elements.loginError.classList.remove('hidden');
      }
    });

    elements.btnFillDemo.addEventListener('click', () => {
      elements.usernameInput.value = 'admin@happypaws.com';
      elements.passwordInput.value = 'admin123';
    });

    elements.btnLogout.addEventListener('click', () => {
      localStorage.removeItem('happypaws_user');
      state.currentUser = null;
      showToast('Logged out safely.', 'info');
      showLoginScreen();
    });

    // 7 Nav items click
    elements.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(e.currentTarget.dataset.view);
      });
    });

    elements.btnQuickAddPet.addEventListener('click', () => {
      switchView('pets');
      openAddPetModal();
    });

    elements.btnOpenAddModal.addEventListener('click', openAddPetModal);
    elements.btnClosePetModal.addEventListener('click', closePetModal);
    elements.btnCancelPetModal.addEventListener('click', closePetModal);
    elements.petForm.addEventListener('submit', handlePetFormSubmit);

    elements.btnConfirmDelete.addEventListener('click', confirmDeletePet);
    elements.btnCloseDeleteModal.addEventListener('click', closeDeleteModal);
    elements.btnCancelDelete.addEventListener('click', closeDeleteModal);

    // Search and Filters
    elements.searchBar.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      fetchPets();
    });

    elements.globalSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      switchView('pets');
      fetchPets();
    });

    elements.speciesFilter.addEventListener('change', (e) => {
      state.selectedSpecies = e.target.value;
      fetchPets();
    });

    elements.statusFilter.addEventListener('change', (e) => {
      state.selectedStatus = e.target.value;
      fetchPets();
    });

    // Shelter Profile Save
    if (elements.shelterProfileForm) {
      elements.shelterProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const profileData = {
          name: document.getElementById('shelter-name-input').value,
          administrator: document.getElementById('shelter-admin-input').value,
          email: document.getElementById('shelter-email-input').value,
          phone: document.getElementById('shelter-phone-input').value,
          address: document.getElementById('shelter-address-input').value
        };
        const res = await apiRequest('/api/shelter', 'PUT', profileData);
        if (res.success) {
          showToast('Sanctuary settings updated successfully!', 'success');
        }
      });
    }
  }

  // Start App
  init();
});
