const driver = require('bigchaindb-driver');
const Buffer = require('buffer').Buffer
const base58 = require('bs58')
const cryptoconditions = require('crypto-conditions')
const sha3 = require('js-sha3')

function sha256Hash(data) {
  return sha3.sha3_256
      .create()
      .update(data)
      .hex()
}
// Connect to the driver server
const API_PATH = 'http://localhost:9984/api/v1/';
const conn = new driver.Connection(API_PATH);

async function acceptReturnRequest(req, res) {
  const asset = req.body;
  const adminPublicKey = req.session.publicKey;
  const adminPrivateKey = req.session.privateKey;

  // Create a new asset for the book data
  const burnAssets = await conn.searchAssets('burnGroup');
  let groupLink;
  if (burnAssets.length > 0) { 
    groupLink = burnAssets[0].id;
  } else {
    console.log("no assets");
    groupLink = "idontknow";
  }

  const acceptedRequestMetadata = {
    'status': "return request accepted",
    'link': groupLink
  };

  try {
    const transaction = await conn.getTransaction(asset.id)
    console.log(transaction);
    const adminAssets = await conn.searchAssets('adminGroup');
    if (adminAssets.length > 0) {
      const userTypeId = adminAssets[0].id;
      console.log('Asset ID:', userTypeId);
      const transactions = await conn.listTransactions(userTypeId);
      let metadata;
      if (transactions.length > 0) {
        metadata = transactions[transactions.length - 1].metadata;
      } else {
        console.log('Asset not found.');
      }
      console.log("public key", burnAssets[0].data.publicKey)
      let condition = driver.Transaction.makeEd25519Condition(burnAssets[0].data.publicKey);
      let output = driver.Transaction.makeOutput(condition);
      output.public_keys = [ burnAssets[0].data.publicKey ];
      let transactionTx = driver.Transaction.makeTransferTransaction(
        [{ tx: transaction, output_index: 0 }],
        [output],
        acceptedRequestMetadata  
        );

    let fulfillment = new cryptoconditions.ThresholdSha256()
    fulfillment.threshold = 1
    const serializedTransaction = driver.Transaction.serializeTransactionIntoCanonicalString(transactionTx)
    let fullf = driver.Transaction.makeEd25519Condition(adminPublicKey, false);
    const transactionUniqueFulfillment1 = transactionTx.inputs[0].fulfills ? serializedTransaction
        .concat(transactionTx.inputs[0].fulfills.transaction_id)
        .concat(transactionTx.inputs[0].fulfills.output_index) : serializedTransaction
    const transactionHash1 = sha256Hash(transactionUniqueFulfillment1)
    fullf.sign(Buffer.from(transactionHash1, 'hex'), new Buffer.from(base58.decode(adminPrivateKey)))
    fulfillment.addSubfulfillment(fullf.serializeUri())

    metadata.can_link.forEach(publicKey => {
        if(adminPublicKey != publicKey) {
            let fullf = driver.Transaction.makeEd25519Condition(publicKey, false);
            fulfillment.addSubconditionUri(fullf.getConditionUri())
        }
    });
    console.log(metadata);
    const fulfillmentUri = fulfillment.serializeUri()
    console.log(fulfillmentUri);
    transactionTx.inputs[0].fulfillment = fulfillmentUri
    transactionTx.id = await sha256Hash( driver.Transaction.serializeTransactionIntoCanonicalString(transactionTx))
    console.log(transactionTx.id)
    await conn.postTransactionCommit(transactionTx)
    .then(res => {
        console.log('Transfer Transaction', transactionTx.id, 'accepted');
    })
    } else {
      console.log('No asset found with the given name.');
    }
  } catch (error) {
    console.error('Error searching assets:', error);
  }



try {
    const bookTransactions = await conn.listTransactions(asset.data.bookId);
    const transaction = bookTransactions[bookTransactions.length - 1];
    const adminAssets = await conn.searchAssets('adminGroup');
    if (adminAssets.length > 0) {
        const userTypeId = adminAssets[0].id;
        console.log('Asset ID:', userTypeId);
        const transactions = await conn.listTransactions(userTypeId);
        let metadata;
        if (transactions.length > 0) {
            metadata = transactions[transactions.length - 1].metadata;
        } else {
        console.log('Asset not found.');
        }
        let subConditions = [];
        metadata.can_link.forEach(publicKey => {
            const subCondition = driver.Transaction.makeEd25519Condition(publicKey, false);
            subConditions.push(subCondition);
        });
        let condition = driver.Transaction.makeThresholdCondition(1, subConditions)
        let output = driver.Transaction.makeOutput(condition)
        output.public_keys = metadata.can_link;
        let bookMetadata = transaction.metadata;
        bookMetadata.count = bookMetadata.count + 1;
        let transactionTx = driver.Transaction.makeTransferTransaction(
            [{ tx: transaction, output_index: 0 }],
            [output],
            bookMetadata
        );
        let fulfillment = new cryptoconditions.ThresholdSha256()
        fulfillment.threshold = 1
        const serializedTransaction = driver.Transaction.serializeTransactionIntoCanonicalString(transactionTx)
        let fullf = driver.Transaction.makeEd25519Condition(adminPublicKey, false);
        const transactionUniqueFulfillment1 = transactionTx.inputs[0].fulfills ? serializedTransaction
            .concat(transactionTx.inputs[0].fulfills.transaction_id)
            .concat(transactionTx.inputs[0].fulfills.output_index) : serializedTransaction
        const transactionHash1 = sha256Hash(transactionUniqueFulfillment1)
        fullf.sign(Buffer.from(transactionHash1, 'hex'), new Buffer.from(base58.decode(adminPrivateKey)))
        fulfillment.addSubfulfillment(fullf.serializeUri())
        metadata.can_link.forEach(publicKey => {
            if(adminPublicKey != publicKey) {
                let fullf = driver.Transaction.makeEd25519Condition(publicKey, false);
                fulfillment.addSubconditionUri(fullf.getConditionUri())
            }
        });
        console.log(metadata);
        const fulfillmentUri = fulfillment.serializeUri()
        console.log(fulfillmentUri);
        transactionTx.inputs[0].fulfillment = fulfillmentUri
        transactionTx.id = await sha256Hash( driver.Transaction.serializeTransactionIntoCanonicalString(transactionTx))
        console.log(transactionTx.id)
        await conn.postTransactionCommit(transactionTx)
        .then(res => {
            console.log('Transfer Transaction', transactionTx.id, 'accepted');
        })
    } else {
        console.log('No asset found with the given name.');
    }
} catch (error) {
    console.error('Error searching assets:', error);
}

try {
  const burnAssets = await conn.searchAssets('burnGroup');
  const burnGroupId = burnAssets[0].id;
  const issuedMetadata = {
    'status': "book returned",
    'returnDate': new Date().toISOString(),
    'link': burnGroupId
  };
  let transaction;
  const issuedAssets = await conn.searchAssets('issued');
  const currentRequestId = asset.data.requestId; // Replace with the actual current request ID
  console.log("nao");
  const assetWithMatchingRequestId = issuedAssets.find(asset => asset.data.requestId === currentRequestId);
  console.log("nao2")
    if (assetWithMatchingRequestId) {
    transaction = await conn.getTransaction(assetWithMatchingRequestId.id);
    // Use the transactions as needed
    } else {
    console.log('No asset found with the matching request ID.');
    }
    const adminAssets = await conn.searchAssets('adminGroup');
    if (adminAssets.length > 0) {
      const userTypeId = adminAssets[0].id;
      console.log('Asset ID:', userTypeId);
      const transactions = await conn.listTransactions(userTypeId);
      let metadata;
      if (transactions.length > 0) {
        metadata = transactions[transactions.length - 1].metadata;
      } else {
        console.log('Asset not found.');
      }
      let condition = driver.Transaction.makeEd25519Condition(burnAssets[0].data.publicKey);
      let output = driver.Transaction.makeOutput(condition);
      output.public_keys = [ burnAssets[0].data.publicKey ];
      let transactionTx = driver.Transaction.makeTransferTransaction(
        [{ tx: transaction, output_index: 0 }],
        [output],
        issuedMetadata  
        );

    let fulfillment = new cryptoconditions.ThresholdSha256()
    fulfillment.threshold = 1
    const serializedTransaction = driver.Transaction.serializeTransactionIntoCanonicalString(transactionTx)
    let fullf = driver.Transaction.makeEd25519Condition(adminPublicKey, false);
    const transactionUniqueFulfillment1 = transactionTx.inputs[0].fulfills ? serializedTransaction
        .concat(transactionTx.inputs[0].fulfills.transaction_id)
        .concat(transactionTx.inputs[0].fulfills.output_index) : serializedTransaction
    const transactionHash1 = sha256Hash(transactionUniqueFulfillment1)
    fullf.sign(Buffer.from(transactionHash1, 'hex'), new Buffer.from(base58.decode(adminPrivateKey)))
    fulfillment.addSubfulfillment(fullf.serializeUri())

    metadata.can_link.forEach(publicKey => {
        if(adminPublicKey != publicKey) {
            let fullf = driver.Transaction.makeEd25519Condition(publicKey, false);
            fulfillment.addSubconditionUri(fullf.getConditionUri())
        }
    });
    console.log(metadata);
    const fulfillmentUri = fulfillment.serializeUri()
    console.log(fulfillmentUri);
    transactionTx.inputs[0].fulfillment = fulfillmentUri
    transactionTx.id = await sha256Hash( driver.Transaction.serializeTransactionIntoCanonicalString(transactionTx))
    console.log(transactionTx.id)
    await conn.postTransactionCommit(transactionTx)
    .then(res => {
        console.log('Transfer Transaction', transactionTx.id, 'accepted');
    })
    } else {
      console.log('No asset found with the given name.');
    }
  
} catch (error) {
  console.error('Error searching assets:', error);
}
res.redirect('./dashboard');

}

module.exports = { acceptReturnRequest };
