let socket = null;
let lastActiveUserUuid = null;

function connectSocket() {
  const token = API.getToken();
  if (!token) return;

  // Fetch latest messages and render users BEFORE opening the socket
  API.getLatestMessages().then(data => {
    if (data.data && Array.isArray(data.data)) {
      renderOnlineUsers(data.data, "function");
    }
    API.getUnreadMessages().then(unreadData => {
      if (unreadData.data && typeof unreadData.data === "object") {
        unreadMap = unreadData.data; // { uuid: count, ... }
        // After rendering users, add yellow orb to those with unread
        Object.keys(unreadMap).forEach(uuid => {
          if (unreadMap[uuid]) {
            const li = document.querySelector(`#onlineUsers li[data-uuid="${uuid}"]`);
            if (li && !li.querySelector('.private-msg-dot')) {
              const dot = document.createElement("span");
              dot.className = "private-msg-dot absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-yellow-400 animate-breath";
              li.classList.add("relative");
              li.appendChild(dot);
            }
          }
        });
      }
    });
    console.log("✅ Fetched latest messages before socket connection");
    // Now open the socket
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
          currentOnlineUsers = payload.online || [];
          renderOnlineUsers(currentOnlineUsers, "socket");
          break;
        case "private_message":
          console.log("📩 Private message received:", payload);
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
      if (window.socket === socket) window.socket = null;
    };
  }).catch(err => {
    console.error("Failed to fetch latest messages:", err);
  });
}

