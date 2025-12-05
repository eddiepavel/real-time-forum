let socket = null;
let lastActiveUserUuid = null;

let allUsersCache = [];
let currentOnlineUsers = [];
let unreadMap = {};
let typingTimeouts = {};

function createElem(tag, className, attrs = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
  return el;
}

function formatDateDMY(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTimeHM(dateStr = Date.now()) {
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function createUnreadDot() {
  const dot = createElem("span", "private-msg-dot absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-yellow-400 animate-breath");
  return dot;
}

function setOnlineDotEl(uuid, onlineSet) {
  const li = document.querySelector(`#onlineUsers li[data-uuid="${uuid}"]`);
  if (!li) return;
  const dotEl = li.querySelector("span.inline-block");
  if (!dotEl) return;
  dotEl.className = `inline-block w-2 h-2 rounded-full ${onlineSet.has(uuid) ? "bg-green-500" : "bg-gray-500"} ml-1`;
}

function addUnreadIndicatorToLi(li) {
  if (!li || li.querySelector(".private-msg-dot")) return;
  li.classList.add("relative");
  li.appendChild(createUnreadDot());
}

function connectSocket() {
  const token = API.getToken();
  if (!token) return;

  Promise.all([
    API.getLatestMessages().catch(() => ({ data: [] })),
    API.getUnreadMessages().catch(() => ({ data: {} }))
  ]).then(([latestData, unreadData]) => {
    if (latestData.data && Array.isArray(latestData.data)) {
      renderOnlineUsers(latestData.data, "function");
    }
    if (unreadData.data && typeof unreadData.data === "object") {
      unreadMap = unreadData.data;
      Object.keys(unreadMap).forEach(uuid => {
        if (unreadMap[uuid]) {
          const li = document.querySelector(`#onlineUsers li[data-uuid="${uuid}"]`);
          if (li) addUnreadIndicatorToLi(li);
        }
      });
    }

    socket = new WebSocket(`ws://${window.location.host}/ws?token=${token}`);
    window.socket = socket;

    socket.onopen = () => console.log("✅ WebSocket connected");

    socket.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch (e) { console.warn("invalid socket message", e); return; }
      const payload = (typeof msg.payload === "string") ? JSON.parse(msg.payload) : msg.payload;
      switch (msg.type) {
        case "online_users":
          currentOnlineUsers = payload.online || [];
          renderOnlineUsers(currentOnlineUsers, "socket");
          break;
        case "private_message":
          showPrivateMessage(payload);
          break;
        case "typing_indicator":
          handleTypingIndicator(payload);
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

    console.log("✅ Fetched latest messages before socket connection");
  }).catch(err => {
    console.error("Failed to initialize socket data:", err);
  });
}

function sendTypingIndicator(toUuid, isTyping) {
  const s = window.socket;
  if (!s || s.readyState !== WebSocket.OPEN) return;
  const payload = { to_user: toUuid, is_typing: isTyping };
  s.send(JSON.stringify({ type: "typing_indicator", payload }));
}

function sendPrivateMessage(toUuid, message) {
  const fromUuid = API.getUuid();
  lastActiveUserUuid = toUuid;
  renderOnlineUsers(currentOnlineUsers, "socket");
  const s = window.socket;
  if (!s || s.readyState !== WebSocket.OPEN) {
    console.error("Socket not connected");
    return;
  }
  const payload = fromUuid ? { from_user: fromUuid, to_user: toUuid, message } : { to_user: toUuid, message };
  s.send(JSON.stringify({ type: "private_message", payload }));
}

function renderOnlineUsers(users, source) {
  const onlineUsers = document.getElementById("onlineUsers");
  if (!onlineUsers) return;

  if (source === "function") {
    allUsersCache = users;
    onlineUsers.innerHTML = "";
    users.forEach(u => {
      if (API.getUsername() === u.username) return;
      const li = createElem("li", "cursor-pointer text-black font-bold hover:bg-slate-100 transition-colors duration-200 border bg-white rounded p-1 flex items-center gap-2");
      li.dataset.uuid = u.uuid;
      li.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-gray-500 ml-1"></span>${u.username}`;
      onlineUsers.appendChild(li);
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
      (onlineSet.has(u.uuid) ? onlineList : offlineList).push(u);
    });

    const moveToTop = (list) => {
      if (!lastActiveUserUuid) return list;
      const i = list.findIndex(x => x.uuid === lastActiveUserUuid);
      if (i > -1) { const [it] = list.splice(i, 1); list.unshift(it); }
      return list;
    };

    const ordered = [...moveToTop(onlineList), ...moveToTop(offlineList)];
    onlineUsers.innerHTML = "";
    ordered.forEach(u => {
      const hasUnread = !!unreadMap[u.uuid];
      const dotColor = onlineSet.has(u.uuid) ? "bg-green-500" : "bg-gray-500";
      const li = createElem("li", "cursor-pointer text-black font-bold hover:bg-slate-100 transition-colors duration-200 border bg-white rounded p-1 flex items-center gap-2");
      li.dataset.uuid = u.uuid;
      li.innerHTML = `<span class="inline-block w-2 h-2 rounded-full ${dotColor} ml-1"></span>${u.username}${hasUnread ? '<span class="private-msg-dot absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-yellow-400 animate-breath"></span>' : ''}`;
      if (hasUnread) li.classList.add("relative");
      onlineUsers.appendChild(li);
    });
    attachUserClickHandlers();

    const drawer = document.getElementById("privateChatDrawer");
    if (drawer && drawer.classList.contains("translate-x-0") && drawer.classList.contains("opacity-100")) {
      const uuid = drawer.dataset.uuid;
      setOnlineDotEl(uuid, onlineSet);
    }
    return;
  }
}

function attachUserClickHandlers() {
  document.querySelectorAll("#onlineUsers li").forEach(li => {
    li.onclick = () => {
      const username = li.childNodes.length > 1 ? li.childNodes[1].textContent.trim() : li.textContent.trim();
      openPrivateChatDrawer(username, li.dataset.uuid);
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
  if (!drawer) return;
  drawer.dataset.uuid = uuid;
  unreadMap[uuid] = false;

  document.querySelectorAll("#onlineUsers li").forEach(li => {
    if (li.dataset.uuid === uuid) {
      const dot = li.querySelector(".private-msg-dot");
      if (dot) dot.remove();
    }
  });

  let container = document.getElementById("privateChatDrawerContainer");
  if (!container) {
    container = createElem("div", "relative bg-slate-300 w-full h-full flex flex-col rounded-l-lg");
    container.id = "privateChatDrawerContainer";
    drawer.appendChild(container);
  }

  const isOnline = currentOnlineUsers.some(u => u.uuid === uuid);
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

  let page = 1;
  let loading = false;
  let allLoaded = false;

  function renderMessages(messages, { prepend = false } = {}) {
    const fragment = document.createDocumentFragment();
    let lastDate = prepend && chatContent.firstChild ? (() => {
      let n = chatContent.firstChild;
      while (n) {
        if (n.dataset && n.dataset.sent) return formatDateDMY(n.dataset.sent);
        n = n.nextSibling;
      }
      return null;
    })() : chatContent._lastDate || null;

    messages.forEach(msg => {
      const msgDate = formatDateDMY(msg.sent);
      const prevIsDivider = fragment.lastChild && fragment.lastChild.classList && fragment.lastChild.classList.contains("flex") && fragment.lastChild.textContent.includes(msgDate);

      if (msgDate && msgDate !== lastDate && !prevIsDivider) {
        const divider = createElem("div", "flex items-center my-2");
        divider.innerHTML = `<span class="flex-1 border-t border-gray-300"></span><span class="mx-2 text-xs text-gray-500 bg-slate-200 rounded px-2 py-0.5">${msgDate}</span><span class="flex-1 border-t border-gray-300"></span>`;
        fragment.appendChild(divider);
        lastDate = msgDate;
      }

      const time = formatTimeHM(msg.sent);
      const isSentByMe = msg.from_id === API.getUuid();
      const el = createElem("div", isSentByMe ? "mb-1 border border-white bg-teal-400 p-1 rounded flex items-center self-end justify-end ml-auto max-w-1/2 w-fit" : "mb-1 border border-white bg-white p-1 rounded flex items-center max-w-1/2 w-fit");
      if (msg.sent) el.dataset.sent = msg.sent;
      el.innerHTML = `<span class="flex-1 ${isSentByMe ? "text-right" : ""}">${msg.message}</span><span class="ml-2 text-xs text-gray-700">${time}</span>`;
      fragment.appendChild(el);
    });

    if (prepend) chatContent.prepend(fragment);
    else chatContent.appendChild(fragment);

    // ensure there's a date divider at the very top after a prepend, when needed
    if (prepend) {
      const topSentNode = Array.from(chatContent.childNodes).find(n => n.nodeType === 1 && n.dataset && n.dataset.sent);
      const topDate = topSentNode ? formatDateDMY(topSentNode.dataset.sent) : null;
      const firstIsDivider = chatContent.firstChild && chatContent.firstChild.classList && chatContent.firstChild.classList.contains("flex") && topDate && chatContent.firstChild.textContent.includes(topDate);
      if (topDate && !firstIsDivider) {
        const topDivider = createElem("div", "flex items-center my-2");
        topDivider.innerHTML = `<span class="flex-1 border-t border-gray-300"></span><span class="mx-2 text-xs text-gray-500 bg-slate-200 rounded px-2 py-0.5">${topDate}</span><span class="flex-1 border-t border-gray-300"></span>`;
        chatContent.prepend(topDivider);
      }
    }

    chatContent._lastDate = lastDate;

    // remove duplicate date dividers (keep first)
    const seen = new Set();
    const toRemove = [];
    chatContent.childNodes.forEach(node => {
      if (node.nodeType === 1 && node.classList.contains("flex") && node.textContent.match(/\d{2}\/\d{2}\/\d{4}/)) {
        const d = node.textContent.match(/\d{2}\/\d{2}\/\d{4}/)[0];
        if (seen.has(d)) toRemove.push(node); else seen.add(d);
      }
    });
    toRemove.forEach(n => n.remove());
  }

  function loadMessages(p, { prepend = false } = {}) {
    if (loading || allLoaded) return;
    loading = true;
    API.getMessagesWith(uuid, { page: p, limit: 20 }).then(data => {
      if (!data.data || data.data.length === 0) {
        allLoaded = true;
      } else {
        renderMessages(data.data, { prepend });
        if (!prepend) chatContent.scrollTop = chatContent.scrollHeight;
      }
      loading = false;
    }).catch(() => { loading = false; });
  }

  loadMessages(page);

  const debouncedScroll = debounce(() => {
    if (chatContent.scrollTop < 50 && !loading && !allLoaded) {
      loading = true;
      const prev = chatContent.scrollHeight;
      page += 1;
      API.getMessagesWith(uuid, { page, limit: 20 }).then(data => {
        if (!data.data || data.data.length === 0) allLoaded = true;
        else {
          renderMessages(data.data, { prepend: true });
          chatContent.scrollTop = chatContent.scrollHeight - prev;
        }
        loading = false;
      }).catch(() => { loading = false; });
    }
  }, 500);

  chatContent.onscroll = debouncedScroll;

  drawer.classList.remove("translate-x-full", "opacity-0");
  drawer.classList.add("translate-x-0", "opacity-100");

  document.getElementById("closePrivateChatDrawer").onclick = () => {
    drawer.classList.remove("translate-x-0", "opacity-100");
    drawer.classList.add("translate-x-full", "opacity-0");
    setTimeout(() => { container.innerHTML = ""; }, 500);
  };

  document.getElementById("privateChatForm").onsubmit = (e) => {
    e.preventDefault();
    const input = document.getElementById("privateChatInput");
    const msg = input.value.trim();
    if (!msg) return;
    sendPrivateMessage(uuid, msg);
    input.value = "";

    const today = formatDateDMY(Date.now());
    let hasDivider = false;
    chatContent.childNodes.forEach(node => {
      if (node.nodeType === 1 && node.classList.contains("flex") && node.textContent.includes(today)) hasDivider = true;
    });

    if (!hasDivider) {
      const divider = createElem("div", "flex items-center my-2");
      divider.innerHTML = `<span class="flex-1 border-t border-gray-300"></span><span class="mx-2 text-xs text-gray-500 bg-slate-200 rounded px-2 py-0.5">${today}</span><span class="flex-1 border-t border-gray-300"></span>`;
      chatContent.appendChild(divider);
    }

    const time = formatTimeHM();
    const el = createElem("div", "mb-1 border border-white bg-teal-400 p-1 rounded flex items-center self-end justify-end ml-auto max-w-1/2 w-fit");
    el.innerHTML = `<span class="flex-1 text-right">${msg}</span><span class="ml-2 text-xs text-gray-700">${time}</span>`;
    chatContent.appendChild(el);
    chatContent.scrollTop = chatContent.scrollHeight;

  };

  // Add typing indicator logic
  const privateChatInput = document.getElementById("privateChatInput");
  let typingTimeout = null;
  let isCurrentlyTyping = false;

  privateChatInput.addEventListener("input", () => {
    if (!isCurrentlyTyping) {
      isCurrentlyTyping = true;
      sendTypingIndicator(uuid, true);
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      isCurrentlyTyping = false;
      sendTypingIndicator(uuid, false);
    }, 2000);
  });

  privateChatInput.addEventListener("blur", () => {
    if (isCurrentlyTyping) {
      clearTimeout(typingTimeout);
      isCurrentlyTyping = false;
      sendTypingIndicator(uuid, false);
    }
  });
}

function showPrivateMessage(msg) {
  const drawer = document.getElementById("privateChatDrawer");
  lastActiveUserUuid = msg.from_user;
  renderOnlineUsers(currentOnlineUsers, "socket");

  const time = formatTimeHM(msg.sent);
  const drawerOpen = drawer && drawer.classList.contains("translate-x-0") && drawer.classList.contains("opacity-100");
  const isActiveChat = drawerOpen && drawer.dataset.uuid === msg.from_user;

  if (!isActiveChat) {
    unreadMap[msg.from_user] = true;
    const li = document.querySelector(`#onlineUsers li[data-uuid="${msg.from_user}"]`);
    if (li) addUnreadIndicatorToLi(li);
    return;
  }

  const chatContent = document.getElementById("privateChatContent");
  if (!chatContent) return;
  const el = createElem("div", "mb-1 mr-1 border border-white bg-white p-1 rounded flex items-center max-w-1/2 w-fit");
  el.innerHTML = `<span class="flex-1">${msg.message}</span><span class="ml-2 text-xs text-gray-500">${time}</span>`;
  chatContent.appendChild(el);
  chatContent.scrollTop = chatContent.scrollHeight;
  API.getMessagesWith(msg.from_user, { page: 1, limit: 0 }).catch(() => {});
}

function handleTypingIndicator(payload) {
  const drawer = document.getElementById("privateChatDrawer");
  if (!drawer) return;
  
  const drawerOpen = drawer.classList.contains("translate-x-0") && drawer.classList.contains("opacity-100");
  const isActiveChat = drawerOpen && drawer.dataset.uuid === payload.from_user;
  
  // Show typing in user list if chat is not open with this user
  if (!isActiveChat) {
    if (payload.is_typing) {
      showTypingInUserList(payload.from_user, payload.username);
    } else {
      hideTypingInUserList(payload.from_user);
    }
    return;
  }
  
  // Hide typing from user list if chat is open
  hideTypingInUserList(payload.from_user);
  
  const chatContent = document.getElementById("privateChatContent");
  if (!chatContent) return;
  
  let typingIndicator = document.getElementById("typingIndicator");
  
  if (payload.is_typing) {
    if (!typingIndicator) {
      typingIndicator = createElem("div", "mb-2 flex items-center gap-2");
      typingIndicator.id = "typingIndicator";
      typingIndicator.innerHTML = `
        <span class="text-sm text-gray-600 font-medium">${payload.username} is typing</span>
        <div class="flex gap-1">
          <span class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
          <span class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
          <span class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
        </div>
      `;
      chatContent.appendChild(typingIndicator);
      chatContent.scrollTop = chatContent.scrollHeight;
    }
  } else {
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }
}

function showTypingInUserList(fromUuid, username) {
  const li = document.querySelector(`#onlineUsers li[data-uuid="${fromUuid}"]`);
  if (!li) return;
  
  // Check if typing indicator already exists
  let typingDots = li.querySelector('.typing-dots');
  if (!typingDots) {
    typingDots = createElem("div", "typing-dots absolute right-2 top-1/2 -translate-y-1/2 flex gap-1");
    typingDots.innerHTML = `
      <span class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
      <span class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
      <span class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
    `;
    li.classList.add("relative");
    li.appendChild(typingDots);
  }
}

function hideTypingInUserList(fromUuid) {
  const li = document.querySelector(`#onlineUsers li[data-uuid="${fromUuid}"]`);
  if (!li) return;
  
  const typingDots = li.querySelector('.typing-dots');
  if (typingDots) {
    typingDots.remove();
  }
}

window.SocketAPI = { connectSocket, sendPrivateMessage };