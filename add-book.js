// const driver = require('bigchaindb-driver');

// // Connect to the driver server
// const API_PATH = 'http://localhost:9984/api/v1/';
// const conn = new driver.Connection(API_PATH);

// async function addBook(req, res) {
//   const { title, author, description, isbn, language, count } = req.body;
//   const adminPublicKey = req.session.publicKey;
//   const adminPrivateKey = req.session.privateKey;

//   // Create a new asset for the book data

//   const assets = await conn.searchAssets('bookGroup');
//   let groupLink;
//   if (assets.length > 0) { 
//      groupLink = assets[0].id;
//   }
//   else {
//     console.log("no assets");
//     groupLink = "idontknow";
//   }

//   const bookData = {
//     'tag': 'book',
//     'title': title,
//     'author': author,
//     'description': description,
//     'isbn': isbn,
//     'lang': language,
//     'link': groupLink
//   };
//   const bookMetadata = {
//     'count': count,
//   };


//   try {
//     console.log(adminPublicKey)
//     const assets = await conn.searchAssets('adminGroup');
//     if (assets.length > 0) {
//         userTypeId = assets[0].id;
//         console.log('Asset ID:', userTypeId);
//         const transactions = await conn.listTransactions(userTypeId);
//         let transaction;
//         let metadata;
//         if (transactions.length > 0) {
//             transaction = transactions[transactions.length - 1];
//             metadata = transaction.metadata;
//         } else {
//             console.log('Asset not found.');
//         }
//         let subConditions = [];
//         metadata.can_link.forEach(publicKey => {
//             const subCondition = driver.Transaction.makeEd25519Condition(publicKey, false);
//             subConditions.push(subCondition);
//         });
//         let condition = driver.Transaction.makeThresholdCondition(1, subConditions)
//         let output = driver.Transaction.makeOutput(condition)
//         output.public_keys = metadata.can_link;
//         const transactionTx = driver.Transaction.makeCreateTransaction(
//             bookData,
//             bookMetadata,
//             [output],
//             adminPublicKey
//         )
//         const txSigned = driver.Transaction.signTransaction(transactionTx, adminPrivateKey)
//         await conn.postTransactionCommit(txSigned)
//         .then(res => {
//             console.log('create Transaction', txSigned.id, 'accepted');
//         })
//         .catch(error => {
//             console.error('Error during postTransactionCommit:', error);
//         });
//     } else {
//         console.log('No asset found with the given name.');
//     }
// } catch (error) {
//     console.error('Error searching assets:', error);
// }

//   // Redirect to success page
//   // res.redirect('/success');
// }

// module.exports = { addBook };


const driver = require('bigchaindb-driver');

// Connect to the driver server
const API_PATH = 'http://localhost:9984/api/v1/';
const conn = new driver.Connection(API_PATH);

async function addBookCSV(req, res) {
  const { title, author, description, language, isbn, edition, publisher, publishDate, price, count } = req.body;
  const adminPublicKey = req.session.publicKey;
  const adminPrivateKey = req.session.privateKey;

  // Create a new asset for the book data
  const assets = await conn.searchAssets('bookGroup');
  let groupLink;
  if (assets.length > 0) {
    groupLink = assets[0].id;
  } else {
    console.log("No assets found");
    groupLink = "idontknow";
  }

  const bookData = {
    tag: 'book',
    title: title,
    author: author,
    description: description,
    // language: language,
    isbn: isbn,
    edition: edition,
    publisher: publisher,
    publishDate: publishDate,
    price: price,
    link: groupLink
  };

  const bookMetadata = {
    count: count
  };

  try {
    console.log(adminPublicKey);
    const assets = await conn.searchAssets('adminGroup');
    if (assets.length > 0) {
      const userTypeId = assets[0].id;
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
        bookData,
        bookMetadata,
        [output],
        adminPublicKey
      );
      const txSigned = driver.Transaction.signTransaction(transactionTx, adminPrivateKey);
      await conn.postTransactionCommit(txSigned)
        .then(res => {
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
  // res.redirect('/success');
}

async function addBook(req, res) {
  const { title, author, description, language, isbn, edition, publisher, publishDate, price, count } = req.body;
  const adminPublicKey = req.session.publicKey;
  const adminPrivateKey = req.session.privateKey;

  // Create a new asset for the book data
  const assets = await conn.searchAssets('bookGroup');
  let groupLink;
  if (assets.length > 0) {
    groupLink = assets[0].id;
  } else {
    console.log("No assets found");
    groupLink = "idontknow";
  }

  const bookData = {
    tag: 'book',
    title: title,
    author: author,
    description: description,
    // language: language,
    isbn: isbn,
    edition: edition,
    publisher: publisher,
    publishDate: publishDate,
    price: price,
    link: groupLink
  };

  const bookMetadata = {
    count: count
  };

  try {
    console.log(adminPublicKey);
    const assets = await conn.searchAssets('adminGroup');
    if (assets.length > 0) {
      const userTypeId = assets[0].id;
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
        bookData,
        bookMetadata,
        [output],
        adminPublicKey
      );
      const txSigned = driver.Transaction.signTransaction(transactionTx, adminPrivateKey);
      await conn.postTransactionCommit(txSigned)
        .then(res => {
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

module.exports = { addBook, addBookCSV };
