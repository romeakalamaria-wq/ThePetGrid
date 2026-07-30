(() => {
  "use strict";

  const PET_EMOJI = {
    dog: "🐶", cat: "🐱", bird: "🐦", rabbit: "🐰", fish: "🐠",
    reptile: "🦎", hamster: "🐹", horse: "🐴", other: "🐾"
  };

  const state = {
    client: null,
    user: null,
    unread: 0,
    notificationChannel: null,
    presenceChannel: null,
    senderPetTypes: new Map(),
    senderNames: new Map()
  };

  const emojiFor = type => PET_EMOJI[String(type || "other").toLowerCase()] || "🐾";

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

  async function init() {
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
    await startGlobalPresence();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshUnread(); });
    window.addEventListener('beforeunload', () => state.presenceChannel?.untrack());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
