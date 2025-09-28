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
    return request(`/posts?${search.toString()}`, { auth: true });
  }

  async function createPost({ title, content, category, image }) {
    return request("/post/create", { method: "POST", body: { title, content, category, image }, auth: true });
  }

  async function getPost(id) {
    return request(`/post/${id}`, { auth: true });
  }

  // Comments
  async function listComments(postId, { page = 1, limit = 20 } = {}) {
    const search = new URLSearchParams({ page: String(page), limit: String(limit) });
    return request(`/comments/post/${postId}?${search.toString()}`, { auth: true });
  }

  async function addComment(postId, content) {
    return request(`/comment/create/post/${postId}`, {
      method: "POST",
      body: { content },
      auth: true,
    });
  }

  async function editPost(id, { title, content, category }) {
    return request(`/post/${id}/edit`, {
      method: "PUT",
      body: { title, content, category },
      auth: true,
    });
  }

  async function deletePost(id) {
    return request(`/post/${id}/delete`, {
      method: "DELETE",
      auth: true,
    });
  }

  function logoutClientOnly() {
    // backend /logout not implemented yet; just clear locally
    clearToken();
  }

  return { login, register, getToken, logoutClientOnly, listPosts, createPost, getPost, listComments, addComment, editPost, deletePost };
})();