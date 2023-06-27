const express = require('express');
const bodyParser = require('body-parser');
const BigchainDB = require('bigchaindb-driver');
const crypto = require('crypto');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const { addBook } = require('./add-book');
const { borrowBook } = require('./create-borrow-request');
const { addBooksFromCSV } = require('./addBooksFromCSV')
const { returnBook } = require('./create-return-request')
const { registerUser, loginUser, verify } = require('./registration');
const { registerAdmin, loginAdmin } = require('./admin_registration');
const { authenticateAndAuthorize } = require('./auth_middleware');
const { logoutUser } = require('./logout');
const { acceptBorrowRequest } = require('./accept-borrow-request');
const { acceptReturnRequest } = require('./accept-return-request');
const app = express();

const generateSecretKey = () => {
  return crypto.randomBytes(32).toString('hex');
};
const secretKey = generateSecretKey();

// Configure BigchainDB connection
const API_PATH = 'http://localhost:9984/api/v1/';
const conn = new BigchainDB.Connection(API_PATH);
// const alice = new BigchainDB.Ed25519Keypair();

app.use(cookieParser());
app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: false
}));

app.use(express.static('public'));

// Middleware for parsing JSON and urlencoded form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Serve the HTML form for adding a book
app.get('/add-book', (req, res) => {
  res.sendFile(__dirname + '/public/add-book.html');
});

app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/public/registration.html');
});

app.get('/registeration-signup', (req, res) => {
  res.sendFile(__dirname + '/public/registration-signup.html');
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/public/user-login.html');
});

app.get('/admin/login', (req, res) => {
  res.sendFile(__dirname + '/public/admin-login.html');
});

app.get('/email-verification', (req, res) => {
  res.sendFile(__dirname + '/public/email-verification.html');
});

app.get('/logout', (req, res) => {
  logoutUser(req);
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/admin/register', (req, res) => {
  res.sendFile(__dirname + '/public/admin_registration.html');
});

app.get('/add-book-csv', (req, res) => {
  addBooksFromCSV(req, res, 'books.csv')
});

app.get('/book-list', (req, res) => {
  if(req.session.userRole && req.session.userRole === 'user')
    res.sendFile(__dirname + '/public/book-list.html');
  else if (req.session.userRole && req.session.userRole === 'admin')
    res.sendFile(__dirname + '/public/admin-book-list.html');
  else 
    res.sendFile(__dirname + '/public/registration-signup.html');
});


app.get('/dashboard', (req, res) => {
  console.log(req.session.userRole);
  if(req.session.userRole && req.session.userRole === 'user')
    res.sendFile(__dirname + '/public/user-dashboard.html');
  else if (req.session.userRole && req.session.userRole === 'admin')
    res.sendFile(__dirname + '/public/admin-dashboard.html');
  else 
    res.sendFile(__dirname + '/public/registration-signup.html');
});


// app.get('/user-dashboard', authenticateAndAuthorize('user'), (req, res) => {
//   // The user is authenticated and has the 'user' role
//   // Process the request or render the user profile page
//   res.sendFile(__dirname + '/public/user-dashboard.html');
// });


// app.get('/admin/admin-dashboard', authenticateAndAuthorize('admin'), (req, res) => {
//   // The user is authenticated and has the 'user' role
//   // Process the request or render the user profile page
//   res.sendFile(__dirname + '/public/admin-dashboard.html');
// });

// Handle submission of the add book form
app.post('/add-book', addBook);
app.post('/borrow-request', borrowBook);
app.post('/return-book', returnBook);
app.post('/accept-borrow-request', acceptBorrowRequest);
app.post('/accept-return-request', acceptReturnRequest);

app.post('/register', async (req, res) => {
  const { name, id, email, password} = req.body;
  await registerUser(name, id, email, password); // Call the imported function
  res.status(201).send('User created successfully');
});


app.get('/verify', verify);


app.post('/login', async (req, res) => {
  const {email, password} = req.body;
  await loginUser(req, email, password); // Call the imported function
  res.status(201).send('login successfully');
});


app.post('/admin/login', async (req, res) => {
  const {email, password} = req.body;
  await loginAdmin(req, email, password); // Call the imported function
  res.status(201).send('login successfully');
});

app.post('/admin/register', async (req, res) => {
  const { name, email, password} = req.body;
  await registerAdmin(req, name, email, password); // Call the imported function
  res.status(201).send('admin created successfully');
});

