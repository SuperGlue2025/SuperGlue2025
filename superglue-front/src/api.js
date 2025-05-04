export const API_BASE = "http://localhost:5001";

export function authHeader() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: "Bearer " + token } : {};
}

export const apiFetch = (url, opts = {}) => {
    return fetch(`${API_BASE}${url}`, {
      ...opts,
     headers: { ...(opts.headers||{}), ...authHeader() }
    });
  };

