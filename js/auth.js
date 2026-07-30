(() => {
  "use strict";

  const STORAGE_KEY = "loggedUser";
  const protectedPages = new Set([
    "upload.html",
    "messages.html",
    "my-profile.html",
    "edit-pet.html"
  ]);

  const listeners = new Set();
  let currentUser = readCachedUser();
  let initialized = false;

  function isInsidePagesFolder() {
    return window.location.pathname.includes("/pages/");
  }

  function pageUrl(fileName) {
    return isInsidePagesFolder() ? fileName : `pages/${fileName}`;
  }

  function homeUrl() {
    return isInsidePagesFolder() ? "../index.html" : "index.html";
  }

  function readCachedUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
    } catch (error) {
      console.warn("ThePetGrid: removed invalid cached user.", error);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  function normalizeUser(user) {
    if (!user) return null;
    return {
      id: user.id,
      username:
        user.user_metadata?.username ||
        user.username ||
        user.name ||
        user.email?.split("@")[0] ||
        "Member",
      email: user.email || ""
    };
  }

  function notify(user) {
    window.dispatchEvent(
      new CustomEvent("thepetgrid:auth-changed", { detail: user })
    );
    listeners.forEach((listener) => {
      try { listener(user); } catch (error) { console.error(error); }
    });
  }

  function setCurrentUser(user, { notifyChange = true } = {}) {
    currentUser = normalizeUser(user);

    if (currentUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    if (notifyChange) notify(currentUser);
    return currentUser;
  }

  function getCurrentUser() {
    return currentUser || readCachedUser();
  }

  function getClient() {
    return window.ThePetGridSupabase?.client || null;
  }

  function currentPageName() {
    return window.location.pathname.split("/").pop() || "index.html";
  }

  function loginUrlWithReturn() {
    const returnTo = encodeURIComponent(
      currentPageName() + window.location.search + window.location.hash
    );
    return `${pageUrl("login.html")}?returnTo=${returnTo}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderHeaderAuth() {
    const actions = document.querySelector(".header-actions");
    if (!actions) return;

    const addPetLink = pageUrl("upload.html");
    const loginLink = pageUrl("login.html");
    const profileLink = pageUrl("my-profile.html");
    const user = getCurrentUser();

    if (!user) {
      actions.innerHTML = `
        <a class="add-pet-btn" href="${addPetLink}">+ Add Pet</a>
        <a class="login-btn" href="${loginLink}">Log In</a>
      `;
      return;
    }

    actions.innerHTML = `
      <a class="add-pet-btn" href="${addPetLink}">+ Add Pet</a>
      <div class="user-menu">
        <button class="user-menu__toggle" type="button" aria-expanded="false">
          <span class="user-menu__avatar">👤</span>
          <span>${escapeHtml(user.username).slice(0, 30)}</span>
          <span aria-hidden="true">▾</span>
        </button>
        <div class="user-menu__dropdown" hidden>
          <a href="${profileLink}">My Profile</a>
          <button type="button" data-auth-logout>Log Out</button>
        </div>
      </div>
    `;

    const toggle = actions.querySelector(".user-menu__toggle");
    const dropdown = actions.querySelector(".user-menu__dropdown");
    const logoutButton = actions.querySelector("[data-auth-logout]");

    toggle?.addEventListener("click", (event) => {
      event.stopPropagation();
      dropdown.hidden = !dropdown.hidden;
      toggle.setAttribute("aria-expanded", String(!dropdown.hidden));
    });

    logoutButton?.addEventListener("click", logout);

    document.addEventListener("click", (event) => {
      if (!actions.contains(event.target)) {
        dropdown.hidden = true;
        toggle?.setAttribute("aria-expanded", "false");
      }
    }, { once: true });
  }

  async function initialize() {
    const client = getClient();

    if (!client) {
      initialized = true;
      renderHeaderAuth();
      enforcePageProtection();
      return getCurrentUser();
    }

    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      setCurrentUser(data.session?.user || null, { notifyChange: false });

      client.auth.onAuthStateChange((_event, session) => {
        setCurrentUser(session?.user || null);
        renderHeaderAuth();
      });
    } catch (error) {
      console.error("ThePetGrid: Supabase session initialization failed.", error);
      setCurrentUser(null, { notifyChange: false });
    } finally {
      initialized = true;
      renderHeaderAuth();
      enforcePageProtection();
    }

    return getCurrentUser();
  }

  function enforcePageProtection() {
    if (!protectedPages.has(currentPageName())) return;
    if (getCurrentUser()) return;
    window.location.replace(loginUrlWithReturn());
  }

  async function logout() {
    const client = getClient();
    try {
      if (client) {
        const { error } = await client.auth.signOut();
        if (error) throw error;
      }
    } catch (error) {
      console.warn("ThePetGrid: remote logout failed; local session was cleared.", error);
    } finally {
      setCurrentUser(null);
      window.location.href = homeUrl();
    }
  }

  function onChange(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  const ready = new Promise((resolve) => {
    const start = () => initialize().then(resolve);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
  });

  window.ThePetGridAuth = {
    ready,
    getCurrentUser,
    setCurrentUser,
    logout,
    onChange,
    isInitialized: () => initialized,
    storageKeys: { currentUser: STORAGE_KEY }
  };

  window.addEventListener("thepetgrid:auth-changed", renderHeaderAuth);
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      currentUser = readCachedUser();
      renderHeaderAuth();
    }
  });
})();
