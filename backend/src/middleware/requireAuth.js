import { verifyToken } from '../utils/auth.js';
import { getAccessTokenFromRequest } from '../utils/cookies.js';

export function requireAuth(req, res, next) {
  const token = getAccessTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const payload = verifyToken(token);

    if (payload.scope === 'mfa_pending') {
      return res.status(401).json({ error: 'MFA verification required.' });
    }

    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}