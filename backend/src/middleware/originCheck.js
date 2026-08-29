// SameSite=None cookies are sent on cross-site requests, so state-changing
// requests must prove they originate from an allowed site. Browsers always
// send an Origin header on POST/PUT/PATCH/DELETE; non-browser clients
// (curl, server-to-server) omit it and are allowed through.
export function originCheck(allowedOrigins) {
  const allowed = new Set(allowedOrigins);
  const allowAll = allowed.has('*');
  return (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    const origin = req.headers.origin;
    if (!origin || allowAll || allowed.has(origin)) return next();
    return res.status(403).json({ error: 'Request origin not allowed.' });
  };
}
