/**
 * HappyPaws - Pet Adoption & Shelter Management System
 * Client JavaScript Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  const state = {
    currentUser: null,
    pets: [],
    requests: [],
    stats: {
      totalPets: 0,
      totalAdoptions: 0,
      pendingRequests: 0,
      availablePets: 0
    },
    activeView: 'dashboard',
    searchQuery: '',
    selectedSpecies: 'All',
    selectedStatus: 'All',
    editingPetId: null,
    deletingPetId: null
  };

  // ----------------------------------------------------
  // DOM ELEMENTS REFERENCE
  // ----------------------------------------------------
  const elements = {
    // Auth
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

    // Navigation & Views
    navItems: document.querySelectorAll('.nav-item'),
    pageTitle: document.getElementById('page-title'),
    views: {
      dashboard: document.getElementById('view-dashboard'),
      pets: document.getElementById('view-pets'),
      requests: document.getElementById('view-requests')
    },

    // Dashboard Stats
    statTotalPets: document.getElementById('stat-total-pets'),
    statTotalAdoptions: document.getElementById('stat-total-adoptions'),
    statPendingRequests: document.getElementById('stat-pending-requests'),
    statAvailablePets: document.getElementById('stat-available-pets'),
    activityFeed: document.getElementById('activity-feed-container'),
    speciesSummaryList: document.getElementById('species-summary-list'),
    btnQuickAddPet: document.getElementById('btn-quick-add-pet'),

    // Pets Toolbar & Grid
    searchBar: document.getElementById('pet-search-input'),
    speciesFilter: document.getElementById('species-filter'),
    statusFilter: document.getElementById('status-filter'),
    btnOpenAddModal: document.getElementById('btn-open-add-modal'),
    petsContainer: document.getElementById('pets-container'),
    petsEmptyState: document.getElementById('pets-empty-state'),

    // Adoption Requests Table
    requestsTableBody: document.getElementById('requests-table-body'),

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

    // Toast Container
    toastContainer: document.getElementById('toast-container')
  };

  // ----------------------------------------------------
  // INITIALIZATION & AUTH
  // ----------------------------------------------------
  function init() {
    checkSavedAuth();
    attachEventListeners();
  }

  function checkSavedAuth() {
    const savedUser = localStorage.getItem('happypaws_user');
    if (savedUser) {
      state.currentUser = JSON.parse(savedUser);
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
      elements.userDisplayName.textContent = state.currentUser.name || 'Admin User';
      elements.userDisplayRole.textContent = state.currentUser.role || 'Shelter Admin';
      elements.userAvatar.textContent = (state.currentUser.name || 'A').charAt(0).toUpperCase();
    }

    // Load initial data
    loadAllData();
  }

  // ----------------------------------------------------
  // API REQUEST HELPERS
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
      return { success: false, message: 'Server communication error.' };
    }
  }

  async function loadAllData() {
    await Promise.all([
      fetchDashboardStats(),
      fetchPets(),
      fetchAdoptionRequests()
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
      renderSpeciesSummary();
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

  // ----------------------------------------------------
  // DASHBOARD RENDERERS
  // ----------------------------------------------------
  function updateDashboardStatsUI() {
    elements.statTotalPets.textContent = state.stats.totalPets;
    elements.statTotalAdoptions.textContent = state.stats.totalAdoptions;
    elements.statPendingRequests.textContent = state.stats.pendingRequests;
    elements.statAvailablePets.textContent = state.stats.availablePets;
  }

  function renderActivityFeed() {
    if (!elements.activityFeed) return;
    elements.activityFeed.innerHTML = '';

    // Take top 4 recent pets
    const recent = state.pets.slice(0, 4);

    if (recent.length === 0) {
      elements.activityFeed.innerHTML = `<p style="color: var(--gray-500); font-size: 13px;">No recent activity records.</p>`;
      return;
    }

    recent.forEach(pet => {
      const item = document.createElement('div');
      item.className = 'activity-item';
      
      let icon = 'fa-paw';
      if (pet.species === 'Dog') icon = 'fa-dog';
      else if (pet.species === 'Cat') icon = 'fa-cat';

      item.innerHTML = `
        <div class="activity-icon">
          <i class="fa-solid ${icon}"></i>
        </div>
        <div class="activity-details">
          <div class="activity-title">${pet.name} (${pet.breed})</div>
          <div class="activity-sub">Status: <strong>${pet.adoptionStatus}</strong> • ${pet.age}</div>
        </div>
        <span class="pet-tag-id">${pet.id}</span>
      `;
      elements.activityFeed.appendChild(item);
    });
  }

  function renderSpeciesSummary() {
    if (!elements.speciesSummaryList) return;
    elements.speciesSummaryList.innerHTML = '';

    const counts = {};
    state.pets.forEach(p => {
      counts[p.species] = (counts[p.species] || 0) + 1;
    });

    const total = state.pets.length || 1;

    Object.keys(counts).forEach(species => {
      const cnt = counts[species];
      const percent = Math.round((cnt / total) * 100);

      const row = document.createElement('div');
      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
          <span>${species}s</span>
          <span>${cnt} (${percent}%)</span>
        </div>
        <div style="height: 8px; background-color: var(--gray-100); border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: ${percent}%; background-color: var(--primary-600); border-radius: 4px;"></div>
        </div>
      `;
      elements.speciesSummaryList.appendChild(row);
    });
  }

  // ----------------------------------------------------
  // PETS MANAGEMENT RENDERER
  // ----------------------------------------------------
  function renderPetsGrid() {
    elements.petsContainer.innerHTML = '';

    if (state.pets.length === 0) {
      elements.petsEmptyState.classList.remove('hidden');
      return;
    }

    elements.petsEmptyState.classList.add('hidden');

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

      const vaccBadge = pet.vaccinated 
        ? `<span class="badge-vacc-yes"><i class="fa-solid fa-circle-check"></i> Vaccinated</span>`
        : `<span class="badge-vacc-no"><i class="fa-solid fa-circle-xmark"></i> Not Vaccinated</span>`;

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
          <div class="pet-species-breed">${pet.species} • ${pet.breed}</div>

          <div class="pet-info-grid">
            <div><span class="info-label">Age:</span> <span class="info-val">${pet.age}</span></div>
            <div><span class="info-label">Gender:</span> <span class="info-val">${pet.gender}</span></div>
          </div>
          <div>${vaccBadge}</div>
          ${pet.notes ? `<div style="font-size: 12px; color: var(--gray-500); margin-top: 10px; font-style: italic;">"${pet.notes}"</div>` : ''}
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

    // Attach card action listeners
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => openEditPetModal(e.currentTarget.dataset.id));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => openDeletePetModal(e.currentTarget.dataset.id, e.currentTarget.dataset.name));
    });
  }

  // ----------------------------------------------------
  // ADOPTION REQUESTS RENDERER
  // ----------------------------------------------------
  function renderRequestsTable() {
    elements.requestsTableBody.innerHTML = '';

    if (state.requests.length === 0) {
      elements.requestsTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--gray-500);">No adoption requests submitted yet.</td></tr>`;
      return;
    }

    state.requests.forEach(req => {
      const tr = document.createElement('tr');

      let badgeClass = 'badge-pending';
      if (req.status === 'Approved') badgeClass = 'badge-available';
      if (req.status === 'Rejected') badgeClass = 'badge-adopted';

      const formattedDate = req.requestDate ? new Date(req.requestDate).toLocaleDateString() : 'N/A';

      tr.innerHTML = `
        <td><strong>${req.id}</strong></td>
        <td><span style="font-weight: 600; color: var(--primary-700);">${req.petName}</span> (${req.petId})</td>
        <td>${req.applicantName}</td>
        <td>${req.applicantEmail}</td>
        <td>${formattedDate}</td>
        <td><span class="badge ${badgeClass}">${req.status}</span></td>
        <td style="text-align: right;">
          ${req.status === 'Pending' ? `
            <button class="btn-action-sm btn-edit btn-approve-req" data-id="${req.id}" style="display: inline-flex; width: auto; margin-right: 6px; background-color: var(--success-bg); color: var(--success); border-color: rgba(16,185,129,0.3);">
              <i class="fa-solid fa-check"></i> Approve
            </button>
            <button class="btn-action-sm btn-delete btn-reject-req" data-id="${req.id}" style="display: inline-flex; width: auto;">
              <i class="fa-solid fa-xmark"></i> Reject
            </button>
          ` : `<span style="font-size: 12px; color: var(--gray-400);">Completed</span>`}
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
      showToast(`Adoption Request ${requestId} ${newStatus}!`, 'success');
      loadAllData();
    } else {
      showToast(res.message || 'Failed to update request', 'error');
    }
  }

  // ----------------------------------------------------
  // MODAL HANDLERS & FORM SUBMISSION
  // ----------------------------------------------------
  function openAddPetModal() {
    state.editingPetId = null;
    elements.formMode.value = 'ADD';
    elements.petModalTitle.textContent = 'Add New Pet';
    elements.petForm.reset();
    
    // Auto generate next pet ID
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

  // Delete Modal
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
  // NAVIGATION & VIEW SWITCHING
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
      if (key === viewName) {
        elements.views[key].classList.remove('hidden');
      } else {
        elements.views[key].classList.add('hidden');
      }
    });

    if (viewName === 'dashboard') {
      elements.pageTitle.textContent = 'Dashboard Overview';
    } else if (viewName === 'pets') {
      elements.pageTitle.textContent = 'Pet Records & Shelter Inventory';
    } else if (viewName === 'requests') {
      elements.pageTitle.textContent = 'Adoption Applications & Requests';
    }
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
    // Auth Form
    elements.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      elements.loginError.classList.add('hidden');

      const username = elements.usernameInput.value;
      const password = elements.passwordInput.value;

      const res = await apiRequest('/api/login', 'POST', { username, password });

      if (res.success) {
        state.currentUser = res.user;
        localStorage.setItem('happypaws_user', JSON.stringify(res.user));
        showToast('Login successful! Welcome back.', 'success');
        showAppScreen();
      } else {
        elements.loginErrorText.textContent = res.message || 'Invalid credentials';
        elements.loginError.classList.remove('hidden');
      }
    });

    // Autofill Demo Credentials
    elements.btnFillDemo.addEventListener('click', () => {
      elements.usernameInput.value = 'admin@happypaws.com';
      elements.passwordInput.value = 'admin123';
    });

    // Logout
    elements.btnLogout.addEventListener('click', () => {
      localStorage.removeItem('happypaws_user');
      state.currentUser = null;
      showToast('Logged out safely.', 'info');
      showLoginScreen();
    });

    // Sidebar Nav Click
    elements.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(e.currentTarget.dataset.view);
      });
    });

    // Quick Add Button on Dashboard
    elements.btnQuickAddPet.addEventListener('click', () => {
      switchView('pets');
      openAddPetModal();
    });

    // Open Add Pet Modal
    elements.btnOpenAddModal.addEventListener('click', openAddPetModal);
    elements.btnClosePetModal.addEventListener('click', closePetModal);
    elements.btnCancelPetModal.addEventListener('click', closePetModal);
    elements.petForm.addEventListener('submit', handlePetFormSubmit);

    // Delete Modal Controls
    elements.btnConfirmDelete.addEventListener('click', confirmDeletePet);
    elements.btnCloseDeleteModal.addEventListener('click', closeDeleteModal);
    elements.btnCancelDelete.addEventListener('click', closeDeleteModal);

    // Search and Filters
    elements.searchBar.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
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
  }

  // Run App
  init();
});
