/* ============================================================
   PISCES — Messaging Application
   Clean fixed version
   ============================================================ */

// ============================================================
// 1. SUPABASE CONFIGURATION
// ============================================================
const SUPABASE_URL = "https://bqcirfduebffctzqycoy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_V9BLNKZtILO0gq5KYcRlig_LxyY_lNW";

const isConfigured =
  SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY" &&
  SUPABASE_URL.startsWith("http");

let supabaseClient = null;

if (isConfigured && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ============================================================
// 2. APPLICATION STATE
// ============================================================
const state = {
  user: null,
  profile: null,
  conversations: [],
  activeConversation: null,
  messages: {},
  searchResults: [],
  isOnline: navigator.onLine,
  isDemo: !isConfigured,
  subscriptions: []
};

// Demo data
const DEMO_USERS = [
  {
    id: "demo-user-1",
    username: "luna",
    display_name: "Luna Rivera",
    avatar_url: null,
    is_online: true,
    last_seen: new Date().toISOString()
  },
  {
    id: "demo-user-2",
    username: "kai_chen",
    display_name: "Kai Chen",
    avatar_url: null,
    is_online: false,
    last_seen: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "demo-user-3",
    username: "aria",
    display_name: "Aria Sol",
    avatar_url: null,
    is_online: true,
    last_seen: new Date().toISOString()
  },
  {
    id: "demo-user-4",
    username: "noah",
    display_name: "Noah Blake",
    avatar_url: null,
    is_online: false,
    last_seen: new Date(Date.now() - 86400000).toISOString()
  }
];

const DEMO_CONVERSATIONS = [
  {
    id: "conv-1",
    member: DEMO_USERS[0],
    last_message: "Hey! Are you free this weekend?",
    last_message_at: new Date(Date.now() - 300000).toISOString(),
    unread: 2
  },
  {
    id: "conv-2",
    member: DEMO_USERS[1],
    last_message: "Thanks for the help earlier",
    last_message_at: new Date(Date.now() - 7200000).toISOString(),
    unread: 0
  },
  {
    id: "conv-3",
    member: DEMO_USERS[2],
    last_message: "The design looks amazing!",
    last_message_at: new Date(Date.now() - 86400000).toISOString(),
    unread: 0
  }
];

const DEMO_MESSAGES = {
  "conv-1": [
    { id: "m1", sender_id: "demo-user-1", content: "Hi there!", created_at: new Date(Date.now() - 600000).toISOString(), is_read: true },
    { id: "m2", sender_id: "me", content: "Hey Luna! How's it going?", created_at: new Date(Date.now() - 540000).toISOString(), is_read: true },
    { id: "m3", sender_id: "demo-user-1", content: "Pretty good! Working on a new project.", created_at: new Date(Date.now() - 480000).toISOString(), is_read: true },
    { id: "m4", sender_id: "demo-user-1", content: "Hey! Are you free this weekend?", created_at: new Date(Date.now() - 300000).toISOString(), is_read: false }
  ],
  "conv-2": [
    { id: "m5", sender_id: "me", content: "I pushed the fixes to the repo.", created_at: new Date(Date.now() - 8000000).toISOString(), is_read: true },
    { id: "m6", sender_id: "demo-user-2", content: "Thanks for the help earlier", created_at: new Date(Date.now() - 7200000).toISOString(), is_read: true }
  ],
  "conv-3": [
    { id: "m7", sender_id: "demo-user-3", content: "Check out this mockup I made", created_at: new Date(Date.now() - 90000000).toISOString(), is_read: true },
    { id: "m8", sender_id: "me", content: "Wow, this is clean!", created_at: new Date(Date.now() - 87000000).toISOString(), is_read: true },
    { id: "m9", sender_id: "demo-user-3", content: "The design looks amazing!", created_at: new Date(Date.now() - 86400000).toISOString(), is_read: true }
  ]
};

// ============================================================
// 3. HELPERS
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const screens = {
  splash: $("#splash-screen"),
  auth: $("#auth-screen"),
  setup: $("#profile-setup-screen"),
  main: $("#main-app"),
  profile: $("#profile-page"),
  settings: $("#settings-page")
};

function showScreen(name) {
  Object.values(screens).forEach((s) => {
    if (s) {
      s.classList.remove("active");
      s.classList.add("hidden");
    }
  });
  if (screens[name]) {
    screens[name].classList.add("active");
    screens[name].classList.remove("hidden");
  }
}

function showToast(message, type) {
  type = type || "info";
  const container = $("#toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function () {
    toast.style.opacity = "0";
    setTimeout(function () {
      toast.remove();
    }, 300);
  }, 3000);
}

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m";
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < 604800000) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatMessageTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateSeparator(iso) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map(function (w) {
      return w[0];
    })
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function validateUsername(username) {
  if (!username || username.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters." };
  }
  if (username.length > 20) {
    return { valid: false, error: "Username must be 20 characters or less." };
  }
  if (!/^[a-zA-Z0-9._]+$/.test(username)) {
    return { valid: false, error: "Only letters, numbers, underscores and periods allowed." };
  }
  return { valid: true };
}

