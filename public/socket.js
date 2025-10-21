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
        console.log("📩 Private message received:", payload);
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
function sendPrivateMessage(toUuid, message) {
  const fromUuid = API.getUuid();
  console.log("📤 Sending private message to", toUuid, "from", fromUuid, "message:", message);
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
  const onlineUsers = document.getElementById("onlineUsers");
  onlineUsers.innerHTML = "";
  const ul = document.createElement("ul");
  users.forEach(u => {
    if (API.getUsername() === u.username) return;
    const li = document.createElement("li");
    li.className = "cursor-pointer text-black font-bold hover:bg-slate-100 transition-colors duration-200 border bg-white rounded p-1 flex items-center gap-2";
    li.dataset.uuid = u.uuid;
    li.innerHTML = `
      <span class="inline-block w-2 h-2 rounded-full bg-green-500 ml-1"></span>
      ${u.username}
    `;
    ul.appendChild(li);
  });
  onlineUsers.appendChild(ul);
  attachUserClickHandlers();
}

// Attach click listeners to user list items
function attachUserClickHandlers() {
  document.querySelectorAll("#onlineUsers li, #offlineUsers li").forEach(li => {
    li.onclick = () => {
      const username = li.textContent.trim();
      const uuid = li.dataset.uuid;
      openPrivateChatDrawer(username, uuid);
    };
  });
}

function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

function openPrivateChatDrawer(username, uuid) {
  const drawer = document.getElementById("privateChatDrawer");
  drawer.dataset.uuid = uuid; 
  const containerId = "privateChatDrawerContainer";
  let container = document.getElementById(containerId);

  const userListItems = document.querySelectorAll("#onlineUsers li, #offlineUsers li");
  userListItems.forEach(li => {
    if (li.dataset.uuid === uuid) {
      const dot = li.querySelector(".private-msg-dot");
      if (dot) dot.remove();
    }
  });

  // If container doesn't exist, create it
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.className = "relative bg-slate-300 w-full h-full flex flex-col rounded-l-lg";
    drawer.appendChild(container);
  }

  // Set content
  container.innerHTML = `
    <div class="flex justify-between items-center p-4 border-b">
      <div class="flex items-center">
        <span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
        <span id="username" class="font-bold text-lg">${username}</span>
      </div>
      <button id="closePrivateChatDrawer" class="px-3 py-1 bg-slate-500 text-white rounded hover:bg-slate-600 transition">Close</button>
    </div>
    <div id="privateChatContent" class="flex-1 bg-slate-100 p-4 overflow-y-auto"></div>
    <form id="privateChatForm" class="flex p-4 border-t items-center">
      <textarea id="privateChatInput" rows="3" class="flex-1 border bg-white rounded px-2 py-1 resize-none" placeholder="Type a message..." autocomplete="off"></textarea>      
      <button type="submit" class="ml-2 px-3 py-1 h-8 bg-blue-500 text-white rounded hover:bg-blue-600 transition">Send</button>
    </form>
  `;

  const chatContent = document.getElementById("privateChatContent");
  chatContent.innerHTML = "";

  let currentPage = 1;
  let loading = false;
  let allLoaded = false;

  // Helper to render a batch of messages (prepend if needed)
  function renderMessages(messages, { prepend = false } = {}) {
    const fragment = document.createDocumentFragment();
    messages.forEach(msg => {
      const time = (() => {
        if (msg.sent) {
          const d = new Date(msg.sent);
          if (!isNaN(d)) {
            const hours = d.getHours().toString().padStart(2, "0");
            const minutes = d.getMinutes().toString().padStart(2, "0");
            return `${hours}:${minutes}`;
          }
        }
        return "";
      })();
      const isSentByMe = msg.from_id === API.getUuid();
      const el = document.createElement("div");
      if (isSentByMe) {
        el.className = "mb-1 border border-white bg-teal-400 p-1 rounded flex items-center self-end justify-end ml-auto max-w-1/2 w-fit";
      } else {
        el.className = "mb-1 border border-white bg-white p-1 rounded flex items-center max-w-1/2 w-fit";
      }
      el.innerHTML = `
        <span class="flex-1 ${isSentByMe ? "text-right" : ""}">${msg.message}</span>
        <span class="ml-2 text-xs text-gray-700">${time}</span>
      `;
      fragment.appendChild(el);
    });
    if (prepend) {
      chatContent.prepend(fragment);
    } else {
      chatContent.appendChild(fragment);
    }
  }

  // Initial load
  function loadMessages(page, { prepend = false } = {}) {
    if (loading || allLoaded) return;
    loading = true;
    API.getMessagesWith(uuid, { page, limit: 20 }).then(data => {
      if (!data.data || data.data.length === 0) {
        allLoaded = true;
      } else {
        renderMessages(data.data, { prepend });
        if (!prepend) chatContent.scrollTop = chatContent.scrollHeight;
      }
      loading = false;
    });
  }

  loadMessages(currentPage);

  // Debounced infinite scroll handler
  const debouncedScroll = debounce(function () {
    if (chatContent.scrollTop < 50 && !loading && !allLoaded) {
      loading = true; // Move this up to prevent double firing
      const prevHeight = chatContent.scrollHeight;
      currentPage += 1;
      API.getMessagesWith(uuid, { page: currentPage, limit: 20 }).then(data => {
        if (!data.data || data.data.length === 0) {
          allLoaded = true;
        } else {
          renderMessages(data.data, { prepend: true });
          // Maintain scroll position after prepending
          chatContent.scrollTop = chatContent.scrollHeight - prevHeight;
        }
        loading = false;
      });
    }
  }, 1000);

  chatContent.onscroll = debouncedScroll;

  // Show drawer with transition (like postProfile)
  drawer.classList.remove("translate-x-full", "opacity-0");
  drawer.classList.add("translate-x-0", "opacity-100");

  // Close button logic
  document.getElementById("closePrivateChatDrawer").onclick = () => {
    drawer.classList.remove("translate-x-0", "opacity-100");
    drawer.classList.add("translate-x-full", "opacity-0");
    setTimeout(() => {
      container.innerHTML = "";
    }, 500); // match transition duration
  };

  // Send message logic
  document.getElementById("privateChatForm").onsubmit = (e) => {
    e.preventDefault();
    const input = document.getElementById("privateChatInput");
    const msg = input.value.trim();
    if (msg) {
      sendPrivateMessage(uuid, msg);
      input.value = "";
      // Locally show the sent message as a teal bubble on the right
      const chatContent = document.getElementById("privateChatContent");
      if (chatContent) {
        const time = (() => {
          const d = new Date();
          const hours = d.getHours().toString().padStart(2, "0");
          const minutes = d.getMinutes().toString().padStart(2, "0");
          return `${hours}:${minutes}`;
        })();
        const el = document.createElement("div");
        el.className = "mb-1 border border-white bg-teal-400 p-1 rounded flex items-center self-end justify-end ml-auto max-w-1/2 w-fit";
        el.innerHTML = `
          <span class="flex-1 text-right">${msg}</span>
          <span class="ml-2 text-xs text-gray-700">${time}</span>
        `;
        chatContent.appendChild(el);
        chatContent.scrollTop = chatContent.scrollHeight;
      }
    }
  };
}

