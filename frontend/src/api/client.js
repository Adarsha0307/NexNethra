import { getApiUrl } from '../api.js';

let isRefreshing = false;
let refreshQueue = [];

function getTokens() {
  return {
    accessToken: localStorage.getItem('nexnetra_token'),
    refreshToken: localStorage.getItem('nexnetra_refresh'),
  };
}

function setTokens(accessToken, refreshToken) {
  localStorage.setItem('nexnetra_token', accessToken);
  if (refreshToken) localStorage.setItem('nexnetra_refresh', refreshToken);
}

function clearTokens() {
  localStorage.removeItem('nexnetra_token');
  localStorage.removeItem('nexnetra_refresh');
  window.location.hash = '#/login';
  window.location.reload();
}

async function tryRefresh() {
  const { refreshToken } = getTokens();
  if (!refreshToken) throw new Error('No refresh token');

  const res = await fetch(getApiUrl('/api/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) throw new Error('Refresh failed');
  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

async function request(url, options = {}) {
  const { accessToken } = getTokens();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(getApiUrl(url), {
    ...options,
    headers,
  });

  if (res.status === 401 && accessToken) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newToken = await tryRefresh();
        isRefreshing = false;
        refreshQueue.forEach(cb => cb(newToken));
        refreshQueue = [];

        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(getApiUrl(url), { ...options, headers });
        if (res.ok) return res;
      } catch {
        isRefreshing = false;
        refreshQueue = [];
        clearTokens();
        throw new Error('Session expired. Please log in again.');
      }
    } else {
      const newToken = await new Promise(resolve => {
        refreshQueue.push(resolve);
      });
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(getApiUrl(url), { ...options, headers });
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

export async function apiDelete(url) {
  const res = await request(url, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