function generateId() {
  return "id-" + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

function safeOn(id, event, handler) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener(event, handler);
  }
}

// ============================================================
// 4. AUTHENTICATION
// ============================================================
async function initAuth() {
  if (state.isDemo) {
    const saved = localStorage.getItem("pisces_demo_user");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        state.user = data.user;
        state.profile = data.profile;
        return { authenticated: true, needsSetup: !data.profile || !data.profile.username };
      } catch (e) {
        localStorage.removeItem("pisces_demo_user");
      }
    }
    return { authenticated: false };
  }

  if (!supabaseClient) return { authenticated: false };

  const result = await supabaseClient.auth.getSession();
  const session = result.data.session;

  if (session && session.user) {
    state.user = session.user;
    const profile = await loadProfile(session.user.id);
    state.profile = profile;
    return { authenticated: true, needsSetup: !profile || !profile.username };
  }
  return { authenticated: false };
}

async function signInWithGoogle() {
  const loading = $("#auth-loading");
  const errorEl = $("#auth-error");

  if (errorEl) errorEl.classList.add("hidden");
  if (loading) loading.classList.remove("hidden");

  try {
    if (state.isDemo) {
      await new Promise(function (r) {
        setTimeout(r, 1000);
      });

      state.user = {
        id: "demo-me",
        email: "you@example.com",
        user_metadata: { full_name: "You" }
      };

      const saved = localStorage.getItem("pisces_demo_user");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.profile && data.profile.username) {
          state.profile = data.profile;
          if (loading) loading.classList.add("hidden");
          enterMainApp();
          return;
        }
      }

      if (loading) loading.classList.add("hidden");
      showScreen("setup");
      return;
    }

    const result = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + window.location.pathname,
        queryParams: {
          access_type: "offline",
          prompt: "consent"
        }
      }
    });

    if (result.error) throw result.error;
  } catch (err) {
    if (loading) loading.classList.add("hidden");
    if (errorEl) {
      errorEl.textContent = err.message || "Authentication failed.";
      errorEl.classList.remove("hidden");
    }
  }
}

async function signOut() {
  if (!state.isDemo && supabaseClient) {
    await supabaseClient.auth.signOut();
  }

  localStorage.removeItem("pisces_demo_user");
  state.user = null;
  state.profile = null;
  state.conversations = [];
  state.activeConversation = null;
  state.messages = {};

  state.subscriptions.forEach(function (s) {
    if (s && s.unsubscribe) s.unsubscribe();
  });
  state.subscriptions = [];

  showScreen("auth");

  const modal = $("#logout-modal");
  if (modal) modal.classList.add("hidden");
}

// ============================================================
// 5. PROFILE MANAGEMENT
// ============================================================
async function loadProfile(userId) {
  if (state.isDemo) return state.profile;

  const result = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (result.error && result.error.code !== "PGRST116") {
    console.error("Load profile error:", result.error);
    return null;
  }
  return result.data;
}

async function checkUsernameAvailable(username) {
  if (state.isDemo) {
    const taken = DEMO_USERS.some(function (u) {
      return u.username.toLowerCase() === username.toLowerCase();
    });
    if (state.profile && state.profile.username && state.profile.username.toLowerCase() === username.toLowerCase()) {
      return true;
    }
    return !taken;
  }

  const result = await supabaseClient
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  return !result.data;
}

async function saveProfile(options) {
  const username = options.username;
  const display_name = options.display_name;
  const avatar_url = options.avatar_url;
  const bio = options.bio;

  const profileData = {
    id: state.user.id,
    username: username.toLowerCase(),
    display_name: display_name,
    avatar_url: avatar_url || null,
    bio: bio || null,
    updated_at: new Date().toISOString(),
    is_online: true,
    last_seen: new Date().toISOString()
  };

  if (state.isDemo) {
    state.profile = Object.assign({}, profileData, {
      created_at: (state.profile && state.profile.created_at) || new Date().toISOString()
    });
    localStorage.setItem(
      "pisces_demo_user",
      JSON.stringify({ user: state.user, profile: state.profile })
    );
    return state.profile;
  }

  const result = await supabaseClient
    .from("profiles")
    .upsert(profileData)
    .select()
    .single();

  if (result.error) throw result.error;
  state.profile = result.data;
  return result.data;
}

