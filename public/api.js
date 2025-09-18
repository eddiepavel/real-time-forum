
const API = (() => {
  const KEY = "rtf_token";

  function getToken() {
    return localStorage.getItem(KEY);
  }
  function setToken(token) {
    if (token) localStorage.setItem(KEY, token);
  }
  function clearToken() {
    localStorage.removeItem(KEY);
  }

  async function request(path, { method = "GET", body, auth = false } = {}) {
    const headers = {
      "Accept": "application/json",
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth) {
      const t = getToken();
      if (t) headers["Authorization"] = `Bearer ${t}`;
    }
    const res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));

    // Your backend responds with an Envelope { data?, error? } 
    if (!res.ok || json.error) {
      const msg = json?.error?.message || `HTTP ${res.status}`;
      const details = json?.error?.details;
      throw new Error(Array.isArray(details) ? `${msg}: ${details.join(", ")}` : msg);
    }
    return json.data;
  }

  async function login(authvalue, password) {
    const data = await request("/login", {
      method: "POST",
      body: { authvalue, password }, // matches PayloadLogin 
    });
    setToken(data.token);
    return data; // { token, expires }
  }

  async function register({ username, email, password, confirm_password }) {
    return request("/register", {
      method: "POST",
      body: { username, email, password, confirm_password }, // matches PayloadUser + confirm rule 
    });
  }

  async function listPosts({ page = 1, limit = 10 } = {}) {
    const search = new URLSearchParams({ page: String(page), limit: String(limit) });
    return request(`/posts?${search.toString()}`);
  }

  async function createPost({ title, content, category, image }) {
    return request("/post/create", { method: "POST", body: { title, content, category, image }, auth: true });
  }

  async function getPost(id) {
    return request(`/posts/${id}`);
  }

  // Comments
  async function listComments(postId, { page = 1, limit = 20 } = {}) {
    const search = new URLSearchParams({ page: String(page), limit: String(limit) });
    return request(`/posts/${postId}/comments?${search.toString()}`);
  }

  async function addComment(postId, body) {
    return request(`/posts/${postId}/comments`, {
      method: "POST",
      body: { body },
      auth: true,
    });
  }
  

  function logoutClientOnly() {
    // backend /logout not implemented yet; just clear locally
    clearToken();
  }

  return { login, register, getToken, logoutClientOnly, listPosts, createPost, getPost, listComments, addComment,};
})();