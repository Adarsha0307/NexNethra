import express from 'express';
import { analyzeUrl, analyzeEmail, analyzePassword } from '../services/analyzers.js';
import { addActivity } from '../utils/store.js';

const router = express.Router();

router.post('/url', async (req, res) => {
  const { url } = req.body;
  try {
    const result = await analyzeUrl(url);
    const displayUrl = (url || '').trim();
    const truncatedUrl = displayUrl.length > 50 ? displayUrl.substring(0, 47) + '...' : displayUrl;
    const label = result.label || 'Unknown';
    await addActivity(
      'analysis',
      'URL reputation scan',
      `Analyzed URL: ${truncatedUrl || '(empty)'} — Score: ${result.riskScore || result.score}/100 (${label})`
    );
    return res.json(result);
  } catch (error) {
    console.error('URL analysis error:', error);
    return res.status(500).json({ message: 'Error analyzing URL' });
  }
});

router.post('/email', async (req, res) => {
  const { text } = req.body;
  try {
    const result = await analyzeEmail(text);
    const displayText = (text || '').trim();
    const truncatedText = displayText.length > 50 ? displayText.substring(0, 47) + '...' : displayText;
    await addActivity(
      'analysis',
      'Email phishing analysis',
      `Analyzed email content: "${truncatedText || '(empty)'}" — Score: ${result.score}/100 (${result.label})`
    );
    return res.json(result);
  } catch (error) {
    console.error('Email analysis error:', error);
    return res.status(500).json({ message: 'Error analyzing email' });
  }
});

router.post('/password', async (req, res) => {
  const { password } = req.body;
  try {
    const result = await analyzePassword(password);
    await addActivity(
      'analysis',
      'Password strength check',
      `Performed password strength audit — Score: ${result.score}/100 (${result.label})`
    );
    return res.json(result);
  } catch (error) {
    console.error('Password analysis error:', error);
    return res.status(500).json({ message: 'Error analyzing password' });
  }
});

export default router;
