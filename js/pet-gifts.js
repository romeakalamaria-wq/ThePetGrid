/* ThePetGrid Sprint 5.4 — Pet Gift Center */
(() => {
  'use strict';

  const GIFTS = Object.freeze({
    bone: { code: 'bone', emoji: '🦴', name: 'Bone', description: 'For a very good pet' },
    food: { code: 'food', emoji: '🥫', name: 'Pet Food', description: 'A tasty surprise' },
    toy: { code: 'toy', emoji: '🧸', name: 'Toy', description: 'For playtime' },
    heart: { code: 'heart', emoji: '❤️', name: 'Heart', description: 'Send some love' },
    flowers: { code: 'flowers', emoji: '🌹', name: 'Flowers', description: 'A caring gesture' },
    candle: { code: 'candle', emoji: '🕯️', name: 'Candle', description: 'For remembrance' }
  });

  const state = { petId: null, gifts: [], channel: null, sending: false };
  const $ = selector => document.querySelector(selector);

  function client() {
    const value = window.ThePetGridSupabase?.client;
    if (!value) throw new Error('Supabase client is not available.');
    return value;
  }

  function toast(message) {
    let element = $('#petGiftToast');
    if (!element) {
      element = document.createElement('div');
      element.id = 'petGiftToast';
      element.className = 'pet-gift-toast';
      element.setAttribute('role', 'status');
      document.body.appendChild(element);
    }
    element.textContent = message;
    element.classList.add('is-visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('is-visible'), 2600);
  }

  function totals() {
    const result = Object.fromEntries(Object.keys(GIFTS).map(code => [code, 0]));
    state.gifts.forEach(gift => { if (result[gift.gift_code] !== undefined) result[gift.gift_code] += 1; });
    return result;
  }

  function badges(total, counts) {
    const list = [];
    if (total >= 10) list.push('🎁 Gifted Pet');
    if (counts.heart >= 25) list.push('❤️ Community Favorite');
    if (counts.bone >= 25) list.push('🦴 Bone Lover');
    if (counts.toy >= 15) list.push('🧸 Playful Pet');
    if ((counts.flowers + counts.candle) >= 20) list.push('🌹 Beloved Forever');
    return list;
  }

  function render() {
    const countElement = $('#petProfileGifts');
    const grid = $('#petGiftShowcaseGrid');
    const recent = $('#petGiftRecentList');
    const badgeBox = $('#petGiftBadges');
    const counts = totals();
    const total = state.gifts.length;

    if (countElement) countElement.textContent = String(total);
    if (grid) {
      grid.innerHTML = Object.values(GIFTS).map(gift => `
        <div class="pet-gift-item">
          <span class="pet-gift-item__emoji" aria-hidden="true">${gift.emoji}</span>
          <span><strong>${gift.name}</strong><small>${gift.description}</small></span>
          <b>${counts[gift.code]}</b>
        </div>`).join('');
    }

    if (recent) {
      const rows = state.gifts.slice(0, 6);
      recent.innerHTML = rows.length ? rows.map(gift => {
        const sender = gift.profiles?.username || 'ThePetGrid member';
        const message = gift.message ? `<small>“${escapeHtml(gift.message)}”</small>` : '';
        return `<div class="pet-gift-recent"><span>${gift.gift_emoji}</span><div><strong>${escapeHtml(sender)} sent ${escapeHtml(gift.gift_name)}</strong>${message}</div><time>${new Intl.DateTimeFormat('el-GR', { day:'2-digit', month:'short' }).format(new Date(gift.created_at))}</time></div>`;
      }).join('') : '<p class="pet-gift-empty">No gifts yet. Be the first to send one.</p>';
    }

    if (badgeBox) {
      const earned = badges(total, counts);
      badgeBox.innerHTML = earned.length ? earned.map(label => `<span class="pet-gift-badge">${label}</span>`).join('') : '<span class="pet-gift-badges-empty">Badges unlock as this pet receives gifts.</span>';
    }
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  async function load() {
    const { data, error } = await client().from('pet_gifts')
      .select('id,sender_id,pet_id,gift_code,gift_emoji,gift_name,message,is_demo,created_at,profiles:sender_id(username)')
      .eq('pet_id', state.petId).order('created_at', { ascending: false });
    if (error) throw error;
    state.gifts = data || [];
    render();
  }

  function openModal() {
    const modal = $('#petGiftModal');
    if (modal) { modal.hidden = false; modal.classList.add('is-open'); }
  }

  function closeModal() {
    const modal = $('#petGiftModal');
    if (modal) { modal.hidden = true; modal.classList.remove('is-open'); }
  }

  async function send(button) {
    if (state.sending) return;
    const { data: authData } = await client().auth.getUser();
    const user = authData?.user;
    if (!user) {
      location.href = `login.html?redirect=${encodeURIComponent(location.href)}`;
      return;
    }

    const gift = GIFTS[button.dataset.giftCode];
    if (!gift) return;
    const message = ($('#petGiftMessage')?.value || '').trim().slice(0, 280);
    state.sending = true;
    document.querySelectorAll('#petGiftGrid button').forEach(item => { item.disabled = true; });

    try {
      const { data, error } = await client().from('pet_gifts').insert({
        sender_id: user.id,
        pet_id: state.petId,
        gift_code: gift.code,
        gift_emoji: gift.emoji,
        gift_name: gift.name,
        message,
        is_demo: true
      }).select('id,sender_id,pet_id,gift_code,gift_emoji,gift_name,message,is_demo,created_at,profiles:sender_id(username)').single();
      if (error) throw error;
      if (!state.gifts.some(item => item.id === data.id)) state.gifts.unshift(data);
      render();
      if ($('#petGiftMessage')) $('#petGiftMessage').value = '';
      closeModal();
      toast(`${gift.emoji} ${gift.name} sent!`);
    } catch (error) {
      console.error('Pet gift send failed:', error);
      toast(error.message || 'Gift could not be sent.');
    } finally {
      state.sending = false;
      document.querySelectorAll('#petGiftGrid button').forEach(item => { item.disabled = false; });
    }
  }

  async function subscribe() {
    state.channel = client().channel(`pet-gifts:${state.petId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pet_gifts', filter: `pet_id=eq.${state.petId}` }, async () => {
        try { await load(); } catch (error) { console.error(error); }
      }).subscribe();
  }

  async function initialize(petId) {
    state.petId = String(petId);
    try { await load(); await subscribe(); }
    catch (error) {
      console.error('Pet Gift Center could not load:', error);
      toast('Run backend/supabase-pet-gifts.sql in Supabase first.');
    }
  }

  document.addEventListener('click', event => {
    if (event.target.closest('#sendPetGiftButton, #sendPetGiftButtonSecondary')) openModal();
    if (event.target.closest('#closePetGiftModal') || event.target.matches('[data-close-pet-gift-modal]')) closeModal();
    const giftButton = event.target.closest('#petGiftGrid [data-gift-code]');
    if (giftButton) send(giftButton);
  });

  window.addEventListener('beforeunload', () => { if (state.channel) client().removeChannel(state.channel); });
  window.ThePetGridPetGifts = { initialize, reload: load, getCount: () => state.gifts.length, gifts: GIFTS };
})();