// ============================================================
// 6. PROFILE SETUP UI
// ============================================================
function initProfileSetup() {
  const form = $("#profile-setup-form");
  if (!form) return;

  const usernameInput = $("#setup-username");
  const displayInput = $("#setup-displayname");
  const avatarInput = $("#avatar-input");
  const avatarPreview = $("#avatar-preview");
  const errorEl = $("#username-error");
  let avatarDataUrl = null;

  if (state.user && state.user.user_metadata && state.user.user_metadata.full_name && displayInput) {
    displayInput.value = state.user.user_metadata.full_name;
  }

  if (avatarInput) {
    avatarInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        showToast("Image must be under 2 MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = function (ev) {
        avatarDataUrl = ev.target.result;
        if (avatarPreview) {
          avatarPreview.innerHTML = "";
          const img = document.createElement("img");
          img.src = avatarDataUrl;
          avatarPreview.appendChild(img);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  let usernameTimeout;
  if (usernameInput) {
    usernameInput.addEventListener("input", function () {
      clearTimeout(usernameTimeout);
      if (errorEl) errorEl.classList.add("hidden");
      const val = usernameInput.value.trim();
      if (!val) return;

      const validation = validateUsername(val);
      if (!validation.valid) {
        if (errorEl) {
          errorEl.textContent = validation.error;
          errorEl.classList.remove("hidden");
        }
        return;
      }

      usernameTimeout = setTimeout(async function () {
        const available = await checkUsernameAvailable(val);
        if (!available && errorEl) {
          errorEl.textContent = "This username is already taken.";
          errorEl.classList.remove("hidden");
        }
      }, 400);
    });
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const username = usernameInput ? usernameInput.value.trim() : "";
    const display_name = displayInput ? displayInput.value.trim() : "";

    const validation = validateUsername(username);
    if (!validation.valid) {
      if (errorEl) {
        errorEl.textContent = validation.error;
        errorEl.classList.remove("hidden");
      }
      return;
    }

    if (!display_name) {
      showToast("Please enter a display name", "error");
      return;
    }

    const available = await checkUsernameAvailable(username);
    if (!available) {
      if (errorEl) {
        errorEl.textContent = "This username is already taken.";
        errorEl.classList.remove("hidden");
      }
      return;
    }

    const loading = $("#setup-loading");
    if (loading) loading.classList.remove("hidden");

    try {
      await saveProfile({
        username: username,
        display_name: display_name,
        avatar_url: avatarDataUrl
      });
      if (loading) loading.classList.add("hidden");
      enterMainApp();
    } catch (err) {
      if (loading) loading.classList.add("hidden");
      showToast(err.message || "Failed to save profile", "error");
    }
  });
}
// ============================================================
// 7. CONVERSATIONS
// ============================================================
async function loadConversations() {
  if (state.isDemo) {
    state.conversations = DEMO_CONVERSATIONS.slice();
    renderConversationList();
    return;
  }

  try {
    state.conversations = [];
    renderConversationList();
  } catch (err) {
    console.error(err);
    showToast("Failed to load conversations", "error");
  }
}

function renderConversationList() {
  const list = $("#conversation-list");
  const empty = $("#empty-conversations");
  if (!list) return;

  list.innerHTML = "";

  if (!state.conversations.length) {
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");

  const sorted = state.conversations.slice().sort(function (a, b) {
    return new Date(b.last_message_at) - new Date(a.last_message_at);
  });

  sorted.forEach(function (conv) {
    const item = document.createElement("div");
    item.className = "conversation-item";
    if (state.activeConversation && state.activeConversation.id === conv.id) {
      item.classList.add("active");
    }

    const member = conv.member;
    const initials = getInitials(member.display_name);

    let avatarHtml = "";
    if (member.avatar_url) {
      avatarHtml = '<img class="conv-avatar" src="' + escapeHtml(member.avatar_url) + '" alt="" />';
    } else {
      avatarHtml = '<div class="conv-avatar-fallback">' + initials + "</div>";
    }

    let onlineHtml = member.is_online ? '<span class="online-dot"></span>' : "";
    let unreadHtml = "";
    if (conv.unread > 0) {
      unreadHtml = '<span class="unread-badge">' + (conv.unread > 99 ? "99+" : conv.unread) + "</span>";
    }

    item.innerHTML =
      '<div class="conv-avatar-wrap">' +
      avatarHtml +
      onlineHtml +
      "</div>" +
      '<div class="conv-info">' +
      '<div class="conv-top">' +
      '<span class="conv-name">' +
      escapeHtml(member.display_name) +
      "</span>" +
      '<span class="conv-time">' +
      formatTime(conv.last_message_at) +
      "</span>" +
      "</div>" +
      '<div class="conv-bottom">' +
      '<span class="conv-preview">' +
      escapeHtml(conv.last_message || "") +
      "</span>" +
      unreadHtml +
      "</div>" +
      '<span class="conv-username">@' +
      escapeHtml(member.username) +
      "</span>" +
      "</div>";

    item.addEventListener("click", function () {
      openConversation(conv);
    });
    list.appendChild(item);
  });
}

// ============================================================
// 8. CHAT / MESSAGES
// ============================================================
function openConversation(conv) {
  state.activeConversation = conv;

  const welcome = $("#chat-welcome");
  const chatView = $("#chat-view");
  const mainApp = $("#main-app");

  if (welcome) welcome.classList.add("hidden");
  if (chatView) chatView.classList.remove("hidden");
  if (mainApp) mainApp.classList.add("chat-open");

  const member = conv.member;
  const avatarEl = $("#chat-avatar");
  const fallbackEl = $("#chat-avatar-fallback");
  const onlineDot = $("#chat-online-dot");

  if (member.avatar_url && avatarEl) {
    avatarEl.src = member.avatar_url;
    avatarEl.classList.remove("hidden");
    if (fallbackEl) fallbackEl.classList.add("hidden");
  } else {
    if (avatarEl) avatarEl.classList.add("hidden");
    if (fallbackEl) {
      fallbackEl.classList.remove("hidden");
      fallbackEl.textContent = getInitials(member.display_name);
    }
  }

  if (onlineDot) {
    if (member.is_online) onlineDot.classList.remove("hidden");
    else onlineDot.classList.add("hidden");
  }

  const nameEl = $("#chat-display-name");
  const statusEl = $("#chat-status");
  if (nameEl) nameEl.textContent = member.display_name;
  if (statusEl) statusEl.textContent = member.is_online ? "online" : "@" + member.username;

  conv.unread = 0;
  renderConversationList();
  loadMessages(conv.id);
}

function closeChat() {
  state.activeConversation = null;
  const chatView = $("#chat-view");
  const welcome = $("#chat-welcome");
  const mainApp = $("#main-app");

  if (chatView) chatView.classList.add("hidden");
  if (welcome) welcome.classList.remove("hidden");
  if (mainApp) mainApp.classList.remove("chat-open");
  renderConversationList();
}

async function loadMessages(conversationId) {
  const list = $("#messages-list");
  if (!list) return;
  list.innerHTML = "";

  let messages = [];
  if (state.isDemo) {
    messages = DEMO_MESSAGES[conversationId] || [];
  } else {
    try {
      const result = await supabaseClient
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (result.error) throw result.error;
      messages = result.data || [];
    } catch (err) {
      showToast("Failed to load messages", "error");
      return;
    }
  }

  state.messages[conversationId] = messages;
  renderMessages(messages);
  scrollToBottom();
}

function renderMessages(messages) {
  const list = $("#messages-list");
  if (!list) return;
  list.innerHTML = "";

  let lastDate = null;

  messages.forEach(function (msg) {
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== lastDate) {
      lastDate = msgDate;
      const sep = document.createElement("div");
      sep.className = "date-separator";
      sep.innerHTML = "<span>" + formatDateSeparator(msg.created_at) + "</span>";
      list.appendChild(sep);
    }

    const isSent = msg.sender_id === "me" || (state.user && msg.sender_id === state.user.id);
    const el = document.createElement("div");
    el.className = "message " + (isSent ? "sent" : "received");

    let statusIcon = "";
    if (isSent) {
      if (msg.is_read) {
        statusIcon = '<span class="message-status read"><i data-lucide="check-check"></i></span>';
      } else {
        statusIcon = '<span class="message-status"><i data-lucide="check"></i></span>';
      }
    }

    el.innerHTML =
      '<div class="message-bubble">' +
      '<div class="message-text">' +
      escapeHtml(msg.content) +
      "</div>" +
      '<div class="message-meta">' +
      '<span class="message-time">' +
      formatMessageTime(msg.created_at) +
      "</span>" +
      statusIcon +
      "</div>" +
      "</div>";

    list.appendChild(el);
  });

  if (window.lucide) lucide.createIcons();
}

function scrollToBottom() {
  const container = $("#messages-container");
  if (container) {
    requestAnimationFrame(function () {
      container.scrollTop = container.scrollHeight;
    });
  }
}

async function sendMessage() {
  const input = $("#message-input");
  if (!input) return;
  const content = input.value.trim();
  if (!content || !state.activeConversation) return;

  const sendBtn = $("#btn-send");
  if (sendBtn) sendBtn.disabled = true;

  const tempId = generateId();
  const msg = {
    id: tempId,
    conversation_id: state.activeConversation.id,
    sender_id: state.isDemo ? "me" : state.user.id,
    content: content,
    message_type: "text",
    created_at: new Date().toISOString(),
    is_read: false
  };

  if (!state.messages[state.activeConversation.id]) {
    state.messages[state.activeConversation.id] = [];
  }
  state.messages[state.activeConversation.id].push(msg);
  renderMessages(state.messages[state.activeConversation.id]);
  scrollToBottom();

  input.value = "";
  autoResizeTextarea(input);
  updateSendButton();

  state.activeConversation.last_message = content;
  state.activeConversation.last_message_at = msg.created_at;
  renderConversationList();

  try {
    if (state.isDemo) {
      await new Promise(function (r) {
        setTimeout(r, 300);
      });
      if (!DEMO_MESSAGES[state.activeConversation.id]) {
        DEMO_MESSAGES[state.activeConversation.id] = [];
      }
      DEMO_MESSAGES[state.activeConversation.id].push(msg);
    } else {
      const result = await supabaseClient
        .from("messages")
        .insert({
          conversation_id: state.activeConversation.id,
          sender_id: state.user.id,
          content: content,
          message_type: "text"
        })
        .select()
        .single();

      if (result.error) throw result.error;

      const idx = state.messages[state.activeConversation.id].findIndex(function (m) {
        return m.id === tempId;
      });
      if (idx !== -1) {
        state.messages[state.activeConversation.id][idx] = result.data;
      }
    }
  } catch (err) {
    showToast("Failed to send message", "error");
    state.messages[state.activeConversation.id] = state.messages[state.activeConversation.id].filter(function (m) {
      return m.id !== tempId;
    });
    renderMessages(state.messages[state.activeConversation.id]);
  }

  if (sendBtn) sendBtn.disabled = false;
}

// ============================================================
// 9. SEARCH
// ============================================================
async function searchUsers(query) {
  if (!query || query.length < 1) {
    state.searchResults = [];
    renderSearchResults();
    return;
  }

  const q = query.toLowerCase().replace(/^@/, "");

  if (state.isDemo) {
    state.searchResults = DEMO_USERS.filter(function (u) {
      return u.username.indexOf(q) !== -1 || u.display_name.toLowerCase().indexOf(q) !== -1;
    });
    renderSearchResults();
    return;
  }

  try {
    const result = await supabaseClient
      .from("profiles")
      .select("id, username, display_name, avatar_url, is_online, last_seen")
      .or("username.ilike.%" + q + "%,display_name.ilike.%" + q + "%")
      .neq("id", state.user.id)
      .limit(20);

    if (result.error) throw result.error;
    state.searchResults = result.data || [];
    renderSearchResults();
  } catch (err) {
    showToast("Search failed", "error");
  }
}

function renderSearchResults() {
  const container = $("#search-results");
  if (!container) return;

  if (!state.searchResults.length) {
    const q = $("#overlay-search-input") ? $("#overlay-search-input").value.trim() : "";
    if (q) {
      container.innerHTML = '<div class="search-hint"><p>No users found for "' + escapeHtml(q) + '"</p></div>';
    } else {
      container.innerHTML = '<div class="search-hint"><p>Search for people by their @username</p></div>';
    }
    return;
  }

  container.innerHTML = "";
  state.searchResults.forEach(function (user) {
    const item = document.createElement("div");
    item.className = "search-result-item";
    const initials = getInitials(user.display_name);

    let avatarHtml = "";
    if (user.avatar_url) {
      avatarHtml = '<img class="conv-avatar" src="' + escapeHtml(user.avatar_url) + '" style="width:48px;height:48px" />';
    } else {
      avatarHtml = '<div class="conv-avatar-fallback" style="width:48px;height:48px;font-size:1rem">' + initials + "</div>";
    }

    item.innerHTML =
      '<div class="conv-avatar-wrap">' +
      avatarHtml +
      (user.is_online ? '<span class="online-dot"></span>' : "") +
      "</div>" +
      '<div class="search-result-info">' +
      '<div class="search-result-name">' +
      escapeHtml(user.display_name) +
      "</div>" +
      '<div class="search-result-username">@' +
      escapeHtml(user.username) +
      "</div>" +
      "</div>";

    item.addEventListener("click", function () {
      startChatWithUser(user);
    });
    container.appendChild(item);
  });
}

async function startChatWithUser(user) {
  let conv = state.conversations.find(function (c) {
    return c.member.id === user.id;
  });

  if (!conv) {
    const newId = generateId();
    conv = {
      id: newId,
      member: user,
      last_message: "",
      last_message_at: new Date().toISOString(),
      unread: 0
    };
    state.conversations.unshift(conv);
    if (state.isDemo) {
      DEMO_MESSAGES[newId] = [];
    }
  }

  const overlay = $("#search-overlay");
  if (overlay) overlay.classList.add("hidden");
  const overlayInput = $("#overlay-search-input");
  if (overlayInput) overlayInput.value = "";
  state.searchResults = [];

  openConversation(conv);
  renderConversationList();
}

function openSearchOverlay() {
  const overlay = $("#search-overlay");
  if (overlay) overlay.classList.remove("hidden");

  const overlayInput = $("#overlay-search-input");
  if (overlayInput) {
    overlayInput.value = "";
    setTimeout(function () {
      overlayInput.focus();
    }, 100);
  }

  state.searchResults = [];
  renderSearchResults();
}

// ============================================================
// 10. UI HELPERS
// ============================================================
function renderProfilePage() {
  const img = $("#profile-page-avatar");
  const fallback = $("#profile-page-avatar-fallback");

  if (state.profile && state.profile.avatar_url && img) {
    img.src = state.profile.avatar_url;
    img.classList.remove("hidden");
    if (fallback) fallback.classList.add("hidden");
  } else {
    if (img) img.classList.add("hidden");
    if (fallback) {
      fallback.classList.remove("hidden");
      fallback.textContent = getInitials(state.profile ? state.profile.display_name : "?");
    }
  }

  const nameEl = $("#profile-page-name");
  const userEl = $("#profile-page-username");
  const joinedEl = $("#profile-page-joined");

  if (nameEl) nameEl.textContent = (state.profile && state.profile.display_name) || "User";
  if (userEl) userEl.textContent = "@" + ((state.profile && state.profile.username) || "username");

  if (state.profile && state.profile.created_at && joinedEl) {
    const d = new Date(state.profile.created_at);
    joinedEl.textContent = "Joined " + d.toLocaleDateString([], { month: "long", year: "numeric" });
  }
}

function autoResizeTextarea(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

function updateSendButton() {
  const input = $("#message-input");
  const btn = $("#btn-send");
  if (!btn) return;
  const hasText = input && input.value.trim().length > 0;
  btn.disabled = !hasText;
}

// ============================================================
// 11. THEME
// ============================================================
function applyTheme(theme) {
  document.body.classList.remove("theme-dark", "theme-blue", "theme-green", "theme-purple");
  if (theme && theme !== "default") {
    document.body.classList.add("theme-" + theme);
  }
  localStorage.setItem("pisces_theme", theme || "default");
}

function initTheme() {
  const saved = localStorage.getItem("pisces_theme") || "default";
  applyTheme(saved);
}

function addThemeSettings() {
  const settingsContent = document.querySelector(".settings-content");
  if (!settingsContent || document.getElementById("theme-section")) return;

  const themeSection = document.createElement("div");
  themeSection.className = "settings-section";
  themeSection.id = "theme-section";
  themeSection.innerHTML =
    "<h3>Appearance</h3>" +
    '<div class="settings-item">' +
    '<i data-lucide="sun-moon"></i>' +
    "<span>Theme</span>" +
    '<select id="theme-select" class="settings-select">' +
    '<option value="default">Orange (Default)</option>' +
    '<option value="dark">Dark Mode</option>' +
    '<option value="blue">Blue</option>' +
    '<option value="green">Green</option>' +
    '<option value="purple">Purple</option>' +
    "</select>" +
    "</div>";

  if (settingsContent.children.length > 1) {
    settingsContent.insertBefore(themeSection, settingsContent.children[1]);
  } else {
    settingsContent.appendChild(themeSection);
  }

  if (window.lucide) lucide.createIcons();

  const select = document.getElementById("theme-select");
  if (select) {
    select.value = localStorage.getItem("pisces_theme") || "default";
    select.addEventListener("change", function (e) {
      applyTheme(e.target.value);
    });
  }
}

// ============================================================
// 12. EDIT PROFILE
// ============================================================
function openEditProfile() {
  if (!state.profile) {
    showToast("Profile not loaded", "error");
    return;
  }

  const content = document.querySelector(".profile-content");
  if (!content) return;

  const currentName = state.profile.display_name || "";
  const currentUser = state.profile.username || "";
  const currentBio = state.profile.bio || "";

  let avatarHtml = "";
  if (state.profile.avatar_url) {
    avatarHtml = '<img src="' + state.profile.avatar_url + '" alt="Avatar" />';
  } else {
    avatarHtml = '<div class="avatar-fallback large">' + getInitials(currentName) + "</div>";
  }

  content.innerHTML =
    '<div class="profile-avatar-section">' +
    '<div class="profile-avatar-large" id="edit-avatar-preview">' + avatarHtml + "</div>" +
    '<label for="edit-avatar-input" class="avatar-edit-btn" style="position:relative;margin-top:-20px;">' +
    '<i data-lucide="camera"></i></label>' +
    '<input type="file" id="edit-avatar-input" accept="image/*" hidden />' +
    "</div>" +
    '<form id="edit-profile-form" class="edit-profile-form">' +
    '<div class="form-group"><label>Display Name</label>' +
    '<input type="text" id="edit-displayname" value="' + escapeHtml(currentName) + '" maxlength="40" required /></div>' +
    '<div class="form-group"><label>Username</label>' +
    '<div class="input-with-prefix"><span class="prefix">@</span>' +
    '<input type="text" id="edit-username" value="' + escapeHtml(currentUser) + '" maxlength="20" required /></div></div>' +
    '<div class="form-group"><label>Bio / Description</label>' +
    '<textarea id="edit-bio" placeholder="Tell people a little about yourself..." maxlength="150">' + escapeHtml(currentBio) + "</textarea></div>" +
    '<button type="submit" class="btn-primary btn-full">Save Changes</button>' +
    "</form>";

  if (window.lucide) lucide.createIcons();

  // Avatar change
  const avatarInput = document.getElementById("edit-avatar-input");
  if (avatarInput) {
    avatarInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (ev) {
        const preview = document.getElementById("edit-avatar-preview");
        if (preview) {
          preview.innerHTML = '<img src="' + ev.target.result + '" alt="Avatar" />';
        }
        state._tempAvatar = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Save button
  const form = document.getElementById("edit-profile-form");
  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      e.stopPropagation();

      const displayNameEl = document.getElementById("edit-displayname");
      const usernameEl = document.getElementById("edit-username");
      const bioEl = document.getElementById("edit-bio");

      const display_name = displayNameEl ? displayNameEl.value.trim() : "";
      const username = usernameEl ? usernameEl.value.trim().toLowerCase() : "";
      const bio = bioEl ? bioEl.value.trim() : "";

      if (!display_name || !username) {
        showToast("Name and username are required", "error");
        return;
      }

      const validation = validateUsername(username);
      if (!validation.valid) {
        showToast(validation.error, "error");
        return;
      }

      try {
        showToast("Saving...", "info");

        await saveProfile({
          username: username,
          display_name: display_name,
          avatar_url: state._tempAvatar || state.profile.avatar_url,
          bio: bio
        });

        showToast("Profile updated successfully!", "success");
        renderProfilePage();

      } catch (err) {
        console.error("Save profile error:", err);
        showToast(err.message || "Failed to save profile", "error");
      }
    });
  }
}

// ============================================================
// 13. EVENTS
// ============================================================
function bindEvents() {
  safeOn("google-signin-btn", "click", signInWithGoogle);

  safeOn("btn-settings", "click", function () {
    if (screens.settings) {
      screens.settings.classList.remove("hidden");
      screens.settings.classList.add("active");
      setTimeout(addThemeSettings, 150);
    }
  });

  safeOn("settings-back", "click", function () {
    if (screens.settings) {
      screens.settings.classList.add("hidden");
      screens.settings.classList.remove("active");
    }
  });

  safeOn("settings-edit-profile", "click", function () {
    if (screens.settings) {
      screens.settings.classList.add("hidden");
      screens.settings.classList.remove("active");
    }
    if (screens.profile) {
      screens.profile.classList.remove("hidden");
      screens.profile.classList.add("active");
    }
    openEditProfile();
  });

  safeOn("settings-about", "click", function () {
    const modal = $("#about-modal");
    if (modal) modal.classList.remove("hidden");
  });

  safeOn("about-close", "click", function () {
    const modal = $("#about-modal");
    if (modal) modal.classList.add("hidden");
  });

  safeOn("profile-back", "click", function () {
    if (screens.profile) {
      screens.profile.classList.add("hidden");
      screens.profile.classList.remove("active");
    }
  });

  safeOn("profile-edit-btn", "click", openEditProfile);
  safeOn("btn-logout", "click", function () {
    const modal = $("#logout-modal");
    if (modal) modal.classList.remove("hidden");
  });
  safeOn("logout-cancel", "click", function () {
    const modal = $("#logout-modal");
    if (modal) modal.classList.add("hidden");
  });
  safeOn("logout-confirm", "click", signOut);
  safeOn("chat-back", "click", closeChat);
  safeOn("btn-send", "click", sendMessage);
  safeOn("fab-new-chat", "click", openSearchOverlay);
  safeOn("search-overlay-back", "click", function () {
    const overlay = $("#search-overlay");
    if (overlay) overlay.classList.add("hidden");
    const input = $("#overlay-search-input");
    if (input) input.value = "";
  });
  safeOn("empty-new-chat", "click", openSearchOverlay);

  const msgInput = $("#message-input");
  if (msgInput) {
    msgInput.addEventListener("input", function () {
      autoResizeTextarea(msgInput);
      updateSendButton();
    });
    msgInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  let searchTimeout;
  const overlaySearch = $("#overlay-search-input");
  if (overlaySearch) {
    overlaySearch.addEventListener("input", function (e) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        searchUsers(e.target.value.trim());
      }, 300);
    });
  }

  const mainSearch = $("#main-search-input");
  if (mainSearch) {
    mainSearch.addEventListener("input", function (e) {
      clearTimeout(searchTimeout);
      const q = e.target.value.trim();
      searchTimeout = setTimeout(function () {
        if (q.length > 0) {
          openSearchOverlay();
          const overlayInput = $("#overlay-search-input");
          if (overlayInput) {
            overlayInput.value = q;
            searchUsers(q);
          }
        }
      }, 400);
    });
  }

  const backdrops = $$(".modal-backdrop");
  backdrops.forEach(function (el) {
    el.addEventListener("click", function () {
      if (el.parentElement) el.parentElement.classList.add("hidden");
    });
  });

  window.addEventListener("online", function () {
    state.isOnline = true;
    const banner = $("#offline-banner");
    if (banner) banner.classList.add("hidden");
    showToast("Back online", "success");
  });

  window.addEventListener("offline", function () {
    state.isOnline = false;
    const banner = $("#offline-banner");
    if (banner) banner.classList.remove("hidden");
  });
}
// ============================================================
// 14. BOOT
// ============================================================
async function enterMainApp() {
  showScreen("main");
  await loadConversations();
  if (state.isDemo) {
    const banner = $("#dev-banner");
    if (banner) banner.classList.remove("hidden");
  }
}

