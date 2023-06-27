// const BigchainDB = require('bigchaindb-driver')

// const API_PATH = 'http://localhost:9984/api/v1/'
// const conn = new BigchainDB.Connection(API_PATH)

// const bip39 = require('bip39')

// const seed = bip39.mnemonicToSeedSync('seedPhrase').slice(0,32)
// const alice = new BigchainDB.Ed25519Keypair(seed)

// const painting = {
//   name: 'Meninas',
//   author: 'Diego Rodríguez de Silva y Velázquez',
//   place: 'Madrid',
//   year: '1656'
// }

// function addBook() {
//   // Construct a transaction payload
//   const txCreatePaint = BigchainDB.Transaction.makeCreateTransaction(
//       // Asset field
//       {
//           painting,
//       },
//       // Metadata field, contains information about the transaction itself
//       // (can be `null` if not needed)
//       {
//           datetime: new Date().toString(),
//           location: 'Madrid',
//           value: {
//               value_eur: '25000000€',
//               value_btc: '2200',
//           }
//       },
//       // Output. For this case we create a simple Ed25519 condition
//       [BigchainDB.Transaction.makeOutput(
//           BigchainDB.Transaction.makeEd25519Condition(alice.publicKey))],
//       // Issuers
//       alice.publicKey
//   )
//   // The owner of the painting signs the transaction
//   const txSigned = BigchainDB.Transaction.signTransaction(txCreatePaint,
//       alice.privateKey)

//   // Send the transaction off to BigchainDB
//   conn.postTransactionCommit(txSigned)
//       .then(res => {
//           // document.body.innerHTML += '<h3>Transaction created</h3>';
//           // document.body.innerHTML += txSigned.id
//           console.log(txSigned.id);
//           // txSigned.id corresponds to the asset id of the painting
//       })
// }

// addBook()

// // module.exports = addBook;


const driver = require('bigchaindb-driver');

const user1 = new driver.Ed25519Keypair();
const user2 = new driver.Ed25519Keypair();

async function createAssetWithThresholdCondition() {
  // Step 1: Connect to BigchainDB
  const conn = new driver.Connection('http://localhost:9984/api/v1/');

  // Step 2: Define the owners and their public-private key pairs
  const owners = [
    { publicKey: user1.publicKey, privateKey: user1.privateKey },
    { publicKey: user2.publicKey, privateKey: user2.privateKey },
    // Add more owners as needed
  ];

  // Step 3: Create a threshold condition
  const threshold = 1; // Number of owners required to modify metadata
  const thresholdCondition = driver.Transaction.makeEd25519Condition(owners.map(owner => String(owner.publicKey)), threshold);

  // Step 4: Create the asset
  const asset = {
    data: {
      // Define your asset data here
      name: "combined"
    },
    metadata: {
      // Define initial metadata
      count: 3
    },
  };

  // Step 5: Create the transaction
  const createTx = driver.Transaction.makeCreateTransaction(
    asset,
    null,
    [driver.Transaction.makeOutput(thresholdCondition)],
    owners.map(owner => driver.Transaction.makeEd25519Condition(owner.publicKey))
  );

  // Step 6: Sign the transaction
  const signedTx = driver.Transaction.signTransaction(createTx, owners.map(owner => owner.privateKey));

  // Step 7: Post and commit the transaction
  try {
    const response = await conn.postTransactionCommit(signedTx);
    console.log('Asset created successfully:', response);
  } catch (error) {
    console.error('Error creating asset:', error);
  }
}

createAssetWithThresholdCondition();
