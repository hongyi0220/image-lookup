const express = require('express');
const app = express();
const mongo = require('mongodb').MongoClient;
const imageSearch = require('image-search-google'); // Image search module 
const client = new imageSearch(String(process.env.CSE_ID), String(process.env.API_KEY));
const url = process.env.MONGOLAB_URI;
app.use(express.static('public')); // Serve CSS and JS files

app.get('/', (req, res) => { // Serve homepage
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/recent', (req, res) => { // Serve recent search terms
  mongo.connect(url, (err, db) => {
    if (err) throw err;
    db.collection('lamb').find({}, {_id: 0}) // Find every doc but exclude _id field
    .toArray((err, docs) => {
      if (err) console.err(err);
      res.send(docs);
      db.close();
    });
  });
});
// Parameter is optional
app.get('/[a-zA-Z0-9(%20)]+(/:offset=\\d+)?', (req, res) => {
  const query = req.query; // Shows query string; it's an object {}
  const hasQuery = String(Object.keys(query).length); // See if object is empty
  // Remove query string from url, remove space, '/' i.e. make it pretty for search
  const queryRemoved = req.url.split('?')[0].replace(/(%20)/g, " ").slice(1); 
  
  const offset = req.query.offset; // The value of the param
  // If there's query string, term is queryRemoved else it's url with space and '/' removed
  const term = hasQuery ? queryRemoved : req.url.replace(/(%20)/g, " ").slice(1);
  var options = {page: offset}; // To 'turn' pages with the search results
  
  client.search(term, options)
    .then(images => {
    
      res.send(images);
      mongo.connect(url, (err, db) => {
        if (err) throw err;
        db.collection('lamb')
        // Insert search term and time to database so it can be looked up later
        .insert({'term': term, 'when': new Date()}); 
        db.close();
        
      });
    })
    .catch(e => console.err(e));
});

app.listen(process.env.PORT);