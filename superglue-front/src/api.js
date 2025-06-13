export const API_BASE = "http://localhost:5001";

export function authHeader() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: "Bearer " + token } : {};
}

export const apiFetch = async (url, opts = {}) => {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...opts,
      headers: { 
        ...(opts.headers || {}), 
        ...authHeader(),
        'Accept': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
};

