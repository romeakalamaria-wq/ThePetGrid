/* ThePetGrid Sprint 5.3 — Rich Supabase Messaging */
(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const els = {
    list: $('#conversationList'), emptyList: $('#conversationsEmptyState'), activeChat: $('#activeChat'),
    emptyChat: $('#chatEmptyState'), messages: $('#messagesList'), viewport: $('#messagesViewport'),
    form: $('#messageComposerForm'), input: $('#messageInput'), send: $('#sendMessageButton'),
    counter: $('#messageInputCounter'), name: $('#chatUserName'), avatar: $('#chatUserAvatar'),
    status: $('#chatUserStatus'), presenceDot: $('#chatUserPresence'), newBtn: $('#newConversationButton'),
    emptyNewBtn: $('#emptyStateNewMessageButton'), modal: $('#newConversationModal'),
    closeModal: $('#closeNewConversationModal'), usersList: $('#newConversationUsersList'),
    userSearch: $('#newConversationSearchInput'), toast: $('#messagesToast'), toastText: $('#messagesToastText'),
    search: $('#conversationSearchInput'), emojiButton: $('#emojiButton'), emojiPicker: $('#emojiPicker'),
    closeEmoji: $('#closeEmojiPicker'), emojiGrid: $('#emojiGrid'), attachmentButton: $('#attachmentButton'),
    attachmentInput: $('#attachmentInput'), attachmentPreview: $('#attachmentPreview'),
    attachmentPreviewImage: $('#attachmentPreviewImage'), attachmentPreviewName: $('#attachmentPreviewName'),
    attachmentPreviewSize: $('#attachmentPreviewSize'), removeAttachment: $('#removeAttachmentButton'),
    giftButton: $('#giftButton'), giftModal: $('#giftModal'), closeGiftModal: $('#closeGiftModal'), giftGrid: $('#giftGrid')
  };

  const state = {
    user: null, profiles: new Map(), allProfiles: [], messages: [], peerId: null,
    messagesChannel: null, presenceChannel: null, onlineUserIds: new Set(), sending: false,
    attachment: null
  };

  const avatarFallback = '../assets/avatar.png';
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const allowedTypes = new Set([
    'image/jpeg','image/png','image/webp','image/gif','application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip','application/x-zip-compressed'
  ]);
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
  const formatDate = (date) => new Intl.DateTimeFormat('el-GR', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
  }).format(new Date(date));
  const formatBytes = (bytes = 0) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  function showToast(text) {
    if (!els.toast || !els.toastText) return;
    els.toastText.textContent = text;
    els.toast.hidden = false;
    window.setTimeout(() => { els.toast.hidden = true; }, 2800);
  }

  function getClient() {
    if (window.ThePetGridSupabase?.client) return window.ThePetGridSupabase.client;
    if (window.supabaseClient?.auth && window.supabaseClient?.from) return window.supabaseClient;
    if (window.thePetGridSupabase?.client) return window.thePetGridSupabase.client;
    throw new Error('Supabase client is not available.');
  }

  async function requireUser(client) {
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) {
      location.href = 'login.html?redirect=' + encodeURIComponent(location.href);
      throw new Error('Login required');
    }
    state.user = data.user;
  }

  async function loadProfiles(client) {
    const { data, error } = await client.from('profiles').select('id, username, avatar_url, country').order('username');
    if (error) throw error;
    const profiles = data || [];
    state.allProfiles = profiles.filter((profile) => profile.id !== state.user.id);
    state.profiles = new Map(profiles.map((profile) => [profile.id, profile]));
  }

  const messageColumns = 'id, sender_id, recipient_id, body, read_at, created_at, message_type, attachment_url, attachment_name, attachment_type, attachment_size, gift_code, gift_emoji, gift_name';

  async function loadMessages(client) {
    const { data, error } = await client.from('messages').select(messageColumns)
      .or(`sender_id.eq.${state.user.id},recipient_id.eq.${state.user.id}`).order('created_at', { ascending: true });
    if (error) throw error;
    state.messages = data || [];
  }

  function peerOf(message) { return message.sender_id === state.user.id ? message.recipient_id : message.sender_id; }
  function previewText(message) {
    if (message.message_type === 'gift') return `${message.gift_emoji || '🎁'} ${message.gift_name || 'Virtual gift'}`;
    if (message.message_type === 'attachment') return `📎 ${message.attachment_name || 'Attachment'}`;
    return message.body || '';
  }
  function getConversations() {
    const map = new Map();
    for (const message of state.messages) {
      const peerId = peerOf(message);
      const conversation = map.get(peerId) || { peerId, last: message, unread: 0 };
      conversation.last = message;
      if (message.recipient_id === state.user.id && !message.read_at) conversation.unread += 1;
      map.set(peerId, conversation);
    }
    return [...map.values()].sort((a, b) => new Date(b.last.created_at) - new Date(a.last.created_at));
  }
  const isOnline = (userId) => Boolean(userId && state.onlineUserIds.has(userId));

  function renderConversations() {
    if (!els.list) return;
    const term = (els.search?.value || '').trim().toLowerCase();
    const rows = getConversations().filter((c) => {
      const p = state.profiles.get(c.peerId);
      return !term || (p?.username || '').toLowerCase().includes(term) || previewText(c.last).toLowerCase().includes(term);
    });
    els.list.innerHTML = rows.map((c) => {
      const p = state.profiles.get(c.peerId) || { username: 'Member' };
      const online = isOnline(c.peerId);
      return `<button type="button" class="conversation-item ${c.peerId === state.peerId ? 'active is-active' : ''}" data-peer-id="${c.peerId}">
        <span class="conversation-avatar-wrapper"><img src="${escapeHtml(p.avatar_url || avatarFallback)}" alt="" class="conversation-avatar"><span class="presence-dot ${online ? 'online' : ''}"></span></span>
        <span class="conversation-main"><strong>${escapeHtml(p.username || 'Member')}</strong><small>${escapeHtml(previewText(c.last).slice(0, 72))}</small></span>
        <span class="conversation-meta"><time>${formatDate(c.last.created_at)}</time>${c.unread ? `<b class="unread-count">${c.unread}</b>` : ''}</span>
      </button>`;
    }).join('');
    if (els.emptyList) els.emptyList.hidden = rows.length > 0;
    els.list.querySelectorAll('[data-peer-id]').forEach((button) => button.addEventListener('click', () => openPeer(button.dataset.peerId)));
  }

  function updatePresenceUI() {
    if (!state.peerId) return;
    const online = isOnline(state.peerId);
    if (els.status) els.status.textContent = online ? 'Online' : 'Offline';
    if (els.presenceDot) els.presenceDot.classList.toggle('online', online);
  }

  function updateComposerState() {
    const body = (els.input?.value || '').trim();
    const canSend = Boolean(state.peerId && (body || state.attachment) && !state.sending);
    if (els.send) els.send.disabled = !canSend;
    if (els.input) els.input.disabled = !state.peerId;
    if (els.counter) els.counter.textContent = `${els.input?.value.length || 0} / 1500`;
  }

  function renderMessageContent(message) {
    if (message.message_type === 'gift') {
      return `<div class="message-virtual-gift"><span class="message-virtual-gift__emoji">${escapeHtml(message.gift_emoji || '🎁')}</span><span class="message-virtual-gift__copy"><strong>${escapeHtml(message.gift_name || 'Virtual Gift')}</strong><span>A gift from ThePetGrid</span></span></div>`;
    }
    if (message.message_type === 'attachment') {
      const isImage = (message.attachment_type || '').startsWith('image/');
      if (isImage) return `<a class="message-attachment-image" href="${escapeHtml(message.attachment_url)}" target="_blank" rel="noopener"><img src="${escapeHtml(message.attachment_url)}" alt="${escapeHtml(message.attachment_name || 'Image')}"></a>${message.body ? `<p>${escapeHtml(message.body).replace(/\n/g, '<br>')}</p>` : ''}`;
      return `<a class="message-file-card" href="${escapeHtml(message.attachment_url)}" target="_blank" rel="noopener"><span>📄</span><span><strong>${escapeHtml(message.attachment_name || 'File')}</strong><small>${formatBytes(message.attachment_size || 0)}</small></span><b>Open</b></a>${message.body ? `<p>${escapeHtml(message.body).replace(/\n/g, '<br>')}</p>` : ''}`;
    }
    return `<p>${escapeHtml(message.body || '').replace(/\n/g, '<br>')}</p>`;
  }

  function renderChat() {
    if (!state.peerId) {
      if (els.activeChat) els.activeChat.hidden = true;
      if (els.emptyChat) els.emptyChat.hidden = false;
      updateComposerState(); return;
    }
    const p = state.profiles.get(state.peerId) || { username: 'Member' };
    if (els.activeChat) els.activeChat.hidden = false;
    if (els.emptyChat) els.emptyChat.hidden = true;
    if (els.name) els.name.textContent = p.username || 'Member';
    if (els.avatar) els.avatar.src = p.avatar_url || avatarFallback;
    updatePresenceUI();
    const messages = state.messages.filter((m) => peerOf(m) === state.peerId);
    if (els.messages) els.messages.innerHTML = messages.length ? messages.map((m) => {
      const mine = m.sender_id === state.user.id;
      return `<article class="message-row ${mine ? 'is-mine' : 'is-theirs'}" data-message-id="${m.id}"><div class="message-bubble">${renderMessageContent(m)}<time>${formatDate(m.created_at)}</time></div></article>`;
    }).join('') : '<div class="details-mini-empty">No messages yet. Send the first message.</div>';
    updateComposerState();
    requestAnimationFrame(() => { if (els.viewport) els.viewport.scrollTop = els.viewport.scrollHeight; });
  }

  async function markRead(client) {
    if (!state.peerId) return;
    const ids = state.messages.filter((m) => m.sender_id === state.peerId && m.recipient_id === state.user.id && !m.read_at).map((m) => m.id);
    if (!ids.length) return;
    const readAt = new Date().toISOString();
    const { error } = await client.from('messages').update({ read_at: readAt }).in('id', ids);
    if (!error) state.messages.forEach((m) => { if (ids.includes(m.id)) m.read_at = readAt; });
  }

  async function openPeer(peerId) {
    if (!peerId || peerId === state.user.id || !state.profiles.has(peerId)) return showToast('This member could not be selected.');
    const client = getClient(); state.peerId = peerId;
    const url = new URL(location.href); url.searchParams.set('user', peerId); history.replaceState({}, '', url);
    renderConversations(); renderChat(); await markRead(client); renderConversations(); els.input?.focus();
  }

  function cleanFileName(name) { return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-120); }
  async function uploadAttachment(client, file) {
    const path = `${state.user.id}/${Date.now()}-${crypto.randomUUID()}-${cleanFileName(file.name)}`;
    const { error } = await client.storage.from('message-attachments').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (error) throw error;
    const { data } = client.storage.from('message-attachments').getPublicUrl(path);
    return data.publicUrl;
  }

  function clearAttachment() {
    if (state.attachment?.previewUrl) URL.revokeObjectURL(state.attachment.previewUrl);
    state.attachment = null;
    if (els.attachmentInput) els.attachmentInput.value = '';
    if (els.attachmentPreview) els.attachmentPreview.hidden = true;
    updateComposerState();
  }
  function selectAttachment(file) {
    if (!file) return;
    if (!allowedTypes.has(file.type)) return showToast('Unsupported file type.');
    if (file.size > MAX_FILE_SIZE) return showToast('Maximum attachment size is 10 MB.');
    clearAttachment();
    state.attachment = { file, previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '' };
    if (els.attachmentPreviewName) els.attachmentPreviewName.textContent = file.name;
    if (els.attachmentPreviewSize) els.attachmentPreviewSize.textContent = formatBytes(file.size);
    if (els.attachmentPreviewImage) {
      els.attachmentPreviewImage.src = state.attachment.previewUrl || '../assets/avatar.png';
      els.attachmentPreviewImage.style.objectFit = state.attachment.previewUrl ? 'cover' : 'contain';
    }
    if (els.attachmentPreview) els.attachmentPreview.hidden = false;
    updateComposerState();
  }

  async function insertMessage(payload) {
    const client = getClient();
    const { data, error } = await client.from('messages').insert(payload).select(messageColumns).single();
    if (error) throw error;
    if (!state.messages.some((m) => m.id === data.id)) state.messages.push(data);
    renderConversations(); renderChat();
    return data;
  }

  async function sendMessage(event) {
    event.preventDefault();
    const body = (els.input?.value || '').trim();
    if (!state.peerId || (!body && !state.attachment) || state.sending) return;
    state.sending = true; updateComposerState();
    try {
      const payload = { sender_id: state.user.id, recipient_id: state.peerId, body: body || '' };
      if (state.attachment) {
        const { file } = state.attachment;
        payload.message_type = 'attachment';
        payload.attachment_url = await uploadAttachment(getClient(), file);
        payload.attachment_name = file.name;
        payload.attachment_type = file.type;
        payload.attachment_size = file.size;
      } else payload.message_type = 'text';
      await insertMessage(payload);
      els.input.value = ''; clearAttachment();
    } catch (error) {
      console.error('Message send failed:', error); showToast(error.message || 'Message could not be sent.');
    } finally { state.sending = false; updateComposerState(); els.input?.focus(); }
  }

  async function sendGift(button) {
    if (!state.peerId || state.sending) return showToast('Select a member first.');
    state.sending = true; updateComposerState();
    try {
      await insertMessage({
        sender_id: state.user.id, recipient_id: state.peerId, body: `${button.dataset.giftEmoji || '🎁'} ${button.dataset.giftName || 'Virtual Gift'}`, message_type: 'gift',
        gift_code: button.dataset.giftCode, gift_emoji: button.dataset.giftEmoji, gift_name: button.dataset.giftName
      });
      closeGiftModal(); showToast(`${button.dataset.giftName} sent!`);
    } catch (error) { console.error('Gift send failed:', error); showToast(error.message || 'Gift could not be sent.'); }
    finally { state.sending = false; updateComposerState(); }
  }

  function renderUsers() {
    if (!els.usersList) return;
    const term = (els.userSearch?.value || '').trim().toLowerCase();
    const users = state.allProfiles.filter((p) => !term || (p.username || '').toLowerCase().includes(term));
    els.usersList.innerHTML = users.map((p) => `<button type="button" class="new-conversation-user" data-user-id="${p.id}"><span class="conversation-avatar-wrapper"><img src="${escapeHtml(p.avatar_url || avatarFallback)}" alt=""><span class="presence-dot ${isOnline(p.id) ? 'online' : ''}"></span></span><span><strong>${escapeHtml(p.username || 'Member')}</strong><small>${isOnline(p.id) ? 'Online' : escapeHtml(p.country || 'Offline')}</small></span></button>`).join('');
    els.usersList.querySelectorAll('[data-user-id]').forEach((b) => b.addEventListener('click', async () => { closeModal(); await openPeer(b.dataset.userId); }));
  }
  function openModal() { if (!els.modal) return; els.modal.hidden = false; els.modal.classList.add('is-open'); renderUsers(); els.userSearch?.focus(); }
  function closeModal() { if (!els.modal) return; els.modal.hidden = true; els.modal.classList.remove('is-open'); }
  function openGiftModal() { if (!state.peerId) return showToast('Select a member first.'); if (els.giftModal) els.giftModal.hidden = false; }
  function closeGiftModal() { if (els.giftModal) els.giftModal.hidden = true; }

  async function subscribeToMessages(client) {
    if (state.messagesChannel) await client.removeChannel(state.messagesChannel);
    state.messagesChannel = client.channel(`messages:${state.user.id}:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async ({ new: message }) => {
        if (message.sender_id !== state.user.id && message.recipient_id !== state.user.id) return;
        if (!state.messages.some((m) => m.id === message.id)) state.messages.push(message);
        renderConversations(); renderChat();
        if (message.recipient_id === state.user.id && message.sender_id === state.peerId) { await markRead(client); renderConversations(); }
        else if (message.recipient_id === state.user.id) showToast(`New message from ${state.profiles.get(message.sender_id)?.username || 'a member'}`);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, ({ new: message }) => {
        const index = state.messages.findIndex((m) => m.id === message.id); if (index >= 0) state.messages[index] = message; renderConversations();
      }).subscribe();
  }

  async function subscribeToPresence(client) {
    if (state.presenceChannel) await client.removeChannel(state.presenceChannel);
    state.presenceChannel = client.channel('thepetgrid-online-members', { config: { presence: { key: state.user.id } } });
    const sync = () => {
      state.onlineUserIds = new Set(Object.keys(state.presenceChannel.presenceState()));
      renderConversations(); updatePresenceUI(); if (els.modal && !els.modal.hidden) renderUsers();
    };
    state.presenceChannel.on('presence', { event: 'sync' }, sync).on('presence', { event: 'join' }, sync).on('presence', { event: 'leave' }, sync)
      .subscribe(async (status) => { if (status === 'SUBSCRIBED') await state.presenceChannel.track({ user_id: state.user.id, online_at: new Date().toISOString() }); });
  }

  async function resolveInitialPeer() {
    const params = new URLSearchParams(location.search); const id = params.get('user'); const username = params.get('username');
    if (id && state.profiles.has(id) && id !== state.user.id) return id;
    if (username) return state.allProfiles.find((p) => (p.username || '').toLowerCase() === username.toLowerCase())?.id || null;
    return getConversations()[0]?.peerId || null;
  }

  function bindEvents() {
    els.form?.addEventListener('submit', sendMessage);
    els.input?.addEventListener('input', updateComposerState);
    els.input?.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (!els.send?.disabled) els.form?.requestSubmit(); } });
    els.newBtn?.addEventListener('click', openModal); els.emptyNewBtn?.addEventListener('click', openModal); els.closeModal?.addEventListener('click', closeModal);
    els.userSearch?.addEventListener('input', renderUsers); els.search?.addEventListener('input', renderConversations);
    els.emojiButton?.addEventListener('click', () => { if (!els.emojiPicker) return; els.emojiPicker.hidden = !els.emojiPicker.hidden; els.emojiButton.setAttribute('aria-expanded', String(!els.emojiPicker.hidden)); });
    els.closeEmoji?.addEventListener('click', () => { els.emojiPicker.hidden = true; });
    els.emojiGrid?.addEventListener('click', (event) => { const b = event.target.closest('[data-emoji]'); if (!b || !state.peerId) return; els.input.value += b.dataset.emoji; els.emojiPicker.hidden = true; updateComposerState(); els.input.focus(); });
    els.attachmentButton?.addEventListener('click', () => { if (!state.peerId) return showToast('Select a member first.'); els.attachmentInput?.click(); });
    els.attachmentInput?.addEventListener('change', () => selectAttachment(els.attachmentInput.files?.[0]));
    els.removeAttachment?.addEventListener('click', clearAttachment);
    els.giftButton?.addEventListener('click', openGiftModal); els.closeGiftModal?.addEventListener('click', closeGiftModal);
    els.giftGrid?.addEventListener('click', (event) => { const b = event.target.closest('[data-gift-code]'); if (b) sendGift(b); });
    els.giftModal?.addEventListener('click', (event) => { if (event.target.matches('[data-close-gift-modal]')) closeGiftModal(); });
    els.modal?.addEventListener('click', (event) => { if (event.target === els.modal || event.target.matches('[data-close-new-conversation-modal]')) closeModal(); });
    window.addEventListener('beforeunload', () => { state.presenceChannel?.untrack(); clearAttachment(); });
  }

  async function init() {
    try {
      const client = getClient(); await requireUser(client); await loadProfiles(client); await loadMessages(client);
      state.peerId = await resolveInitialPeer(); bindEvents(); renderConversations(); renderChat(); await markRead(client);
      await subscribeToMessages(client); await subscribeToPresence(client);
    } catch (error) { console.error('Messaging init failed:', error); if (error.message !== 'Login required') showToast(error.message || 'Messaging could not load.'); }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
