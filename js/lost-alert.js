(() => {
  "use strict";

  const STORAGE_KEY = "thepetgrid_lost_found_reports";
  const READ_KEY = "thepetgrid_read_lost_alerts";
  const SESSION_TOAST_KEY = "thepetgrid_toasted_lost_alerts";
  const ALERT_ID = "thePetGridGlobalLostAlert";
  const BELL_ID = "thePetGridLostAlertBell";
  const PANEL_ID = "thePetGridLostAlertPanel";

  let cloudReports = [];
  let channel = null;
  let hideTimer = null;

  const safe = value =>
    String(value ?? "").replace(/[&<>'"]/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    })[character]);

  function readJson(storage, key, fallback) {
    try {
      const value = JSON.parse(storage.getItem(key) || JSON.stringify(fallback));
      return value ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function storedReports() {
    const reports = readJson(localStorage, STORAGE_KEY, []);
    return Array.isArray(reports) ? reports : [];
  }

  function activeLocalReports() {
    return storedReports()
      .filter(report => report?.status === "lost" && !report?.resolved);
  }

  function normalize(report) {
    if (!report) return null;

    return {
      id: String(report.id),
      name: report.name || report.pet_name || "Lost pet",
      breed: report.breed || report.type || report.pet_type || "Pet",
      address:
        report.address ||
        report.area ||
        report.city ||
        report.country ||
        "Location unavailable",
      createdAt:
        report.createdAt ||
        report.created_at ||
        report.date ||
        report.event_date ||
        "",
      status: report.status || "lost",
      resolved: Boolean(report.resolved),
      image: report.image || report.image_url || ""
    };
  }

  function activeReports() {
    const merged = new Map();

    [...cloudReports, ...activeLocalReports()]
      .map(normalize)
      .filter(Boolean)
      .filter(report => report.status === "lost" && !report.resolved)
      .forEach(report => merged.set(report.id, report));

    return [...merged.values()].sort(
      (a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0)
    );
  }

  function relativeTime(value) {
    const timestamp = Date.parse(value || "");
    if (!Number.isFinite(timestamp)) return "Active now";

    const difference = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(difference / 3600000);
    const days = Math.floor(difference / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  function reportLink(report) {
    const insidePages = location.pathname.includes("/pages/");
    const page = insidePages ? "lost-found.html" : "pages/lost-found.html";
    return `${page}?reportId=${encodeURIComponent(report.id)}#reports`;
  }

  function readIds() {
    const ids = readJson(localStorage, READ_KEY, []);
    return new Set(Array.isArray(ids) ? ids.map(String) : []);
  }

  function markRead(ids) {
    const current = readIds();
    ids.forEach(id => current.add(String(id)));
    writeJson(localStorage, READ_KEY, [...current]);
  }

  function toastedIds() {
    const ids = readJson(sessionStorage, SESSION_TOAST_KEY, []);
    return new Set(Array.isArray(ids) ? ids.map(String) : []);
  }

  function markToasted(id) {
    const ids = toastedIds();
    ids.add(String(id));
    writeJson(sessionStorage, SESSION_TOAST_KEY, [...ids]);
  }

  function ensureToast() {
    let element = document.getElementById(ALERT_ID);
    if (element) return element;

    element = document.createElement("section");
    element.id = ALERT_ID;
    element.className = "tpg-lost-alert";
    element.hidden = true;
    element.setAttribute("aria-live", "polite");
    element.setAttribute("aria-label", "New lost pet alert");
    document.body.appendChild(element);

    return element;
  }

  function ensureBell() {
    let button = document.getElementById(BELL_ID);
    if (button) return button;

    button = document.createElement("button");
    button.id = BELL_ID;
    button.className = "tpg-lost-alert-bell";
    button.type = "button";
    button.setAttribute("aria-label", "Lost pet alerts");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", PANEL_ID);
    button.innerHTML = `
      <span aria-hidden="true">🔔</span>
      <b class="tpg-lost-alert-bell__badge" hidden>0</b>
    `;

    const actions = document.querySelector(".world-header__actions, .header-actions");
    if (actions) {
      actions.prepend(button);
    } else {
      document.body.appendChild(button);
    }

    button.addEventListener("click", event => {
      event.stopPropagation();
      togglePanel();
    });

    return button;
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;

    panel = document.createElement("aside");
    panel.id = PANEL_ID;
    panel.className = "tpg-lost-alert-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Active lost pet alerts");
    document.body.appendChild(panel);

    panel.addEventListener("click", event => {
      const link = event.target.closest("[data-lost-alert-link]");
      if (!link) return;

      markRead([link.dataset.lostAlertLink]);
      hideToast();
      render();
    });

    return panel;
  }

  function hideToast() {
    const toast = ensureToast();
    window.clearTimeout(hideTimer);
    toast.classList.remove("is-visible");
    toast.classList.add("is-leaving");

    window.setTimeout(() => {
      toast.hidden = true;
      toast.classList.remove("is-leaving");
    }, 220);
  }

  function showToast(report) {
    const toast = ensureToast();

    toast.innerHTML = `
      <button class="tpg-lost-alert__dismiss" type="button" aria-label="Dismiss alert">×</button>

      <div class="tpg-lost-alert__inner">
        <span class="tpg-lost-alert__icon" aria-hidden="true">🚨</span>

        <div class="tpg-lost-alert__content">
          <span class="tpg-lost-alert__label">New lost alert</span>
          <strong class="tpg-lost-alert__title">${safe(report.name)} · ${safe(report.breed)}</strong>
          <span class="tpg-lost-alert__meta">📍 ${safe(report.address)}</span>
          <span class="tpg-lost-alert__time">${safe(relativeTime(report.createdAt))}</span>
        </div>

        <a
          class="tpg-lost-alert__view"
          data-toast-view="${safe(report.id)}"
          href="${safe(reportLink(report))}"
        >
          View
        </a>
      </div>
    `;

    toast.querySelector(".tpg-lost-alert__dismiss")?.addEventListener("click", () => {
      markRead([report.id]);
      hideToast();
      render();
    });

    toast.querySelector("[data-toast-view]")?.addEventListener("click", () => {
      markRead([report.id]);
      hideToast();
    });

    toast.hidden = false;
    toast.classList.remove("is-leaving");
    requestAnimationFrame(() => toast.classList.add("is-visible"));

    markToasted(report.id);

    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      hideToast();
      render();
    }, 6500);
  }

  function renderPanel(reports) {
    const panel = ensurePanel();

    if (!reports.length) {
      panel.innerHTML = `
        <div class="tpg-lost-alert-panel__header">
          <strong>Lost alerts</strong>
        </div>
        <p class="tpg-lost-alert-panel__empty">No active lost alerts.</p>
      `;
      return;
    }

    panel.innerHTML = `
      <div class="tpg-lost-alert-panel__header">
        <div>
          <small>Rescue network</small>
          <strong>Lost alerts</strong>
        </div>
        <button type="button" data-mark-all-read>Mark all as read</button>
      </div>

      <div class="tpg-lost-alert-panel__list">
        ${reports.slice(0, 6).map(report => `
          <a
            class="tpg-lost-alert-panel__item"
            data-lost-alert-link="${safe(report.id)}"
            href="${safe(reportLink(report))}"
          >
            <span class="tpg-lost-alert-panel__avatar">
              ${report.image
                ? `<img src="${safe(report.image)}" alt="">`
                : "🚨"
              }
            </span>

            <span>
              <strong>${safe(report.name)}</strong>
              <small>${safe(report.address)}</small>
              <time>${safe(relativeTime(report.createdAt))}</time>
            </span>

            <b aria-hidden="true">→</b>
          </a>
        `).join("")}
      </div>

      <a class="tpg-lost-alert-panel__all" href="${safe(reportLink(reports[0]).split("?")[0])}">
        View all lost pets
      </a>
    `;

    panel.querySelector("[data-mark-all-read]")?.addEventListener("click", () => {
      markRead(reports.map(report => report.id));
      render();
    });
  }

  function updateBell(reports) {
    const bell = ensureBell();
    const badge = bell.querySelector(".tpg-lost-alert-bell__badge");
    const read = readIds();
    const unread = reports.filter(report => !read.has(report.id)).length;

    bell.hidden = reports.length === 0;
    badge.textContent = String(unread);
    badge.hidden = unread === 0;

    renderPanel(reports);
  }

  function render() {
    const reports = activeReports();
    updateBell(reports);

    const newest = reports[0];
    const alreadyToasted = newest ? toastedIds().has(newest.id) : true;

    if (!newest || alreadyToasted) {
      return;
    }

    showToast(newest);
  }

  function togglePanel(force) {
    const panel = ensurePanel();
    const bell = ensureBell();
    const reports = activeReports();

    const shouldOpen =
      typeof force === "boolean"
        ? force
        : panel.hidden;

    panel.hidden = !shouldOpen;
    bell.setAttribute("aria-expanded", String(shouldOpen));

    if (shouldOpen) {
      markRead(reports.map(report => report.id));
      render();
      panel.hidden = false;
      bell.setAttribute("aria-expanded", "true");
    }
  }

  async function loadCloud() {
    const client = window.ThePetGridSupabase?.client;

    if (!client) {
      cloudReports = [];
      render();
      return;
    }

    try {
      const { data, error } = await client
        .from("public_lost_pet_reports")
        .select("*")
        .eq("status", "lost")
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      cloudReports = Array.isArray(data) ? data : [];
    } catch (error) {
      console.info(
        "ThePetGrid: Lost Alert Bell is using local reports.",
        error?.message || error
      );
      cloudReports = [];
    }

    render();
  }

  function subscribe() {
    const client = window.ThePetGridSupabase?.client;
    if (!client?.channel || channel) return;

    channel = client
      .channel("global-lost-alert")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lost_pet_reports"
        },
        loadCloud
      )
      .subscribe();
  }

  function initialize() {
    ensureBell();
    ensurePanel();
    render();
    loadCloud();
    subscribe();

    addEventListener("thepetgrid:lost-reports-changed", render);
    addEventListener("storage", event => {
      if ([STORAGE_KEY, READ_KEY].includes(event.key)) render();
    });

    document.addEventListener("click", event => {
      const panel = ensurePanel();
      const bell = ensureBell();

      if (
        panel.hidden ||
        panel.contains(event.target) ||
        bell.contains(event.target)
      ) {
        return;
      }

      togglePanel(false);
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        hideToast();
        togglePanel(false);
      }
    });

    window.setInterval(render, 60000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();