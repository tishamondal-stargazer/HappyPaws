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
    return { users: [], pets: [], adoptions: [] };
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

  const totalPets = pets.length;
  const totalAdoptions = pets.filter(p => p.adoptionStatus === 'Adopted').length;
  const pendingRequests = adoptions.filter(a => a.status === 'Pending').length;
  const availablePets = pets.filter(p => p.adoptionStatus === 'Available').length;

  res.json({
    success: true,
    stats: {
      totalPets,
      totalAdoptions,
      pendingRequests,
      availablePets
    }
  });
});

// ----------------------------------------------------
// PETS CRUD API
// ----------------------------------------------------

// 1. GET ALL PETS (With optional search and filtering)
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

// 2. GET PET BY ID
app.get('/api/pets/:id', (req, res) => {
  const db = readDB();
  const pet = db.pets.find(p => p.id.toUpperCase() === req.params.id.toUpperCase());

  if (!pet) {
    return res.status(404).json({ success: false, message: 'Pet not found.' });
  }
  res.json({ success: true, pet });
});

// 3. ADD PET (Create)
app.post('/api/pets', (req, res) => {
  const { id, name, species, breed, age, gender, vaccinated, adoptionStatus, notes } = req.body;

  // Validation
  if (!name || !species || !breed || !age || !gender) {
    return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
  }

  const db = readDB();
  
  // Check if ID already exists (or auto generate)
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

  db.pets.unshift(newPet); // add to beginning
  writeDB(db);

  res.status(201).json({ success: true, message: 'Pet added successfully!', pet: newPet });
});

// 4. UPDATE PET (Edit)
app.put('/api/pets/:id', (req, res) => {
  const petId = req.params.id.toUpperCase();
  const { name, species, breed, age, gender, vaccinated, adoptionStatus, notes } = req.body;

  const db = readDB();
  const petIndex = db.pets.findIndex(p => p.id.toUpperCase() === petId);

  if (petIndex === -1) {
    return res.status(404).json({ success: false, message: 'Pet not found.' });
  }

  // Update fields
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
  res.json({ success: true, message: 'Pet details updated successfully!', pet: db.pets[petIndex] });
});

// 5. DELETE PET
app.delete('/api/pets/:id', (req, res) => {
  const petId = req.params.id.toUpperCase();
  const db = readDB();

  const initialLength = db.pets.length;
  db.pets = db.pets.filter(p => p.id.toUpperCase() !== petId);

  if (db.pets.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Pet not found.' });
  }

  // Also update associated requests if any
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

  // Mark pet status as Pending
  pet.adoptionStatus = 'Pending';

  db.adoptions.unshift(newRequest);
  writeDB(db);

  res.status(201).json({ success: true, message: 'Adoption request submitted!', request: newRequest });
});

app.put('/api/requests/:id', (req, res) => {
  const requestId = req.params.id;
  const { status } = req.body; // 'Approved' or 'Rejected'

  if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  const db = readDB();
  const reqItem = db.adoptions.find(a => a.id === requestId);

  if (!reqItem) {
    return res.status(404).json({ success: false, message: 'Adoption request not found.' });
  }

  reqItem.status = status;

  // Sync pet adoptionStatus
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

// Serve frontend SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🐾 HappyPaws Shelter Management Server is running!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
