// server/index.js

import express from 'express';

const app = express();

// Set the port that you want the server to run on
const PORT = process.env.PORT || 3000; // Changed to 3000 for MacOS since 5000 is taken by AirPlay

//creates an endpoint for the route /api
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from ExpressJS' });
});

// console.log that your server is up and running
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});