app.get('/bookAssets', async (req, res) => {
  try {
    // fetch the assets data from BigchainDB
    const grouopAssets = await conn.searchAssets('bookGroup');
    const id  = grouopAssets[0].id;
    const assets = await conn.searchAssets(id, 0);
    assets.shift();
    // send the assets data to the client side
    // console.log(assets);
    const assetsWithLatestMetadata = await Promise.all(
      assets.map(async (asset) => {
        const transactions = await conn.listTransactions(asset.id);
        const latestTransaction = transactions[transactions.length - 1];
        const latestMetadata = latestTransaction.metadata;
        return { ...asset, latestMetadata };
      })
    );
    res.send(assetsWithLatestMetadata);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/userDashboardAssets', async (req, res) => {
  try {
    // Fetch the assets data from BigchainDB
    const assets = await conn.searchAssets(req.session.publicKey, 0);
    assets.shift();

    // Retrieve the latest metadata for each asset
    const assetsWithLatestMetadata = await Promise.all(
      assets.map(async (asset) => {
        const transactions = await conn.listTransactions(asset.id);
        const latestTransaction = transactions[transactions.length - 1];
        const latestMetadata = latestTransaction.metadata;
        return { ...asset, latestMetadata };
      })
    );

    // Send the assets data with latest metadata to the client side
    res.send(assetsWithLatestMetadata);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});



app.get('/borrowRequestAssets', async (req, res) => {
  try {
    const requestGroup = await conn.searchAssets('requestGroup');
    const requestGroupId = requestGroup[0].id;
    const assets = await conn.searchAssets('borrow_request return_request', 0);
    // console.log(assets)
    let asset_list = [];
    for (const asset of assets) {
      // Find the latest transaction for the asset
      const transactions = await conn.listTransactions(asset.id);
      const latestTransaction = transactions[transactions.length - 1];
  
      if (latestTransaction) {
        // Check if the latest transaction's metadata contains a link to the requestGroup
        const metadata = latestTransaction.metadata;
        if (metadata && metadata.link && metadata.link === requestGroupId) {
          // Include the requestGroup asset ID in the list for output
          asset_list.push(asset);
        }
      }
    }
    res.send(asset_list);
  } catch (error) {
    console.error('Error searching assets:', error);
  }
});

app.get('/admin/issuedList', (req, res) => {
  res.sendFile(__dirname + '/public/issued-list.html');
});

app.get('/admin/returnedList', (req, res) => {
  res.sendFile(__dirname + '/public/returned-list.html');
});


app.get('/issuedListAssets', async (req, res) => {
  try {
    const issuedGroup = await conn.searchAssets('issuedGroup');
    const issuedGroupId = issuedGroup[0].id;
    const assets = await conn.searchAssets('issued', 0);
    let asset_list = [];
    for (const asset of assets) {
      // Find the latest transaction for the asset
      const transactions = await conn.listTransactions(asset.id);
      const latestTransaction = transactions[transactions.length - 1];
  
      if (latestTransaction) {
        // Check if the latest transaction's metadata contains a link to the requestGroup
        const metadata = latestTransaction.metadata;
        if (metadata && metadata.link && metadata.link === issuedGroupId) {
          // Include the requestGroup asset ID in the list for output
          asset_list.push(asset);
        }
      }
    }
    res.send(asset_list);
  } catch (error) {
    console.error('Error searching assets:', error);
  }
});


app.get('/burnListAssets', async (req, res) => {
  try {
    const burnGroup = await conn.searchAssets('burnGroup');
    const burnGroupId = burnGroup[0].id;
    const assets = await conn.searchAssets('issued', 0);
    let asset_list = [];
    for (const asset of assets) {
      // Find the latest transaction for the asset
      const transactions = await conn.listTransactions(asset.id);
      const latestTransaction = transactions[transactions.length - 1];

      if (latestTransaction) {
        // Retrieve the latest metadata for the asset
        const latestMetadata = latestTransaction.metadata;

        // Check if the latest transaction's metadata contains a link to the requestGroup
        if (latestMetadata && latestMetadata.link && latestMetadata.link === burnGroupId) {
          // Include the requestGroup asset ID in the list for output
          asset_list.push({ ...asset, latestMetadata });
        }
      }
    }
    res.send(asset_list);
  } catch (error) {
    console.error('Error searching assets:', error);
    res.status(500).send('Internal Server Error');
  }
});



// Serve the success page
app.get('/success', (req, res) => {
  res.send('added successfully!');
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
