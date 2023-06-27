const bcrypt = require('bcrypt');
const BigchainDB = require('bigchaindb-driver')
const bip39 = require('bip39')
const mongoose = require('mongoose');
const Admin = require('./models/admin');
const {createAppAndAddAdmin} = require('./app-rbac');

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

async function registerSystemAdmin () {
    const name = "system admin";
    const email = "system.admin@gbpuat-tech.ac.in";
    const password = "System@admin";
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
    await createAppAndAddAdmin(keyPair);
}

registerSystemAdmin();