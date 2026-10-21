import { API_URL } from '../config';

let globalToken = null;

export const setApiToken = (token) => {
  globalToken = token;
};

export const api = async (path, options = {}) => {
  const headers = { ...(options.headers || {}) };
  if (globalToken) headers['Authorization'] = `Bearer ${globalToken}`;
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body instanceof FormData
      ? options.body
      : typeof options.body === 'object'
        ? JSON.stringify(options.body)
        : options.body,
  });
  return res.json().catch(() => ({}));
};
