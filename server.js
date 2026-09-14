const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper Functions for JSON DB operations
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database.json:', err);
    return { users: [], pets: [], adoptions: [], medicalLogs: [], inventory: [], donations: [], shelterProfile: {} };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing to database.json:', err);
    return false;
  }
}

// ----------------------------------------------------
// AUTHENTICATION API
// ----------------------------------------------------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const db = readDB();
  const user = db.users.find(
    u => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password
  );

  if (user) {
    return res.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      },
      token: `token_${Date.now()}_${user.id}`
    });
  } else {
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
  }
});

// ----------------------------------------------------
// DASHBOARD STATS API
// ----------------------------------------------------
app.get('/api/stats', (req, res) => {
  const db = readDB();
  const pets = db.pets || [];
  const adoptions = db.adoptions || [];
  const inventory = db.inventory || [];
  const donations = db.donations || [];

  const totalPets = pets.length;
  const totalAdoptions = pets.filter(p => p.adoptionStatus === 'Adopted').length;
  const pendingRequests = adoptions.filter(a => a.status === 'Pending').length;
  const availablePets = pets.filter(p => p.adoptionStatus === 'Available').length;
  const lowStockCount = inventory.filter(i => i.quantity <= i.minThreshold).length;
  const totalDonations = donations.reduce((sum, d) => sum + (d.amount || 0), 0);

  res.json({
    success: true,
    stats: {
      totalPets,
      totalAdoptions,
      pendingRequests,
      availablePets,
      lowStockCount,
      totalDonations
    }
  });
});

// ----------------------------------------------------
// PETS CRUD API
// ----------------------------------------------------
app.get('/api/pets', (req, res) => {
  const db = readDB();
  let pets = db.pets || [];

  const { search, species, status } = req.query;

  if (search) {
    const q = search.toLowerCase().trim();
    pets = pets.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.breed.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  }

  if (species && species !== 'All') {
    pets = pets.filter(p => p.species.toLowerCase() === species.toLowerCase());
  }

  if (status && status !== 'All') {
    pets = pets.filter(p => p.adoptionStatus.toLowerCase() === status.toLowerCase());
  }

  res.json({ success: true, pets });
});

app.get('/api/pets/:id', (req, res) => {
  const db = readDB();
  const pet = db.pets.find(p => p.id.toUpperCase() === req.params.id.toUpperCase());

  if (!pet) {
    return res.status(404).json({ success: false, message: 'Pet not found.' });
  }
  res.json({ success: true, pet });
});

app.post('/api/pets', (req, res) => {
  const { id, name, species, breed, age, gender, vaccinated, adoptionStatus, notes } = req.body;

  if (!name || !species || !breed || !age || !gender) {
    return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
  }

  const db = readDB();
  let newId = id ? id.trim().toUpperCase() : `PET-${Date.now().toString().slice(-4)}`;
  
  if (db.pets.some(p => p.id.toUpperCase() === newId)) {
    return res.status(400).json({ success: false, message: `Pet ID ${newId} already exists!` });
  }

  const newPet = {
    id: newId,
    name: name.trim(),
    species: species.trim(),
    breed: breed.trim(),
    age: age.trim(),
    gender: gender,
    vaccinated: Boolean(vaccinated),
    adoptionStatus: adoptionStatus || 'Available',
    notes: notes ? notes.trim() : '',
    createdAt: new Date().toISOString()
  };

  db.pets.unshift(newPet);
  writeDB(db);

  res.status(201).json({ success: true, message: 'Pet added successfully!', pet: newPet });
});

app.put('/api/pets/:id', (req, res) => {
  const petId = req.params.id.toUpperCase();
  const { name, species, breed, age, gender, vaccinated, adoptionStatus, notes } = req.body;

  const db = readDB();
  const petIndex = db.pets.findIndex(p => p.id.toUpperCase() === petId);

  if (petIndex === -1) {
    return res.status(404).json({ success: false, message: 'Pet not found.' });
  }

  db.pets[petIndex] = {
    ...db.pets[petIndex],
    name: name ? name.trim() : db.pets[petIndex].name,
    species: species ? species.trim() : db.pets[petIndex].species,
    breed: breed ? breed.trim() : db.pets[petIndex].breed,
    age: age ? age.trim() : db.pets[petIndex].age,
    gender: gender || db.pets[petIndex].gender,
    vaccinated: vaccinated !== undefined ? Boolean(vaccinated) : db.pets[petIndex].vaccinated,
    adoptionStatus: adoptionStatus || db.pets[petIndex].adoptionStatus,
    notes: notes !== undefined ? notes.trim() : db.pets[petIndex].notes,
    updatedAt: new Date().toISOString()
  };

  writeDB(db);
  res.json({ success: true, message: 'Pet record updated!', pet: db.pets[petIndex] });
});

app.delete('/api/pets/:id', (req, res) => {
  const petId = req.params.id.toUpperCase();
  const db = readDB();

  const initialLength = db.pets.length;
  db.pets = db.pets.filter(p => p.id.toUpperCase() !== petId);

  if (db.pets.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Pet not found.' });
  }

  if (db.adoptions) {
    db.adoptions = db.adoptions.filter(a => a.petId.toUpperCase() !== petId);
  }

  writeDB(db);
  res.json({ success: true, message: `Pet ${petId} deleted successfully.` });
});

// ----------------------------------------------------
// ADOPTION REQUESTS API
// ----------------------------------------------------
app.get('/api/requests', (req, res) => {
  const db = readDB();
  res.json({ success: true, requests: db.adoptions || [] });
});