// If your backend sets From from the authenticated socket,
// you don't need fromUuid here. Otherwise, pass it in.
function sendPrivateMessage(toUuid, message) {
  const fromUuid = API.getUuid();
  lastActiveUserUuid = toUuid;
  renderOnlineUsers(currentOnlineUsers, "socket");
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

let allUsersCache = [];
let currentOnlineUsers = [];
let unreadMap = {};

function renderOnlineUsers(users, source) {
  const onlineUsers = document.getElementById("onlineUsers");

  if (source === "function") {
    allUsersCache = users;
    onlineUsers.innerHTML = "";
    const ul = onlineUsers;
    users.forEach(u => {
      if (API.getUsername() === u.username) return;
      const li = document.createElement("li");
      li.className = "cursor-pointer text-black font-bold hover:bg-slate-100 transition-colors duration-200 border bg-white rounded p-1 flex items-center gap-2";
      li.dataset.uuid = u.uuid;
      li.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-gray-500 ml-1"></span>
        ${u.username}
      `;
      ul.appendChild(li);
    });
    attachUserClickHandlers();
    return;
  }

  if (source === "socket") {
    const onlineSet = new Set(users.map(u => u.uuid));
    const onlineList = [];
    const offlineList = [];
    allUsersCache.forEach(u => {
      if (API.getUsername() === u.username) return;
      if (onlineSet.has(u.uuid)) {
        onlineList.push(u);
      } else {
        offlineList.push(u);
      }
    });

    // Move lastActiveUserUuid to top of their group
    function moveToTop(list) {
      if (!lastActiveUserUuid) return list;
      const idx = list.findIndex(u => u.uuid === lastActiveUserUuid);
      if (idx > -1) {
        const [user] = list.splice(idx, 1);
        list.unshift(user);
      }
      return list;
    }

    const onlineListOrdered = moveToTop([...onlineList]);
    const offlineListOrdered = moveToTop([...offlineList]);

    onlineUsers.innerHTML = "";
    const ul = onlineUsers;
    [...onlineListOrdered, ...offlineListOrdered].forEach(u => {
      const li = document.createElement("li");
      li.className = "cursor-pointer text-black font-bold hover:bg-slate-100 transition-colors duration-200 border bg-white rounded p-1 flex items-center gap-2";
      li.dataset.uuid = u.uuid;
      const dotColor = onlineSet.has(u.uuid) ? "bg-green-500" : "bg-gray-500";
      const hasUnread = unreadMap[u.uuid];
      li.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full ${dotColor} ml-1"></span>
        ${u.username}
        ${hasUnread ? '<span class="private-msg-dot absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-yellow-400 animate-breath"></span>' : ''}
      `;
      if (hasUnread) li.classList.add("relative");
      ul.appendChild(li);
    });
    attachUserClickHandlers();

    const drawer = document.getElementById("privateChatDrawer");
    if (drawer && drawer.classList.contains("translate-x-0") && drawer.classList.contains("opacity-100")) {
      const uuid = drawer.dataset.uuid;
      const isOnline = users.some(u => u.uuid === uuid);
      const dot = drawer.querySelector(".flex.items-center span.inline-block");
      if (dot) {
        dot.classList.remove("bg-green-500", "bg-gray-500");
        dot.classList.add(isOnline ? "bg-green-500" : "bg-gray-500");
      }
    }

    return;
  }
}

// Attach click listeners to user list items
function attachUserClickHandlers() {
  document.querySelectorAll("#onlineUsers li").forEach(li => {
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
  unreadMap[uuid] = false;

  const isOnline = currentOnlineUsers.some(u => u.uuid === uuid);

  const userListItems = document.querySelectorAll("#onlineUsers li");
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
        <span class="inline-block w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-500"} mr-2"></span>
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

    function formatDate(dateStr) {
      const d = new Date(dateStr);
      if (isNaN(d)) return "";
      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // --- Render messages and dividers as usual ---
    let lastDate = prepend && chatContent.firstChild
      ? (() => {
        let node = chatContent.firstChild;
        while (node && node.nodeType === 1) {
          if (node.classList.contains("flex") && node.textContent.match(/\d{2}\/\d{2}\/\d{4}/)) {
            return node.textContent.match(/\d{2}\/\d{2}\/\d{4}/)[0];
          }
          if (node.dataset && node.dataset.sent) {
            return formatDate(node.dataset.sent);
          }
          node = node.nextSibling;
        }
        return null;
      })()
      : chatContent._lastDate || null;

    messages.forEach((msg, idx) => {
      const msgDate = formatDate(msg.sent);

      // Only insert divider if previous element in fragment is not already a divider for this date
      const prevIsDivider =
        fragment.childNodes.length > 0 &&
        fragment.lastChild.classList &&
        fragment.lastChild.classList.contains("flex") &&
        fragment.lastChild.textContent.includes(msgDate);

      if (
        msgDate &&
        msgDate !== lastDate &&
        !prevIsDivider
      ) {
        const divider = document.createElement("div");
        divider.className = "flex items-center my-2";
        divider.innerHTML = `
          <span class="flex-1 border-t border-gray-300"></span>
          <span class="mx-2 text-xs text-gray-500 bg-slate-200 rounded px-2 py-0.5">${msgDate}</span>
          <span class="flex-1 border-t border-gray-300"></span>
        `;
        fragment.appendChild(divider);
        lastDate = msgDate;
      }

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
      el.dataset.sent = msg.sent;
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
    chatContent._lastDate = lastDate;

    // --- Remove duplicate dividers for the same date, keep only the first one ---
    const seenDates = new Set();
    const nodesToRemove = [];
    chatContent.childNodes.forEach(node => {
      if (
        node.nodeType === 1 &&
        node.classList.contains("flex") &&
        node.textContent.match(/\d{2}\/\d{2}\/\d{4}/)
      ) {
        const date = node.textContent.match(/\d{2}\/\d{2}\/\d{4}/)[0];
        if (seenDates.has(date)) {
          nodesToRemove.push(node);
        } else {
          seenDates.add(date);
        }
      }
    });
    nodesToRemove.forEach(node => node.remove());
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
        // --- Ensure today's divider exists ---
        const now = new Date();
        const day = now.getDate().toString().padStart(2, "0");
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const year = now.getFullYear();
        const todayStr = `${day}/${month}/${year}`;
  
        let hasTodayDivider = false;
        chatContent.childNodes.forEach(node => {
          if (
            node.nodeType === 1 &&
            node.classList.contains("flex") &&
            node.textContent.includes(todayStr)
          ) {
            hasTodayDivider = true;
          }
        });
  
        if (!hasTodayDivider) {
          const divider = document.createElement("div");
          divider.className = "flex items-center my-2";
          divider.innerHTML = `
            <span class="flex-1 border-t border-gray-300"></span>
            <span class="mx-2 text-xs text-gray-500 bg-slate-200 rounded px-2 py-0.5">${todayStr}</span>
            <span class="flex-1 border-t border-gray-300"></span>
          `;
          chatContent.appendChild(divider);
        }
        // --- End divider check ---
  
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

  lastActiveUserUuid = msg.from_user;

  renderOnlineUsers(currentOnlineUsers, "socket");

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

  if (!isActiveChat) {
    unreadMap[msg.from_user] = true;
  }

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
      API.getMessagesWith(msg.from_user, { page: 1, limit: 0 }); // Mark as read on backend
    }
  } else {
    // Drawer is closed or open with someone else, show yellow dot next to sender in user list
    const userListItems = document.querySelectorAll("#onlineUsers li");
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