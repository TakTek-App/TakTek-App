import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
const app = express();

app.use(cors());

const apiKey = process.env.GOOGLE_MAPS_API_KEY;

app.get('/autocomplete', async (req, res) => {
  const { query } = req.query;
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${query}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching from Google API:', error);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});