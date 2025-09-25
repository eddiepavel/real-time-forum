let socket = null;

function connectSocket() {
  const token = API.getToken();
  if (!token) return;

  socket = new WebSocket(`ws://${window.location.host}/ws?token=${token}`);
  window.socket = socket; // expose globally for main.js to close

  socket.onopen = () => {
    console.log("✅ WebSocket connected");
  };

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    // payload might already be an object; normalize it
    const payload = (typeof msg.payload === "string")
      ? JSON.parse(msg.payload)
      : msg.payload;

    switch (msg.type) {
      case "online_users":
        // server sends { online: [ {uuid, username}, ... ] }
        renderOnlineUsers(payload.online || []);
        break;
      case "private_message":
        // server sends { from_user, to_user, message, sent }
        showPrivateMessage(payload);
        break;
      case "error":
        console.error("❌ Socket error:", payload);
        break;
      default:
        console.warn("ℹ️ Unhandled event type:", msg.type, payload);
    }
  };

  socket.onclose = () => {
    console.log("⚠️ WebSocket disconnected");
    if (window.socket === socket) window.socket = null; // keep in sync
  };
}

// If your backend sets From from the authenticated socket,
// you don't need fromUuid here. Otherwise, pass it in.
function sendPrivateMessage(toUuid, message, fromUuid) {
  const s = window.socket;
  if (!s || s.readyState !== WebSocket.OPEN) {
    console.error("Socket not connected");
    return;
  }
  const payload = fromUuid
    ? { from_user: fromUuid, to_user: toUuid, message }
    : { to_user: toUuid, message }; // backend fills from_user = c.uuid

  s.send(JSON.stringify({
    type: "private_message",
    payload
  }));
}

function renderOnlineUsers(users) {
  const chatDiv = document.getElementById("chat");
  chatDiv.innerHTML = "<h3 class='font-bold mb-3'>Online Users</h3><ul>";
  users.forEach(u => {
    chatDiv.innerHTML += `<li data-uuid="${u.uuid}">${u.username}</li>`;
  });
  chatDiv.innerHTML += "</ul>";
}

function showPrivateMessage(msg) {
  const chatDiv = document.getElementById("chat");
  const el = document.createElement("div");
  el.className = "mt-2";
  el.textContent = `${msg.from_user}: ${msg.message}`;
  chatDiv.appendChild(el);
}

window.SocketAPI = { connectSocket, sendPrivateMessage };