async function handleSession(session) {
  if (!session || !session.user) return false;
  state.user = session.user;
  const profile = await loadProfile(session.user.id);
  state.profile = profile;
  if (!profile || !profile.username) {
    showScreen("setup");
  } else {
    enterMainApp();
  }
  return true;
}

async function boot() {
  if (window.lucide) {
    lucide.createIcons();
  }
  initTheme();

  await new Promise(function (r) {
    setTimeout(r, 1100);
  });

  initProfileSetup();
  bindEvents();

  if (!state.isDemo && supabaseClient) {
    supabaseClient.auth.onAuthStateChange(async function (event, session) {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await handleSession(session);
      }
      if (event === "SIGNED_OUT") {
        state.user = null;
        state.profile = null;
        showScreen("auth");
      }
    });

    try {
      const result = await supabaseClient.auth.getSession();
      if (result.error) {
        showScreen("auth");
        return;
      }
      if (result.data.session) {
        await handleSession(result.data.session);
      } else {
        showScreen("auth");
      }
    } catch (err) {
      console.error(err);
      showScreen("auth");
    }
    return;
  }

  // Demo mode
  const authResult = await initAuth();
  if (!authResult.authenticated) {
    showScreen("auth");
  } else if (authResult.needsSetup) {
    showScreen("setup");
  } else {
    enterMainApp();
  }
}

