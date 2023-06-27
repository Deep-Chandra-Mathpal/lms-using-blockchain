// const bcrypt = require('bcrypt');
// const BigchainDB = require('bigchaindb-driver')
// const bip39 = require('bip39')
// const mongoose = require('mongoose');
// const User = require('./models/user');
// const {createStudent} = require('./app-rbac');


// async function connectToDatabase() {
//   try {
//     await mongoose.connect('mongodb://localhost/c_database', {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     console.log('Connected to database');
//   } catch (error) {
//     console.error('Error connecting to database:', error.message);
//   }
// }

// async function registerUser(name, id, email, password) {
//     // Generate a random seed phrase
//     const seedPhrase = bip39.generateMnemonic()

//     // Derive a BigchainDB keypair from the seed phrase
//     const seed = bip39.mnemonicToSeedSync(seedPhrase)
//     const keyPair = new BigchainDB.Ed25519Keypair(seed.slice(0, 32))
//     console.log(seedPhrase);
//     console.log(keyPair);
//     await connectToDatabase(); // Connect to database dynamically
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const user = new User({ name, id, email, password: hashedPassword, publicKey: keyPair.publicKey, privateKey: keyPair.privateKey });
//     await user.save();
//     console.log('User saved to database');
//     mongoose.disconnect(); // Disconnect from database after saving user
//     createStudent(keyPair, name, id, email);
// }


// async function loginUser(req, email, password) {
//   await connectToDatabase(); // Connect to database dynamically
//   // Find the user by email
//   const user = await User.findOne({ email });
//   if (!user) {
//     console.log('User not found');
//     mongoose.disconnect();
//     return;
//   }
//   // Compare the provided password with the hashed password in the database
//   const passwordMatch = await bcrypt.compare(password, user.password);
//   if (passwordMatch) {
//     console.log('Login successful');
//     req.session.userRole = 'user';
//     req.session.publicKey = user.publicKey;
//     req.session.privateKey = user.privateKey;
//     req.session.email = user.email;
//     req.session.name = user.name;
//     req.session.studentId = user.id;
//     // Perform any additional actions after successful login
//   } else {
//     console.log('Incorrect password');
//   }
//   mongoose.disconnect(); // Disconnect from database after login attempt
// }

// module.exports = { registerUser, loginUser };



const bcrypt = require('bcrypt');
const BigchainDB = require('bigchaindb-driver')
const nodemailer = require('nodemailer');
const sendmailTransport = require('nodemailer-sendmail-transport');
const mongoose = require('mongoose');
const crypto = require('crypto');
const bip39 = require('bip39');
const User = require('./models/user');
const { createStudent } = require('./app-rbac');
require('dotenv').config();


// Create a nodemailer transporter
// const transporter = nodemailer.createTransport(sendmailTransport());
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  }
});


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

async function registerUser(name, id, email, password) {

  // const existingUser = await User.findOne({ email });
  // if (existingUser) {
  //   console.log('Email already exists');
  //   return;
  // }

  await connectToDatabase();

  const hashedPassword = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomBytes(20).toString('hex');

  const user = new User({
    name,
    id,
    email,
    password: hashedPassword,
    publicKey: undefined,
    privateKey: undefined,
    verificationToken,
    verified: false,
  });

  await user.save();

  const verificationLink = `http://localhost:3000/verify?token=${verificationToken}`;
  
  const mailOptions = {
    from: 'dm.mathpal777@gmail.com',
    to: email,
    subject: 'Email Verification',
    text: `Click the following link to verify your email: ${verificationLink}`,
  };

  // await transporter.sendMail(mailOptions);
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
  

  console.log('User saved to database and verification email sent');

  mongoose.disconnect();
}

async function loginUser(req, email, password) {
  await connectToDatabase();

  const user = await User.findOne({ email });
  if (!user) {
    console.log('User not found');
    mongoose.disconnect();
    return;
  }

  if (!user.verified) {
    console.log('User not verified');
    mongoose.disconnect();
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (passwordMatch) {
    console.log('Login successful');
    req.session.userRole = 'user';
    req.session.publicKey = user.publicKey;
    req.session.privateKey = user.privateKey;
    req.session.email = user.email;
    req.session.name = user.name;
    req.session.studentId = user.id;
    // Perform any additional actions after successful login
  } else {
    console.log('Incorrect password');
  }

  mongoose.disconnect();
}



async function verify(req, res) {
  await connectToDatabase();
  try {
    const { token } = req.query;

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    const seedPhrase = bip39.generateMnemonic();
    const seed = bip39.mnemonicToSeedSync(seedPhrase);
    const keyPair = new BigchainDB.Ed25519Keypair(seed.slice(0, 32));

    user.verified = true;
    user.verificationToken = undefined;
    user.publicKey = keyPair.publicKey;
    user.privateKey = keyPair.privateKey;

    createStudent(keyPair, user.name, user.id, user.email);
    await user.save();

    res.json({ message: 'Email verification successful' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Email verification failed' });
  }
};

module.exports = { registerUser, loginUser, verify };
