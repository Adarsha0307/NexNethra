import express from 'express';
import { addIncident, getIncidents } from '../utils/store.js';

const router = express.Router();

router.get('/', async (req, res) => {
  return res.json(await getIncidents());
});

router.post('/', async (req, res) => {
  const { title, category, description, severity, reporter } = req.body;

  if (!title || !category || !description || !severity || !reporter) {
    return res.status(400).json({ message: 'Title, category, description, severity, and reporter are required' });
  }

  const incident = {
    id: Date.now().toString(),
    title,
    category,
    description,
    severity,
    reporter,
    status: 'Open',
    createdAt: new Date().toISOString()
  };

  const saved = await addIncident(incident);
  return res.status(201).json(saved || incident);
});

export default router;