document.addEventListener("DOMContentLoaded", boot);

// ============================================================
// Better protection for avatar selection
// ============================================================
let isSelectingAvatar = false;

document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "hidden") {
    isSelectingAvatar = true;
  } else {
    // When user comes back from file picker
    setTimeout(function () {
      isSelectingAvatar = false;
    }, 800);
  }
});

// Protect the current screen while selecting avatar
const originalShowScreen = showScreen;
showScreen = function (name) {
  if (isSelectingAvatar && (name === "main" || name === "auth")) {
    // Ignore forced navigation back to home while selecting picture
    console.log("Blocked unwanted screen change during avatar select");
    return;
  }
  originalShowScreen(name);
};

// Reset the flag after a short time
document.addEventListener("change", function (e) {
  if (e.target && e.target.type === "file") {
    setTimeout(function () {
      isSelectingAvatar = false;
    }, 1500);
  }
});

// Update browser theme-color when theme changes
function updateThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;

  const primary = getComputedStyle(document.body).getPropertyValue('--primary').trim() || '#FF6B00';
  meta.setAttribute('content', primary);
}

// Call it after applying theme
const oldApplyTheme = applyTheme;
applyTheme = function(theme) {
  oldApplyTheme(theme);
  setTimeout(updateThemeColor, 50);
};

// Initial call
updateThemeColor();