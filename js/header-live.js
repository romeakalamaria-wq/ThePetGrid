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
    presenceChannel: null,
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

  function showNearbyLostToast(notification) {
    const payload = notification?.payload || {};
    let toast = document.getElementById("nearbyLostToast");
    if (!toast) {
      toast = document.createElement("a");
      toast.id = "nearbyLostToast";
      toast.className = "nearby-lost-toast";
      toast.innerHTML = '<span class="nearby-lost-toast__icon">🚨</span><span><strong></strong><small></small></span><b>View map →</b>';
      document.body.appendChild(toast);
    }
    toast.href = nearbyAlertLink(payload.report_id || notification.entity_id);
    toast.querySelector("strong").textContent = `Lost pet nearby: ${payload.pet_name || "Community alert"}`;
    const distance = payload.distance_km !== undefined ? `${payload.distance_km} km away · ` : "";
    toast.querySelector("small").textContent = `${distance}${payload.address || "Open the alert for the location"}`;
    toast.classList.remove("is-visible");
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove("is-visible"), 10000);

    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      const browserNotification = new Notification(`🚨 ${payload.pet_name || "Lost pet"} nearby`, {
        body:`${distance}${payload.address || "Tap to view the Lost & Found alert."}`,
        icon:location.pathname.includes("/pages/") ? "../assets/favicon.png" : "assets/favicon.png",
        tag:`lost-pet-${payload.report_id || notification.id}`
      });
      browserNotification.onclick = () => {
        window.focus();
        location.href = nearbyAlertLink(payload.report_id || notification.entity_id);
        browserNotification.close();
      };
    }
  }

  async function markNearbyNotificationRead(notificationId) {
    if (!notificationId) return;
    await state.client.from("notifications").update({ read_at:new Date().toISOString() }).eq("id", notificationId).eq("user_id", state.user.id);
  }

  async function handleNearbyNotification(notification) {
    if (!notification || notification.type !== "nearby_lost_pet") return;
    showNearbyLostToast(notification);
    await markNearbyNotificationRead(notification.id);
  }

  async function subscribeNearbyLostAlerts() {
    try {
      state.nearbyChannel = state.client.channel(`nearby-lost-alerts-${state.user.id}`)
        .on("postgres_changes", {
          event:"INSERT", schema:"public", table:"notifications", filter:`user_id=eq.${state.user.id}`
        }, payload => handleNearbyNotification(payload.new))
        .subscribe();

      const { data, error } = await state.client.from("notifications")
        .select("id,type,entity_id,payload,created_at")
        .eq("user_id", state.user.id)
        .eq("type", "nearby_lost_pet")
        .is("read_at", null)
        .order("created_at", { ascending:false })
        .limit(1);
      if (error) throw error;
      if (data?.[0]) await handleNearbyNotification(data[0]);
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
    await subscribeNearbyLostAlerts();
    await startGlobalPresence();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshUnread(); });
    window.addEventListener('beforeunload', () => {
      state.presenceChannel?.untrack();
      if (state.nearbyChannel) state.client.removeChannel(state.nearbyChannel);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
