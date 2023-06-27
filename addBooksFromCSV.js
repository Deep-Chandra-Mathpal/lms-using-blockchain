// const fs = require('fs');
// const csv = require('csv-parser');
// const { addBook } = require('./add-book');

// function getRandomCount() {
//   return Math.floor(Math.random() * (70 - 50 + 1)) + 50;
// }

// async function addBooksFromCSV(req, res, filePath) {
//   try {
//     const results = [];

//     // Read the CSV file
//     fs.createReadStream(filePath)
//       .pipe(csv())
//       .on('data', (data) => results.push(data))
//       .on('end', async () => {
//         // Process each book entry, limited to the first 25 books
//         const booksToAdd = results.slice(0, 25);
//         for (const book of booksToAdd) {
//           const { title, author, description, isbn, language } = book;
//           const count = getRandomCount();

//           // Use the existing code to add the book
//           // Make sure to replace `req` and `res` with appropriate parameters
//           req.body = { ...req.body, title, author, description, isbn, language, count };
//           await addBook(req, res);
//         }

//         console.log('First 25 books added successfully!');
//       });
//   } catch (error) {
//     console.error('Error while adding books:', error);
//   }
//   res.redirect('/success');
// }


// // const filePath = 'books.csv';
// // addBooksFromCSV(filePath);

// // Example usage: addBooksFromCSV('books.csv');

// module.exports = {addBooksFromCSV};


const fs = require('fs');
const csv = require('csv-parser');
const { addBookCSV } = require('./add-book');

function getRandomCount() {
  return Math.floor(Math.random() * (70 - 50 + 1)) + 50;
}

async function addBooksFromCSV(req, res, filePath) {
  try {
    const results = [];

    // Read the CSV file
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        // Process each book entry, limited to the first 25 books
        const booksToAdd = results.slice(0, 25);
        for (const book of booksToAdd) {
          const { title, author, description, isbn, language, edition, publisher, publishDate, price } = book;
          const count = getRandomCount();

          // Use the existing code to add the book
          // Make sure to replace `req` and `res` with appropriate parameters
          req.body = { ...req.body, title, author, description, isbn, language, edition, publisher, publishDate, price, count };
          await addBookCSV(req, res);
        }

        console.log('First 25 books added successfully!');
      });
  } catch (error) {
    console.error('Error while adding books:', error);
  }
  res.redirect('/success');
}

module.exports = { addBooksFromCSV };
