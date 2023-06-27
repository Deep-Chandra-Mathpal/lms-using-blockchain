const bcrypt = require('bcrypt');
const BigchainDB = require('bigchaindb-driver')
const bip39 = require('bip39')
const mongoose = require('mongoose');
const Admin = require('./models/admin');
const {createAdmin} = require('./app-rbac');


async function connectToDatabase() {
  try {
    await mongoose.connect('mongodb://localhost/c_database', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to database');
  } catch (error) {
    console.error('Error connecting to database:', error.message);
  }
}

async function registerAdmin (req, name, email, password) {
    // Generate a random seed phrase
    const seedPhrase = bip39.generateMnemonic()

    // Derive a BigchainDB keypair from the seed phrase
    const seed = bip39.mnemonicToSeedSync(seedPhrase)
    const keyPair = new BigchainDB.Ed25519Keypair(seed.slice(0, 32))
    console.log(seedPhrase);
    console.log(keyPair);
    await connectToDatabase(); // Connect to database dynamically
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({ name, email, password: hashedPassword, publicKey: keyPair.publicKey, privateKey: keyPair.privateKey });
    await admin.save();
    console.log('User saved to database');
    mongoose.disconnect(); // Disconnect from database after saving user
    createAdmin(req.session.publicKey, req.session.privateKey, keyPair.publicKey);
}


async function loginAdmin(req, email, password) {
    await connectToDatabase(); // Connect to database dynamically
    // Find the user by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.log('Admin not found');
      mongoose.disconnect();
      return;
    }
    // Compare the provided password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (passwordMatch) {
      console.log('Login successful');
      req.session.userRole = 'admin';
      req.session.publicKey = admin.publicKey;
      req.session.privateKey = admin.privateKey;
      req.session.email = admin.email;
      // Perform any additional actions after successful login
    } else {
      console.log('Incorrect password');
    }
    mongoose.disconnect(); // Disconnect from database after login attempt
  }

module.exports = { registerAdmin, loginAdmin };
