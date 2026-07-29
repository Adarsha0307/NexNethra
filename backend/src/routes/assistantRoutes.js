import jwt from 'jsonwebtoken';
import express from 'express';
import { buildAssistantReply } from '../prompts/assistantPrompt.js';
import { askNvidia } from '../utils/nvidia.js';
import { askOpenRouter } from '../utils/openrouter.js';
import { askGemini } from '../utils/gemini.js';
import { addActivity } from '../utils/store.js';

function getUserId(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload.userId || null;
  } catch {
    return null;
  }
}

const router = express.Router();

router.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length < 1) {
    return res.status(400).json({ message: 'A message is required' });
  }

  const userQuery = message.trim();
  const truncatedQuery = userQuery.length > 50 ? userQuery.substring(0, 47) + '...' : userQuery;

  const userId = getUserId(req);
  await addActivity('chat', 'Security Assistant Query', `Queried AI assistant: "${truncatedQuery}"`, userId);

  const systemInstruction = "You are Nexnetra's virtual AI cybersecurity assistant. You provide clear, concise, actionable cybersecurity guidance and educational support. Explain threats, give instructions, recommend security practices, and support incident triage. Respond with highly professional, expert-level advice. Keep your output to a single, rich paragraphs or short points (no longer than 150 words total) so that it formats nicely in the chat window.";

  let responseText = await askNvidia(userQuery, systemInstruction, false);

  if (!responseText) {
    responseText = await askOpenRouter(userQuery, systemInstruction, false);
  }

  if (!responseText) {
    responseText = await askGemini(userQuery, systemInstruction, false);
  }

  if (responseText) {
    return res.json({
      reply: {
        title: 'Nexnetra AI',
        summary: responseText
      },
      createdAt: new Date().toISOString()
    });
  }

  const reply = buildAssistantReply(userQuery);
  return res.json({
    reply,
    createdAt: new Date().toISOString()
  });
});

export default router;