function showPrivateMessage(msg) {
  const drawer = document.getElementById("privateChatDrawer");
  const container = document.getElementById("privateChatDrawerContainer");
  const username = document.getElementById("username");

  // Format timestamp (show only HH:MM)
  let time = "";
  if (msg.sent) {
    const d = new Date(msg.sent);
    if (!isNaN(d)) {
      const hours = d.getHours().toString().padStart(2, "0");
      const minutes = d.getMinutes().toString().padStart(2, "0");
      time = `${hours}:${minutes}`;
    }
  }

  // Check if drawer is open and showing the sender (by uuid)
  const drawerOpen = drawer.classList.contains("translate-x-0") && drawer.classList.contains("opacity-100");
  const isActiveChat = drawerOpen && drawer.dataset.uuid === msg.from_user;

  if (isActiveChat) {
    // Drawer is open with the sender, render message inside
    const chatContent = document.getElementById("privateChatContent");
    if (chatContent) {
      const el = document.createElement("div");
      el.className = "mb-1 mr-1 border border-white bg-white p-1 rounded flex items-center max-w-1/2 w-fit";
      el.innerHTML = `
        <span class="flex-1">${msg.message}</span>
        <span class="ml-2 text-xs text-gray-500">${time}</span>
      `;
      chatContent.appendChild(el);
      chatContent.scrollTop = chatContent.scrollHeight;
    }
  } else {
    // Drawer is closed or open with someone else, show yellow dot next to sender in user list
    const userListItems = document.querySelectorAll("#onlineUsers li, #offlineUsers li");
    userListItems.forEach(li => {
      if (li.dataset.uuid === msg.from_user) {
        let dot = li.querySelector(".private-msg-dot");
        if (!dot) {
          dot = document.createElement("span");
          dot.className = "private-msg-dot absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-yellow-400 animate-breath";
          li.classList.add("relative");
          const usernameSpan = li.querySelector("span:nth-child(2)");
          if (usernameSpan) usernameSpan.after(dot);
          else li.appendChild(dot);
        }
      }
    });
  }
}

window.SocketAPI = { connectSocket, sendPrivateMessage };