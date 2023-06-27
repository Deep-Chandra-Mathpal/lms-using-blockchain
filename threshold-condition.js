const driver = require('bigchaindb-driver');

// Configure BigchainDB connection
const API_PATH = 'http://localhost:9984/api/v1/';
const conn = new driver.Connection(API_PATH);

// Create keypairs for the owners
const owner1 = new driver.Ed25519Keypair();
const owner2 = new driver.Ed25519Keypair();
const owner3 = new driver.Ed25519Keypair();

// Define the asset data
const assetData = {
  name: 'My Asset',
  description: 'This is a sample asset',
};

// Define the threshold condition with the public keys of the owners
const threshold = 1; // Number of signatures required
const condition = driver.Transaction.makeEd25519Condition([owner1.publicKey, owner2.publicKey, owner3.publicKey], threshold);

// Create the output that holds the asset with the threshold condition
const output = driver.Transaction.makeOutput(condition);

// Set the public keys of all owners on the output
output.public_keys = [owner1.publicKey, owner2.publicKey, owner3.publicKey];

// Create the transaction with the asset, output, and metadata
const transaction = driver.Transaction.makeCreateTransaction(
  assetData,
  null, // Metadata can be null or you can provide additional information
  [output],
  owner1.publicKey // The creator's public key
);

// Sign the transaction with the private key of the creator
const signedTransaction = driver.Transaction.signTransaction(transaction, owner1.privateKey);

// Send the signed transaction to BigchainDB
conn.postTransactionCommit(signedTransaction)
  .then((response) => {
    console.log('Asset created successfully:');
    console.log('Transaction ID:', response.id);
  })
  .catch((error) => {
    console.error('Error creating asset:', error);
  });
