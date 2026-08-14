import { getApiUrl } from '../api.js';

let isRefreshing = false;
let refreshQueue = [];

// Tokens live in HttpOnly cookies (set server-side); the client only
// proves its session by sending cookies with `credentials: 'include'`.
function clearTokens() {
  fetch(getApiUrl('/api/auth/logout'), {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {});
  try {
    const url = new URL(window.location.href);
    url.hash = '#/login';
    window.location.replace(url);
  } catch (err) {
    window.location.reload();
  }
}

async function tryRefresh() {
  const res = await fetch(getApiUrl('/api/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!res.ok) throw new Error('Refresh failed');
  return true;
}

async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let res = await fetch(getApiUrl(url), {
    ...options,
    credentials: 'include',
    headers,
  });

  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        await tryRefresh();
        isRefreshing = false;
        refreshQueue.forEach(cb => cb({ ok: true }));
        refreshQueue = [];

        res = await fetch(getApiUrl(url), { ...options, credentials: 'include', headers });
        if (res.ok) return res;
      } catch (err) {
        isRefreshing = false;
        const queue = refreshQueue;
        refreshQueue = [];
        queue.forEach(cb => cb({ ok: false }));
        clearTokens();
        throw new Error('Session expired. Please log in again.');
      }
    } else {
      const result = await new Promise(resolve => {
        refreshQueue.push(resolve);
      });
      if (!result.ok) throw new Error('Session expired. Please log in again.');
      res = await fetch(getApiUrl(url), { ...options, credentials: 'include', headers });
      if (res.ok) return res;
    }
  }

  return res;
}

export async function apiGet(url) {
  const res = await request(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function apiPost(url, body) {
  const res = await request(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function apiPut(url, body) {
  const res = await request(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function apiDelete(url, body) {
  const res = await request(url, {
    method: 'DELETE',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}