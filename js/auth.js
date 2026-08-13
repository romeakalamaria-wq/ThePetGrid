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

  // =========================================
  // URL HELPERS
  // =========================================

  function isInsidePagesFolder() {
    return window.location.pathname.includes("/pages/");
  }

  function pageUrl(fileName) {
    return isInsidePagesFolder()
      ? fileName
      : `pages/${fileName}`;
  }

  function homeUrl() {
    return isInsidePagesFolder()
      ? "../index.html"
      : "index.html";
  }

  // =========================================
  // LOCAL STORAGE
  // =========================================

  function readCachedUser() {
    try {
      return JSON.parse(
        localStorage.getItem(STORAGE_KEY)
      ) || null;
    } catch (error) {
      console.warn(
        "ThePetGrid: removed invalid cached user.",
        error
      );

      localStorage.removeItem(STORAGE_KEY);

      return null;
    }
  }

  // =========================================
  // USER NORMALIZATION
  // =========================================

  function normalizeUser(user) {
    if (!user) {
      return null;
    }

    const metadata =
      user.user_metadata || {};

    const username = String(
      metadata.username ||
      user.username ||
      user.name ||
      user.email?.split("@")[0] ||
      "Member"
    ).trim();

    const displayName = String(
      metadata.display_name ||
      metadata.full_name ||
      metadata.name ||
      user.displayName ||
      user.fullName ||
      user.name ||
      username
    ).trim();

    const avatar = String(
      metadata.avatar_url ||
      metadata.picture ||
      user.avatar ||
      user.photo ||
      ""
    ).trim();

    return {
      id: user.id || null,
      username,
      displayName,
      name: displayName,
      email: user.email || "",
      avatar
    };
  }

  // =========================================
  // EVENTS
  // =========================================

  function notify(user) {
    window.dispatchEvent(
      new CustomEvent(
        "thepetgrid:auth-changed",
        {
          detail: user
        }
      )
    );

    listeners.forEach((listener) => {
      try {
        listener(user);
      } catch (error) {
        console.error(error);
      }
    });
  }

  // =========================================
  // CURRENT USER
  // =========================================

  function setCurrentUser(
    user,
    { notifyChange = true } = {}
  ) {
    currentUser = normalizeUser(user);

    if (currentUser) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(currentUser)
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    if (notifyChange) {
      notify(currentUser);
    }

    return currentUser;
  }

  function getCurrentUser() {
    return currentUser || readCachedUser();
  }

  function getClient() {
    return window.ThePetGridSupabase?.client || null;
  }

  function currentPageName() {
    return (
      window.location.pathname.split("/").pop() ||
      "index.html"
    );
  }

  function loginUrlWithReturn() {
    const returnTo = encodeURIComponent(
      currentPageName() +
      window.location.search +
      window.location.hash
    );

    return `${pageUrl("login.html")}?returnTo=${returnTo}`;
  }

  // =========================================
  // SECURITY
  // =========================================

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // =========================================
  // ATLAS HEADER AUTH
  // =========================================

  function renderAtlasHeaderAuth() {
    const account =
      document.querySelector(".world-header .header-account");

    if (!account) {
      return;
    }

    const user =
      getCurrentUser();

    if (!user) {
      account.href =
        pageUrl("login.html");

      account.setAttribute(
        "aria-label",
        "Log in"
      );

      account.innerHTML = `
        <span aria-hidden="true">🐾</span>
        <strong>Log In</strong>
      `;

      account.classList.remove(
        "is-authenticated"
      );

      return;
    }

    account.href =
      pageUrl("my-profile.html");

    account.setAttribute(
      "aria-label",
      `Open ${user.username}'s profile`
    );

    account.innerHTML = `
      <span aria-hidden="true">👤</span>
      <strong>${escapeHtml(user.username).slice(0, 22)}</strong>
    `;

    account.classList.add(
      "is-authenticated"
    );
  }


  // =========================================
  // ADMIN MENU ACCESS
  // =========================================

  async function installAdminMenuLink(actions, user) {
    if (!actions || !user) {
      return;
    }

    const dropdown =
      actions.querySelector(".user-menu__dropdown");

    const logoutButton =
      actions.querySelector("[data-auth-logout]");

    if (!dropdown || !logoutButton) {
      return;
    }

    // Never show an admin link until Supabase confirms this user is an admin.
    dropdown.querySelector(".user-menu__moderation")?.remove();

    const client = getClient();

    if (!client) {
      return;
    }

    try {
      const {
        data,
        error
      } = await client.rpc("is_admin");

      if (error || data !== true) {
        return;
      }

      const moderationLink =
        document.createElement("a");

      moderationLink.className =
        "user-menu__moderation";

      moderationLink.href =
        pageUrl("admin-moderation.html");

      moderationLink.innerHTML = `
        <span aria-hidden="true">🛡️</span>
        Moderation Center
      `;

      logoutButton.insertAdjacentElement(
        "beforebegin",
        moderationLink
      );
    } catch (error) {
      console.warn(
        "ThePetGrid: admin menu check failed.",
        error
      );
    }
  }


  // =========================================
  // HEADER AUTH
  // =========================================

  function renderHeaderAuth() {
    renderAtlasHeaderAuth();

    const actions =
      document.querySelector(".header-actions");

    if (!actions) {
      return;
    }

    const lostFoundLink =
      pageUrl("lost-found.html");

    const addPetLink =
      pageUrl("upload.html");

    const loginLink =
      pageUrl("login.html");

    const profileLink =
      pageUrl("my-profile.html");

    const user =
      getCurrentUser();

    // =======================================
    // USER NOT LOGGED IN
    // =======================================

    if (!user) {
      actions.innerHTML = `
        <a
          class="lost-found-btn"
          href="${lostFoundLink}"
        >
          <span aria-hidden="true">🆘</span>
          <span>Lost &amp; Found</span>
        </a>

        <a
          class="login-btn"
          href="${loginLink}"
        >
          Log In
        </a>
      `;

      return;
    }

    // =======================================
    // USER LOGGED IN
    // =======================================

    actions.innerHTML = `
      <a
        class="lost-found-btn"
        href="${lostFoundLink}"
      >
        <span aria-hidden="true">🆘</span>
        <span>Lost &amp; Found</span>
      </a>

      <div class="user-menu">

        <button
          class="user-menu__toggle"
          type="button"
          aria-expanded="false"
          aria-label="Open user menu"
        >
          <span class="user-menu__avatar">
            👤
          </span>

          <span class="user-menu__name">
            ${escapeHtml(user.username).slice(0, 30)}
          </span>

          <span aria-hidden="true">
            ▾
          </span>
        </button>

        <div
          class="user-menu__dropdown"
          hidden
        >
          <a class="user-menu__add-pet" href="${addPetLink}">
            <span aria-hidden="true">🐾</span>
            Add New Pet
          </a>

          <a href="${profileLink}">
            My Profile
          </a>

          <a href="${pageUrl("beta-feedback.html")}">
  <span aria-hidden="true">🧪</span>
  Beta Feedback
</a>

          <button
            type="button"
            data-auth-logout
          >
            Log Out
          </button>
        </div>

      </div>
    `;

    const toggle =
      actions.querySelector(
        ".user-menu__toggle"
      );

    const dropdown =
      actions.querySelector(
        ".user-menu__dropdown"
      );

    const logoutButton =
      actions.querySelector(
        "[data-auth-logout]"
      );

    toggle?.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();

        const willOpen =
          dropdown.hidden;

        dropdown.hidden =
          !willOpen;

        toggle.setAttribute(
          "aria-expanded",
          String(willOpen)
        );
      }
    );

    logoutButton?.addEventListener(
      "click",
      logout
    );

    installAdminMenuLink(
      actions,
      user
    );

    document.addEventListener(
      "click",
      (event) => {
        if (!actions.contains(event.target)) {
          dropdown.hidden = true;

          toggle?.setAttribute(
            "aria-expanded",
            "false"
          );
        }
      }
    );
  }

  // =========================================
  // INITIALIZE AUTH
  // =========================================

  async function initialize() {
    const client =
      getClient();

    if (!client) {
      initialized = true;

      renderHeaderAuth();

      enforcePageProtection();

      return getCurrentUser();
    }

    try {
      const {
        data,
        error
      } = await client.auth.getSession();

      if (error) {
        throw error;
      }

      setCurrentUser(
        data.session?.user || null,
        {
          notifyChange: false
        }
      );

      client.auth.onAuthStateChange(
        (_event, session) => {
          setCurrentUser(
            session?.user || null
          );

          renderHeaderAuth();
        }
      );
    } catch (error) {
      console.error(
        "ThePetGrid: Supabase session initialization failed.",
        error
      );

      setCurrentUser(
        null,
        {
          notifyChange: false
        }
      );
    } finally {
      initialized = true;

      renderHeaderAuth();

      enforcePageProtection();
    }

    return getCurrentUser();
  }

  // =========================================
  // PAGE PROTECTION
  // =========================================

  function enforcePageProtection() {
    if (
      !protectedPages.has(
        currentPageName()
      )
    ) {
      return;
    }

    if (getCurrentUser()) {
      return;
    }

    window.location.replace(
      loginUrlWithReturn()
    );
  }

  // =========================================
  // LOGOUT
  // =========================================

  async function logout() {
    const client =
      getClient();

    try {
      if (client) {
        const {
          error
        } = await client.auth.signOut();

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.warn(
        "ThePetGrid: remote logout failed; local session was cleared.",
        error
      );
    } finally {
      setCurrentUser(null);

      window.location.href =
        homeUrl();
    }
  }

  // =========================================
  // AUTH LISTENERS
  // =========================================

  function onChange(listener) {
    if (
      typeof listener !== "function"
    ) {
      return () => {};
    }

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }

  // =========================================
  // READY
  // =========================================

  const ready = new Promise(
    (resolve) => {
      const start = () => {
        initialize().then(resolve);
      };

      if (
        document.readyState === "loading"
      ) {
        document.addEventListener(
          "DOMContentLoaded",
          start,
          {
            once: true
          }
        );
      } else {
        start();
      }
    }
  );

  // =========================================
  // GLOBAL AUTH API
  // =========================================

  window.ThePetGridAuth = {
    ready,
    getCurrentUser,
    setCurrentUser,
    logout,
    onChange,

    isInitialized: () =>
      initialized,

    storageKeys: {
      currentUser: STORAGE_KEY
    }
  };

  // =========================================
  // GLOBAL EVENTS
  // =========================================

  window.addEventListener(
    "thepetgrid:auth-changed",
    renderHeaderAuth
  );

  window.addEventListener(
    "storage",
    (event) => {
      if (
        event.key === STORAGE_KEY
      ) {
        currentUser =
          readCachedUser();

        renderHeaderAuth();
      }
    }
  );
})();