app.post('/api/requests', (req, res) => {
  const { petId, applicantName, applicantEmail, applicantPhone } = req.body;
  if (!petId || !applicantName || !applicantEmail) {
    return res.status(400).json({ success: false, message: 'Missing required request details.' });
  }

  const db = readDB();
  const pet = db.pets.find(p => p.id.toUpperCase() === petId.toUpperCase());
  if (!pet) {
    return res.status(404).json({ success: false, message: 'Pet not found.' });
  }

  const newRequest = {
    id: `REQ-${Date.now().toString().slice(-4)}`,
    petId: pet.id,
    petName: pet.name,
    applicantName: applicantName.trim(),
    applicantEmail: applicantEmail.trim(),
    applicantPhone: applicantPhone ? applicantPhone.trim() : 'N/A',
    status: 'Pending',
    requestDate: new Date().toISOString()
  };

  pet.adoptionStatus = 'Pending';
  db.adoptions.unshift(newRequest);
  writeDB(db);

  res.status(201).json({ success: true, message: 'Adoption request submitted!', request: newRequest });
});

app.put('/api/requests/:id', (req, res) => {
  const requestId = req.params.id;
  const { status } = req.body;

  if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  const db = readDB();
  const reqItem = db.adoptions.find(a => a.id === requestId);

  if (!reqItem) {
    return res.status(404).json({ success: false, message: 'Adoption request not found.' });
  }

  reqItem.status = status;
  const pet = db.pets.find(p => p.id.toUpperCase() === reqItem.petId.toUpperCase());
  if (pet) {
    if (status === 'Approved') {
      pet.adoptionStatus = 'Adopted';
    } else if (status === 'Rejected') {
      pet.adoptionStatus = 'Available';
    }
  }

  writeDB(db);
  res.json({ success: true, message: `Request updated to ${status}.`, request: reqItem });
});

// ----------------------------------------------------
// MEDICAL LOGS API
// ----------------------------------------------------
app.get('/api/medical', (req, res) => {
  const db = readDB();
  res.json({ success: true, medicalLogs: db.medicalLogs || [] });
});

app.post('/api/medical', (req, res) => {
  const { petId, petName, treatment, veterinarian, date, nextDueDate, status, notes } = req.body;
  if (!petId || !treatment || !veterinarian) {
    return res.status(400).json({ success: false, message: 'Missing treatment details.' });
  }

  const db = readDB();
  const newLog = {
    id: `MED-${Date.now().toString().slice(-4)}`,
    petId: petId.trim().toUpperCase(),
    petName: petName ? petName.trim() : 'Pet',
    treatment: treatment.trim(),
    veterinarian: veterinarian.trim(),
    date: date || new Date().toISOString().split('T')[0],
    nextDueDate: nextDueDate || '',
    status: status || 'Completed',
    notes: notes ? notes.trim() : ''
  };

  db.medicalLogs = db.medicalLogs || [];
  db.medicalLogs.unshift(newLog);
  writeDB(db);

  res.status(201).json({ success: true, message: 'Medical log added!', medicalLog: newLog });
});

// ----------------------------------------------------
// INVENTORY & SUPPLIES API
// ----------------------------------------------------
app.get('/api/inventory', (req, res) => {
  const db = readDB();
  res.json({ success: true, inventory: db.inventory || [] });
});

app.post('/api/inventory', (req, res) => {
  const { item, category, quantity, unit, minThreshold } = req.body;
  if (!item || quantity === undefined) {
    return res.status(400).json({ success: false, message: 'Item name and quantity required.' });
  }

  const db = readDB();
  const qty = parseInt(quantity, 10);
  const min = parseInt(minThreshold || 5, 10);

  const newItem = {
    id: `INV-${Date.now().toString().slice(-4)}`,
    item: item.trim(),
    category: category || 'General Supplies',
    quantity: qty,
    unit: unit || 'Units',
    status: qty <= min ? 'Low Stock' : 'In Stock',
    minThreshold: min
  };

  db.inventory = db.inventory || [];
  db.inventory.unshift(newItem);
  writeDB(db);

  res.status(201).json({ success: true, message: 'Inventory item added!', item: newItem });
});

// ----------------------------------------------------
// DONATIONS API
// ----------------------------------------------------
app.get('/api/donations', (req, res) => {
  const db = readDB();
  res.json({ success: true, donations: db.donations || [] });
});

app.post('/api/donations', (req, res) => {
  const { donorName, amount, cause, sponsoredPet } = req.body;
  if (!donorName || !amount) {
    return res.status(400).json({ success: false, message: 'Donor name and amount are required.' });
  }

  const db = readDB();
  const newDonation = {
    id: `DON-${Date.now().toString().slice(-4)}`,
    donorName: donorName.trim(),
    amount: parseFloat(amount),
    date: new Date().toISOString().split('T')[0],
    cause: cause ? cause.trim() : 'General Sanctuary Support',
    sponsoredPet: sponsoredPet ? sponsoredPet.trim() : 'All Shelter Pets'
  };

  db.donations = db.donations || [];
  db.donations.unshift(newDonation);
  writeDB(db);

  res.status(201).json({ success: true, message: 'Donation recorded! Thank you.', donation: newDonation });
});

// ----------------------------------------------------
// SHELTER PROFILE API
// ----------------------------------------------------
app.get('/api/shelter', (req, res) => {
  const db = readDB();
  res.json({ success: true, shelter: db.shelterProfile || {} });
});

app.put('/api/shelter', (req, res) => {
  const db = readDB();
  db.shelterProfile = {
    ...db.shelterProfile,
    ...req.body
  };
  writeDB(db);
  res.json({ success: true, message: 'Shelter settings updated!', shelter: db.shelterProfile });
});

// Fallback to single page app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🐾 HappyPaws - Tisha Mondal Sanctuary Server Running`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
