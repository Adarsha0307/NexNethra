export const ACCESS_COOKIE = 'nexnetra_access';
export const REFRESH_COOKIE = 'nexnetra_refresh';

const IS_PROD = process.env.NODE_ENV === 'production';

// Cross-site topology (Vercel frontend -> Render backend) requires
// SameSite=None + Secure in production. SameSite=Lax is fine locally
// (127.0.0.1:5173 -> 127.0.0.1:4000 are same-site).
export function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: IS_PROD ? 'none' : 'lax',
    secure: IS_PROD || process.env.FORCE_SECURE_COOKIES === 'true',
    path: '/',
  };
}

export function setAuthCookies(res, { accessToken, refreshToken }) {
  const opts = baseCookieOptions();
  res.cookie(ACCESS_COOKIE, accessToken, { ...opts, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...opts, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export function clearAuthCookies(res) {
  const opts = baseCookieOptions();
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
}

export function getAccessTokenFromRequest(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[ACCESS_COOKIE] || null;
}

export function getRefreshTokenFromRequest(req) {
  return req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken || null;
}