const driver = require('bigchaindb-driver');

// Connect to the driver server
const API_PATH = 'http://localhost:9984/api/v1/';
const conn = new driver.Connection(API_PATH);

async function returnBook(req, res) {
  console.log("hey bro");
  const { title, author, description, isbn, lang, bookId, requestId } = req.body;
  console.log(req.body);
  const studentPublicKey = req.session.publicKey;
  const studentPrivateKey = req.session.privateKey;
  const name = req.session.name;
  const studentId = req.session.studentId;
  console.log("hey bro");
  console.log("book id:", bookId);

  // Create a new asset for the book data
  const requestAssets = await conn.searchAssets('requestGroup');
  let groupLink;
  if (requestAssets.length > 0) { 
    groupLink = requestAssets[0].id;
  } else {
    console.log("no assets");
    groupLink = "idontknow";
  }

  const requestData = {
    'tag': 'return_request',
    'title': title,
    'author': author,
    'description': description,
    'isbn': isbn,
    'lang': lang,
    'bookId': bookId,
    'created-by': studentPublicKey,
    'name': name,
    'studentId': studentId,
    'requestId': requestId
  };
  const requestMetadata = {
    'status': "return request",
    'link': groupLink
  };

  try {
    console.log(studentPublicKey)
    const adminAssets = await conn.searchAssets('adminGroup');
    if (adminAssets.length > 0) {
      const userTypeId = adminAssets[0].id;
      console.log('Asset ID:', userTypeId);
      const transactions = await conn.listTransactions(userTypeId);
      let transaction;
      let metadata;
      if (transactions.length > 0) {
        transaction = transactions[transactions.length - 1];
        metadata = transaction.metadata;
      } else {
        console.log('Asset not found.');
      }
      let subConditions = [];
      metadata.can_link.forEach(publicKey => {
        const subCondition = driver.Transaction.makeEd25519Condition(publicKey, false);
        subConditions.push(subCondition);
      });
      let condition = driver.Transaction.makeThresholdCondition(1, subConditions);
      let output = driver.Transaction.makeOutput(condition);
      output.public_keys = metadata.can_link;
      const transactionTx = driver.Transaction.makeCreateTransaction(
        requestData,
        requestMetadata,
        [output],
        studentPublicKey
      );
      const txSigned = driver.Transaction.signTransaction(transactionTx, studentPrivateKey);
      await conn.postTransactionCommit(txSigned)
        .then(response => {
          console.log('Create Transaction', txSigned.id, 'accepted');
        })
        .catch(error => {
          console.error('Error during postTransactionCommit:', error);
        });
    } else {
      console.log('No asset found with the given name.');
    }
  } catch (error) {
    console.error('Error searching assets:', error);
  }

  // Redirect to success page
  res.redirect('/success');
}

module.exports = { returnBook };
