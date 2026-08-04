/* ThePetGrid Sprint 10.4 — Safe Pet Gifts */
(() => {
  "use strict";

  const DAY_MS = 24 * 60 * 60 * 1000;
  const GIFTS = Object.freeze({
    bone: { code:"bone", emoji:"🦴", name:"Bone", description:"For a very good pet" },
    food: { code:"food", emoji:"🥫", name:"Pet Food", description:"A tasty surprise" },
    toy: { code:"toy", emoji:"🧸", name:"Toy", description:"For playtime" },
    heart: { code:"heart", emoji:"❤️", name:"Heart", description:"Send some love" }
  });

  const state = {
    petId:null, ownerId:null, user:null, gifts:[], channel:null,
    sending:false, cooldownUntil:null, timer:null
  };
  const $ = selector => document.querySelector(selector);

  function client() {
    const value = window.ThePetGridSupabase?.client;
    if (!value) throw new Error("Supabase client is not available.");
    return value;
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  }

  function toast(message) {
    let element = $("#petGiftToast");
    if (!element) {
      element = document.createElement("div");
      element.id = "petGiftToast";
      element.className = "pet-gift-toast";
      element.setAttribute("role", "status");
      document.body.appendChild(element);
    }
    element.textContent = message;
    element.classList.add("is-visible");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove("is-visible"), 3200);
  }

  function totals() {
    const result = Object.fromEntries(Object.keys(GIFTS).map(code => [code, 0]));
    state.gifts.forEach(gift => {
      if (result[gift.gift_code] !== undefined) result[gift.gift_code] += 1;
    });
    return result;
  }

  function badges(total, counts) {
    const result = [];
    if (total >= 10) result.push("🎁 Gifted Pet");
    if (counts.heart >= 25) result.push("❤️ Community Favorite");
    if (counts.bone >= 25) result.push("🦴 Bone Lover");
    if (counts.toy >= 15) result.push("🧸 Playful Pet");
    return result;
  }

  function updateCooldown() {
    state.cooldownUntil = null;
    if (!state.user) return;
    const latest = state.gifts.find(gift => String(gift.sender_id) === String(state.user.id));
    if (!latest) return;
    const until = new Date(latest.created_at).getTime() + DAY_MS;
    if (until > Date.now()) state.cooldownUntil = until;
  }

  function remainingText() {
    if (!state.cooldownUntil) return "";
    const remaining = Math.max(0, state.cooldownUntil - Date.now());
    if (!remaining) return "";
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.ceil((remaining % 3600000) / 60000);
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  function giftAvailability() {
    if (!state.user) return { disabled:false, message:"Log in to send one free gift." };
    if (String(state.user.id) === String(state.ownerId)) {
      return { disabled:true, message:"This is your pet — gifts are sent by other community members." };
    }
    const remaining = remainingText();
    if (remaining) return { disabled:true, message:`You can send another gift in ${remaining}.` };
    return { disabled:false, message:"One free gift per pet every 24 hours." };
  }

  function renderAvailability() {
    const availability = giftAvailability();
    const status = $("#petGiftAvailability");
    if (status) {
      status.textContent = availability.message;
      status.classList.toggle("is-locked", availability.disabled);
    }
    [$("#sendPetGiftButton"), $("#sendPetGiftButtonSecondary")].forEach(button => {
      if (!button) return;
      button.disabled = availability.disabled;
      button.setAttribute("aria-disabled", String(availability.disabled));
      button.title = availability.message;
    });
    document.querySelectorAll("#petGiftGrid button").forEach(button => {
      button.disabled = state.sending || availability.disabled;
    });
  }

  function render() {
    const countElement = $("#petProfileGifts");
    const grid = $("#petGiftShowcaseGrid");
    const recent = $("#petGiftRecentList");
    const badgeBox = $("#petGiftBadges");
    const counts = totals();
    const total = state.gifts.length;

    if (countElement) countElement.textContent = String(total);
    if (grid) {
      grid.innerHTML = Object.values(GIFTS).map(gift => `
        <div class="pet-gift-item">
          <span class="pet-gift-item__emoji" aria-hidden="true">${gift.emoji}</span>
          <span><strong>${gift.name}</strong><small>${gift.description}</small></span>
          <b>${counts[gift.code]}</b>
        </div>`).join("");
    }

    if (recent) {
      const rows = state.gifts.slice(0, 20);
      recent.innerHTML = rows.length ? rows.map(gift => {
        const sender = gift.profiles?.username || "ThePetGrid member";
        const message = gift.message ? `<small>“${escapeHtml(gift.message)}”</small>` : "";
        const date = new Intl.DateTimeFormat("en", { day:"2-digit", month:"short", year:"numeric" }).format(new Date(gift.created_at));
        return `<div class="pet-gift-recent"><span>${escapeHtml(gift.gift_emoji)}</span><div><strong>${escapeHtml(sender)} sent ${escapeHtml(gift.gift_name)}</strong>${message}</div><time datetime="${escapeHtml(gift.created_at)}">${date}</time></div>`;
      }).join("") : '<p class="pet-gift-empty">No gifts yet. Be the first to send one.</p>';
    }

    if (badgeBox) {
      const earned = badges(total, counts);
      badgeBox.innerHTML = earned.length
        ? earned.map(label => `<span class="pet-gift-badge">${label}</span>`).join("")
        : '<span class="pet-gift-badges-empty">Badges unlock as this pet receives gifts.</span>';
    }
    updateCooldown();
    renderAvailability();
  }

  async function load() {
    const { data, error } = await client().from("pet_gifts")
      .select("id,sender_id,pet_id,gift_code,gift_emoji,gift_name,message,is_demo,created_at,profiles:sender_id(username)")
      .eq("pet_id", state.petId).order("created_at", { ascending:false }).limit(100);
    if (error) throw error;
    state.gifts = data || [];
    render();
  }

  function openModal() {
    const availability = giftAvailability();
    if (availability.disabled) return toast(availability.message);
    if (!state.user) {
      location.href = `login.html?redirect=${encodeURIComponent(location.href)}`;
      return;
    }
    const modal = $("#petGiftModal");
    if (modal) {
      modal.hidden = false;
      modal.classList.add("is-open");
      $("#petGiftMessage")?.focus();
    }
  }

  function closeModal() {
    const modal = $("#petGiftModal");
    if (modal) {
      modal.hidden = true;
      modal.classList.remove("is-open");
    }
  }

  async function send(button) {
    if (state.sending) return;
    const availability = giftAvailability();
    if (availability.disabled) return toast(availability.message);
    if (!state.user) return openModal();
    const gift = GIFTS[button.dataset.giftCode];
    if (!gift) return;

    const message = ($("#petGiftMessage")?.value || "").trim().slice(0, 280);
    state.sending = true;
    renderAvailability();
    try {
      const { data, error } = await client().rpc("send_pet_gift", {
        p_pet_id:state.petId,
        p_gift_code:gift.code,
        p_message:message
      });
      if (error) throw error;
      const inserted = Array.isArray(data) ? data[0] : data;
      if (inserted?.id) await load();
      else await load();
      if ($("#petGiftMessage")) $("#petGiftMessage").value = "";
      closeModal();
      toast(`${gift.emoji} ${gift.name} sent — the owner was notified!`);
    } catch (error) {
      console.error("Pet gift send failed:", error);
      const messageText = String(error.message || "");
      if (/24 hours/i.test(messageText)) {
        await load().catch(() => {});
        toast("You can send one gift to this pet every 24 hours.");
      } else if (/own pet/i.test(messageText)) {
        toast("You cannot send a gift to your own pet.");
      } else if (/memorial/i.test(messageText)) {
        toast("Use the Memorial tribute actions for this pet.");
      } else {
        toast(messageText || "Gift could not be sent.");
      }
    } finally {
      state.sending = false;
      renderAvailability();
    }
  }

  async function subscribe() {
    state.channel = client().channel(`pet-gifts:${state.petId}`)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"pet_gifts", filter:`pet_id=eq.${state.petId}` }, async () => {
        try { await load(); } catch (error) { console.error(error); }
      }).subscribe();
  }

  async function initialize(petId) {
    state.petId = String(petId);
    try {
      const [{ data:authData }, petResult] = await Promise.all([
        client().auth.getUser(),
        client().from("pets").select("owner_id,is_memorial").eq("id", state.petId).single()
      ]);
      state.user = authData?.user || null;
      state.ownerId = petResult.data?.owner_id || null;
      await load();
      await subscribe();
      clearInterval(state.timer);
      state.timer = setInterval(() => { updateCooldown(); renderAvailability(); }, 60000);
    } catch (error) {
      console.error("Pet Gift Center could not load:", error);
      toast("Run the updated backend/supabase-pet-gifts.sql in Supabase first.");
    }
  }

  document.addEventListener("click", event => {
    if (event.target.closest("#sendPetGiftButton, #sendPetGiftButtonSecondary")) openModal();
    if (event.target.closest("#closePetGiftModal") || event.target.matches("[data-close-pet-gift-modal]")) closeModal();
    const giftButton = event.target.closest("#petGiftGrid [data-gift-code]");
    if (giftButton) send(giftButton);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("#petGiftModal")?.hidden) closeModal();
  });

  window.addEventListener("beforeunload", () => {
    clearInterval(state.timer);
    if (state.channel) client().removeChannel(state.channel);
  });
  window.ThePetGridPetGifts = { initialize, reload:load, getCount:() => state.gifts.length, gifts:GIFTS };
})();
