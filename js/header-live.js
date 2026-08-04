(() => {
  "use strict";

  const PET_EMOJI = {
    dog: "🐶", cat: "🐱", bird: "🐦", rabbit: "🐰", fish: "🐠",
    reptile: "🦎", hamster: "🐹", horse: "🐴", other: "🐾"
  };

  const LOST_REPORTS_STORAGE_KEY = "thepetgrid_lost_found_reports";

  const state = {
    client: null,
    user: null,
    unread: 0,
    notificationChannel: null,
    nearbyChannel: null,
    reportStatusChannel: null,
    presenceChannel: null,
    nearbyNotifications: [],
    reportStatuses: new Map(),
    senderPetTypes: new Map(),
    senderNames: new Map()
  };

  const emojiFor = type => PET_EMOJI[String(type || "other").toLowerCase()] || "🐾";

  function activeLostReports() {
    try {
      const reports = JSON.parse(localStorage.getItem(LOST_REPORTS_STORAGE_KEY) || "[]");
      return Array.isArray(reports)
        ? reports.filter(report => report?.status === "lost" && !report.resolved)
        : [];
    } catch (_) {
      return [];
    }
  }

  function getLostFoundHref() {
    return document.querySelector(".lost-found-btn")?.getAttribute("href") ||
      (location.pathname.includes("/pages/") ? "lost-found.html" : "pages/lost-found.html");
  }

  function renderLostPetAlert() {
    const reports = activeLostReports();
    let alert = document.getElementById("globalLostPetAlert");
    if (!reports.length) {
      alert?.remove();
      return;
    }

    const latest = [...reports].sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))[0];
    if (!alert) {
      alert = document.createElement("a");
      alert.id = "globalLostPetAlert";
      alert.className = "global-lost-alert";
      alert.setAttribute("role", "alert");
      alert.innerHTML = '<span class="global-lost-alert__signal" aria-hidden="true">SOS</span><span class="global-lost-alert__copy"><strong></strong><small></small></span><span class="global-lost-alert__action">View alert →</span>';
      const header = document.querySelector(".main-header");
      if (header) header.insertAdjacentElement("afterend", alert);
      else document.body.prepend(alert);
    }

    const countText = reports.length > 1 ? ` · ${reports.length} active lost alerts` : "";
    alert.href = `${getLostFoundHref()}#reports`;
    alert.querySelector("strong").textContent = `🚨 LOST PET: ${latest.name || "Community alert"}`;
    alert.querySelector("small").textContent = `${latest.address || latest.city || "Location pending"}${countText}`;
  }

  function installLostPetAlerts() {
    renderLostPetAlert();
    window.addEventListener("storage", event => {
      if (event.key === LOST_REPORTS_STORAGE_KEY) renderLostPetAlert();
    });
    window.addEventListener("thepetgrid:lost-reports-changed", renderLostPetAlert);
  }

  async function getClient() {
    for (let i = 0; i < 40; i += 1) {
      const client = window.ThePetGridSupabase?.client;
      if (client) return client;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return null;
  }

  function getMessagesLink() {
    return [...document.querySelectorAll('.main-nav a')].find(link =>
      /(^|\/)messages\.html(?:$|[?#])/.test(link.getAttribute('href') || '')
    );
  }

  function installIndicator() {
    const link = getMessagesLink();
    if (!link) return null;
    link.classList.add('messages-nav-link');
    if (!link.querySelector('.message-pet-icon')) {
      link.insertAdjacentHTML('beforeend', '<span class="message-pet-icon" aria-hidden="true">🐾</span><span class="message-unread-badge" aria-label="Unread messages" hidden>0</span>');
    }
    return link;
  }

  function renderIndicator(latestType = null) {
    const link = installIndicator();
    if (!link) return;
    const badge = link.querySelector('.message-unread-badge');
    const petIcon = link.querySelector('.message-pet-icon');
    badge.textContent = state.unread > 99 ? '99+' : String(state.unread);
    badge.hidden = state.unread < 1;
    petIcon.textContent = state.unread ? emojiFor(latestType) : '🐾';
    link.classList.toggle('has-unread', state.unread > 0);
  }

  async function loadSenderDetails(senderIds) {
    const ids = [...new Set(senderIds.filter(Boolean))];
    if (!ids.length) return;

    const missingPets = ids.filter(id => !state.senderPetTypes.has(id));
    if (missingPets.length) {
      const { data } = await state.client
        .from('pets')
        .select('owner_id,type,created_at')
        .in('owner_id', missingPets)
        .order('created_at', { ascending: false });
      (data || []).forEach(row => {
        if (!state.senderPetTypes.has(row.owner_id)) state.senderPetTypes.set(row.owner_id, row.type || 'other');
      });
      missingPets.forEach(id => { if (!state.senderPetTypes.has(id)) state.senderPetTypes.set(id, 'other'); });
    }

    const missingNames = ids.filter(id => !state.senderNames.has(id));
    if (missingNames.length) {
      const { data } = await state.client.from('profiles').select('id,username').in('id', missingNames);
      (data || []).forEach(row => state.senderNames.set(row.id, row.username || 'A member'));
      missingNames.forEach(id => { if (!state.senderNames.has(id)) state.senderNames.set(id, 'A member'); });
    }
  }

  function showToast(message) {
    const senderId = message.sender_id;
    const type = state.senderPetTypes.get(senderId) || 'other';
    const name = state.senderNames.get(senderId) || 'A member';
    let toast = document.getElementById('messageLiveToast');
    if (!toast) {
      toast = document.createElement('a');
      toast.id = 'messageLiveToast';
      toast.className = 'message-live-toast';
      toast.href = getMessagesLink()?.getAttribute('href') || 'messages.html';
      toast.innerHTML = '<span class="toast-pet-icon">🐾</span><span><strong>New message</strong><small></small></span><b>›</b>';
      document.body.appendChild(toast);
    }
    toast.querySelector('.toast-pet-icon').textContent = emojiFor(type);
    toast.querySelector('strong').textContent = `New message from ${name}`;
    const preview = message.message_type === 'gift'
      ? `${message.gift_emoji || '🎁'} ${message.gift_name || 'Virtual gift'}`
      : String(message.body || 'Open Messages to read it').slice(0, 72);
    toast.querySelector('small').textContent = preview;
    toast.classList.remove('is-visible');
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('is-visible'), 6500);
  }

  async function refreshUnread() {
    if (!state.user) return;
    const { data, error } = await state.client
      .from('messages')
      .select('id,sender_id,created_at')
      .eq('recipient_id', state.user.id)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      console.warn('ThePetGrid message badge:', error.message);
      return;
    }
    state.unread = (data || []).length;
    const latestSender = data?.[0]?.sender_id;
    if (latestSender) await loadSenderDetails([latestSender]);
    renderIndicator(latestSender ? state.senderPetTypes.get(latestSender) : null);
  }

  async function subscribeNotifications() {
    state.notificationChannel = state.client
      .channel(`header-message-alerts-${state.user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${state.user.id}`
      }, async payload => {
        const message = payload.new;
        await loadSenderDetails([message.sender_id]);
        state.unread += 1;
        renderIndicator(state.senderPetTypes.get(message.sender_id));
        if (!location.pathname.endsWith('/messages.html') && !location.pathname.endsWith('messages.html')) showToast(message);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages', filter: `recipient_id=eq.${state.user.id}`
      }, () => refreshUnread())
      .subscribe();
  }

  async function startGlobalPresence() {
    if (location.pathname.endsWith('/messages.html') || location.pathname.endsWith('messages.html')) return;

    const publishPresence = () => {
      const presenceState = state.presenceChannel?.presenceState?.() || {};
      const ids = new Set(Object.keys(presenceState).map(String));
      Object.values(presenceState).flat().forEach(entry => {
        if (entry?.user_id) ids.add(String(entry.user_id));
      });
      state.onlineUserIds = ids;
      window.ThePetGridPresence = { onlineUserIds: new Set(ids) };
      window.dispatchEvent(new CustomEvent('thepetgrid:presence', { detail: { onlineUserIds: [...ids] } }));
    };

    state.presenceChannel = state.client
      .channel('thepetgrid-online-members', { config: { presence: { key: state.user.id } } })
      .on('presence', { event: 'sync' }, publishPresence)
      .on('presence', { event: 'join' }, publishPresence)
      .on('presence', { event: 'leave' }, publishPresence);

    state.presenceChannel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        await state.presenceChannel.track({ user_id: state.user.id, online_at: new Date().toISOString() });
        publishPresence();
      }
    });
  }

  function nearbyAlertLink(reportId = "") {
    const base = getLostFoundHref();
    return reportId ? `${base}?reportId=${encodeURIComponent(reportId)}#reports` : `${base}#reports`;
  }

  function memorialLink(notification) {
    const payload = notification?.payload || {};
    const page = location.pathname.includes("/pages/") ? "memorial.html" : "pages/memorial.html";
    return payload.memorial_id
      ? `${page}?memorialId=${encodeURIComponent(payload.memorial_id)}`
      : `${page}?petId=${encodeURIComponent(payload.pet_id || "")}`;
  }

  function petGiftLink(notification) {
    const payload = notification?.payload || {};
    const page = location.pathname.includes("/pages/") ? "pet.html" : "pages/pet.html";
    return `${page}?id=${encodeURIComponent(payload.pet_id || notification?.entity_id || "")}#petGiftCenter`;
  }

  function showNearbyLostToast(notification) {
    const payload = notification?.payload || {};
    const isMemorial = notification?.type === "memorial_created";
    const isGift = notification?.type === "pet_gift_received";
    const isSighting = notification?.type === "lost_pet_sighting";
    let toast = document.getElementById("nearbyLostToast");
    if (!toast) {
      toast = document.createElement("a");
      toast.id = "nearbyLostToast";
      toast.className = "nearby-lost-toast";
      toast.innerHTML = '<span class="nearby-lost-toast__icon">🚨</span><span><strong></strong><small></small></span><b>Open →</b>';
      document.body.appendChild(toast);
    }
    toast.href = isGift ? petGiftLink(notification) : isMemorial ? memorialLink(notification) : nearbyAlertLink(payload.report_id || notification.entity_id);
    toast.querySelector(".nearby-lost-toast__icon").textContent = isGift ? (payload.gift_emoji || "🎁") : isMemorial ? "🤍" : "🚨";
    toast.querySelector("strong").textContent = isGift ? `${payload.pet_name || "Your pet"} received ${payload.gift_name || "a gift"}` : isMemorial ? `${payload.pet_name || "A beloved pet"} is now remembered` : isSighting ? `Possible sighting: ${payload.pet_name || "Your lost pet"}` : `Lost pet nearby: ${payload.pet_name || "Community alert"}`;
    const distance = payload.distance_km !== undefined ? `${payload.distance_km} km away · ` : "";
    toast.querySelector("small").textContent = isGift ? (payload.message || "A community member sent a little kindness.") : isMemorial ? "Visit the Memorial Garden to leave a flower or light a candle." : `${distance}${payload.address || "Open the alert for the location"}`;
    toast.classList.remove("is-visible");
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove("is-visible"), 10000);

    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      const browserNotification = new Notification(isGift ? `${payload.gift_emoji || "🎁"} A gift for ${payload.pet_name || "your pet"}` : isMemorial ? `🤍 ${payload.pet_name || "A beloved pet"} is now remembered` : `🚨 ${payload.pet_name || "Lost pet"} nearby`, {
        body:isGift ? (payload.message || `${payload.gift_name || "A gift"} was added to the pet profile.`) : isMemorial ? "Visit the Memorial Garden." : `${distance}${payload.address || "Tap to view the Lost & Found alert."}`,
        icon:location.pathname.includes("/pages/") ? "../assets/favicon.png" : "assets/favicon.png",
        tag:isGift ? `pet-gift-${notification.id}` : isMemorial ? `memorial-${notification.id}` : `lost-pet-${payload.report_id || notification.id}`
      });
      browserNotification.onclick = () => {
        window.focus();
        location.href = isGift ? petGiftLink(notification) : isMemorial ? memorialLink(notification) : nearbyAlertLink(payload.report_id || notification.entity_id);
        browserNotification.close();
      };
    }
  }

  async function markNearbyNotificationRead(notificationId) {
    if (!notificationId) return;
    const readAt = new Date().toISOString();
    const { error } = await state.client.from("notifications").update({ read_at:readAt }).eq("id", notificationId).eq("user_id", state.user.id);
    if (!error) {
      const item = state.nearbyNotifications.find(entry => entry.id === notificationId);
      if (item) item.read_at = readAt;
      renderNotificationCenter();
    }
  }

  async function handleNearbyNotification(notification) {
    if (!notification || !["nearby_lost_pet", "lost_pet_sighting", "memorial_created", "pet_gift_received"].includes(notification.type)) return;
    const existing = state.nearbyNotifications.findIndex(item => item.id === notification.id);
    if (existing >= 0) state.nearbyNotifications[existing] = notification;
    else state.nearbyNotifications.unshift(notification);
    state.nearbyNotifications = state.nearbyNotifications.slice(0, 50);
    await loadReportStatuses();
    renderNotificationCenter();
    showNearbyLostToast(notification);
  }

  function formatNotificationTime(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return "";
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  async function loadReportStatuses() {
    const ids = [...new Set(state.nearbyNotifications.filter(item => ["nearby_lost_pet", "lost_pet_sighting"].includes(item.type)).map(item => item.payload?.report_id || item.entity_id).filter(Boolean))];
    if (!ids.length) return;
    const { data } = await state.client.from("lost_pet_reports").select("id,status,resolved,resolved_at").in("id", ids);
    (data || []).forEach(report => state.reportStatuses.set(String(report.id), report));
  }

  function renderNotificationCenter() {
    const button = document.getElementById("notificationCenterButton");
    const panel = document.getElementById("notificationCenterPanel");
    if (!button || !panel) return;
    const unread = state.nearbyNotifications.filter(item => !item.read_at).length;
    const badge = button.querySelector(".notification-center-button__badge");
    badge.textContent = unread > 99 ? "99+" : String(unread);
    badge.hidden = unread === 0;
    button.classList.toggle("has-unread", unread > 0);
    button.setAttribute("aria-label", unread ? `${unread} unread notifications` : "Notifications");

    const list = panel.querySelector(".notification-center__list");
    const empty = panel.querySelector(".notification-center__empty");
    const markAll = panel.querySelector("[data-mark-all-notifications-read]");
    markAll.disabled = unread === 0;
    empty.hidden = state.nearbyNotifications.length > 0;
    list.innerHTML = state.nearbyNotifications.map(notification => {
      const payload = notification.payload || {};
      const isMemorial = notification.type === "memorial_created";
      const isGift = notification.type === "pet_gift_received";
      const reportId = payload.report_id || notification.entity_id || "";
      const report = state.reportStatuses.get(String(reportId));
      const resolved = Boolean(report?.resolved || report?.status === "found");
      const isSighting = notification.type === "lost_pet_sighting";
      const distance = payload.distance_km !== undefined ? `${payload.distance_km} km away` : "Nearby alert";
      if (isMemorial) {
        return `<a class="notification-center__item notification-center__item--memorial${notification.read_at ? "" : " is-unread"}" href="${memorialLink(notification)}" data-notification-id="${notification.id}"><span class="notification-center__icon">🤍</span><span class="notification-center__copy"><strong>${escapeNotificationText(payload.pet_name || "A beloved pet")} is now remembered</strong><small>Visit their story, leave a flower or light a candle.</small><em>Memorial Garden · ${formatNotificationTime(notification.created_at)}</em></span>${notification.read_at ? "" : '<span class="notification-center__dot" aria-label="Unread"></span>'}</a>`;
      }
      if (isGift) {
        const photo = payload.pet_image
          ? `<span class="notification-center__icon notification-center__pet-photo"><img src="${escapeNotificationText(payload.pet_image)}" alt=""></span>`
          : `<span class="notification-center__icon">${escapeNotificationText(payload.gift_emoji || "🎁")}</span>`;
        return `<a class="notification-center__item notification-center__item--gift${notification.read_at ? "" : " is-unread"}" href="${petGiftLink(notification)}" data-notification-id="${notification.id}">${photo}<span class="notification-center__copy"><strong>${escapeNotificationText(payload.pet_name || "Your pet")} received ${escapeNotificationText(payload.gift_name || "a gift")}</strong><small>${escapeNotificationText(payload.message || "A community member sent a little kindness.")}</small><em>${escapeNotificationText(payload.gift_emoji || "🎁")} Gift received · ${formatNotificationTime(notification.created_at)}</em></span>${notification.read_at ? "" : '<span class="notification-center__dot" aria-label="Unread"></span>'}</a>`;
      }
      return `<a class="notification-center__item${notification.read_at ? "" : " is-unread"}${resolved ? " is-resolved" : ""}" href="${nearbyAlertLink(reportId)}" data-notification-id="${notification.id}"><span class="notification-center__icon">${resolved ? "✅" : isSighting ? "👁" : "🚨"}</span><span class="notification-center__copy"><strong>${resolved ? "Pet found: " : isSighting ? "Possible sighting: " : "Lost pet nearby: "}${escapeNotificationText(payload.pet_name || "Community alert")}</strong><small>${escapeNotificationText(payload.address || payload.note || distance)}</small><em>${isSighting ? "Sighting report" : distance} · ${formatNotificationTime(notification.created_at)}${resolved ? " · Resolved" : ""}</em></span>${notification.read_at ? "" : '<span class="notification-center__dot" aria-label="Unread"></span>'}</a>`;
    }).join("");
  }

  function escapeNotificationText(value) {
    return String(value || "").replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[character]));
  }

  async function loadNotificationCenter() {
    const { data, error } = await state.client.from("notifications")
      .select("id,type,entity_id,payload,read_at,created_at")
      .eq("user_id", state.user.id)
      .in("type", ["nearby_lost_pet", "lost_pet_sighting", "memorial_created", "pet_gift_received"])
      .order("created_at", { ascending:false })
      .limit(50);
    if (error) throw error;
    state.nearbyNotifications = data || [];
    await loadReportStatuses();
    renderNotificationCenter();
  }

  function installNotificationCenter() {
    const actions = document.querySelector(".header-actions");
    if (!actions || document.getElementById("notificationCenterButton")) return;
    const button = document.createElement("button");
    button.id = "notificationCenterButton";
    button.className = "notification-center-button";
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = '<span aria-hidden="true">🔔</span><span class="notification-center-button__badge" hidden>0</span>';
    actions.insertBefore(button, actions.querySelector(".user-menu, .login-btn"));

    const panel = document.createElement("section");
    panel.id = "notificationCenterPanel";
    panel.className = "notification-center";
    panel.hidden = true;
    panel.innerHTML = `<div class="notification-center__header"><div><strong>🔔 Notifications</strong><small>Lost pet alerts and meaningful community updates stay here.</small></div><button type="button" data-close-notification-center aria-label="Close">×</button></div><div class="notification-center__toolbar"><span>Recent updates</span><button type="button" data-mark-all-notifications-read>Mark all as read</button></div><div class="notification-center__list"></div><p class="notification-center__empty">No notifications yet.</p>`;
    document.body.appendChild(panel);

    button.addEventListener("click", async event => {
      event.stopPropagation();
      panel.hidden = !panel.hidden;
      button.setAttribute("aria-expanded", String(!panel.hidden));
      if (!panel.hidden) await loadNotificationCenter().catch(error => console.info("ThePetGrid notification center:", error.message || error));
    });
    panel.querySelector("[data-close-notification-center]").addEventListener("click", () => {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
    });
    panel.querySelector("[data-mark-all-notifications-read]").addEventListener("click", async () => {
      const unreadIds = state.nearbyNotifications.filter(item => !item.read_at).map(item => item.id);
      if (!unreadIds.length) return;
      const readAt = new Date().toISOString();
      const { error } = await state.client.from("notifications").update({ read_at:readAt }).eq("user_id", state.user.id).in("id", unreadIds);
      if (!error) {
        state.nearbyNotifications.forEach(item => { if (unreadIds.includes(item.id)) item.read_at = readAt; });
        renderNotificationCenter();
      }
    });
    panel.addEventListener("click", event => {
      const link = event.target.closest("[data-notification-id]");
      if (link) markNearbyNotificationRead(link.dataset.notificationId);
    });
    document.addEventListener("click", event => {
      if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) {
        panel.hidden = true;
        button.setAttribute("aria-expanded", "false");
      }
    });
    renderNotificationCenter();
  }

  async function subscribeNearbyLostAlerts() {
    try {
      state.nearbyChannel = state.client.channel(`nearby-lost-alerts-${state.user.id}`)
        .on("postgres_changes", {
          event:"INSERT", schema:"public", table:"notifications", filter:`user_id=eq.${state.user.id}`
        }, payload => handleNearbyNotification(payload.new))
        .on("postgres_changes", {
          event:"UPDATE", schema:"public", table:"notifications", filter:`user_id=eq.${state.user.id}`
        }, payload => {
          const index = state.nearbyNotifications.findIndex(item => item.id === payload.new.id);
          if (index >= 0) state.nearbyNotifications[index] = payload.new;
          renderNotificationCenter();
        })
        .subscribe();
      state.reportStatusChannel = state.client.channel(`lost-report-status-${state.user.id}`)
        .on("postgres_changes", { event:"UPDATE", schema:"public", table:"lost_pet_reports" }, async () => {
          await loadReportStatuses();
          renderNotificationCenter();
        }).subscribe();
      await loadNotificationCenter();
    } catch (error) {
      console.info("ThePetGrid: nearby alerts need the Sprint 9.4 SQL setup.", error.message || error);
    }
  }

  function locationPromise() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Location is not supported by this browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy:true, timeout:15000, maximumAge:300000 });
    });
  }

  async function loadNearbyPreferences() {
    const { data, error } = await state.client.from("nearby_alert_preferences").select("*").eq("user_id", state.user.id).maybeSingle();
    if (error) throw error;
    return data || null;
  }

  function installNearbyAlertSettings() {
    const actions = document.querySelector(".header-actions");
    if (!actions || document.getElementById("nearbyAlertSettingsButton")) return;
    const button = document.createElement("button");
    button.id = "nearbyAlertSettingsButton";
    button.className = "nearby-alert-settings-button";
    button.type = "button";
    button.innerHTML = '<span aria-hidden="true">📍</span><span>Nearby Alerts</span>';
    button.setAttribute("aria-label", "Nearby lost pet alert settings");
    actions.insertBefore(button, actions.querySelector(".user-menu, .login-btn"));

    const panel = document.createElement("section");
    panel.id = "nearbyAlertPanel";
    panel.className = "nearby-alert-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="nearby-alert-panel__header"><div><strong>📍 Nearby Lost Pet Alerts</strong><small>Get notified when a pet is lost near you.</small></div><button type="button" data-close-nearby-alerts aria-label="Close">×</button></div>
      <label class="nearby-alert-panel__switch"><input id="nearbyAlertsEnabled" type="checkbox" checked><span>Enable nearby alerts</span></label>
      <label><span>Alert radius</span><select id="nearbyAlertRadius"><option value="5">5 km</option><option value="10" selected>10 km</option><option value="25">25 km</option><option value="50">50 km</option></select></label>
      <button id="saveNearbyAlertLocation" class="nearby-alert-panel__save" type="button">Use my location &amp; save</button>
      <p id="nearbyAlertPanelStatus">Your exact location stays private.</p>`;
    document.body.appendChild(panel);

    const enabled = panel.querySelector("#nearbyAlertsEnabled");
    const radius = panel.querySelector("#nearbyAlertRadius");
    const status = panel.querySelector("#nearbyAlertPanelStatus");
    button.addEventListener("click", async () => {
      panel.hidden = !panel.hidden;
      if (panel.hidden) return;
      try {
        const preferences = await loadNearbyPreferences();
        if (preferences) {
          enabled.checked = preferences.enabled;
          radius.value = String(preferences.radius_km || 10);
          status.textContent = preferences.latitude !== null ? `Active within ${preferences.radius_km} km.` : "Choose your location to activate alerts.";
        }
      } catch (error) {
        status.textContent = "Run the Sprint 9.4 Supabase SQL to activate nearby alerts.";
      }
    });
    panel.querySelector("[data-close-nearby-alerts]").addEventListener("click", () => { panel.hidden = true; });
    panel.querySelector("#saveNearbyAlertLocation").addEventListener("click", async () => {
      const saveButton = panel.querySelector("#saveNearbyAlertLocation");
      saveButton.disabled = true;
      status.textContent = "Requesting your location…";
      try {
        let browserEnabled = false;
        if ("Notification" in window) browserEnabled = (await Notification.requestPermission()) === "granted";
        const position = await locationPromise();
        const { error } = await state.client.rpc("set_nearby_alert_preferences", {
          p_enabled:enabled.checked,
          p_radius_km:Number(radius.value),
          p_latitude:position.coords.latitude,
          p_longitude:position.coords.longitude,
          p_browser_notifications:browserEnabled
        });
        if (error) throw error;
        status.textContent = `✅ Alerts active within ${radius.value} km${browserEnabled ? " · Browser notifications enabled" : ""}.`;
      } catch (error) {
        status.textContent = error.message || "Location permission was not granted.";
      } finally {
        saveButton.disabled = false;
      }
    });
  }

  async function init() {
    installLostPetAlerts();
    installIndicator();
    state.client = await getClient();
    if (!state.client) return;
    const { data: { session } } = await state.client.auth.getSession();
    state.user = session?.user || null;
    if (!state.user) {
      renderIndicator();
      return;
    }
    await refreshUnread();
    await subscribeNotifications();
    installNearbyAlertSettings();
    installNotificationCenter();
    await subscribeNearbyLostAlerts();
    await startGlobalPresence();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshUnread(); });
    window.addEventListener('beforeunload', () => {
      state.presenceChannel?.untrack();
      if (state.nearbyChannel) state.client.removeChannel(state.nearbyChannel);
      if (state.reportStatusChannel) state.client.removeChannel(state.reportStatusChannel);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
