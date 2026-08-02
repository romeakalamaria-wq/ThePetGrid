(() => {
  "use strict";

  const state = { pet: null, user: null, memorialId: null };

  async function currentUser() {
    if (window.ThePetGridAuth?.ready) await window.ThePetGridAuth.ready;
    return window.ThePetGridAuth?.getCurrentUser?.() || null;
  }

  function elements() {
    return {
      create: document.getElementById("createPetMemorialButton"),
      visit: document.getElementById("visitPetMemorialButton"),
      modal: document.getElementById("petMemorialModal"),
      form: document.getElementById("petMemorialForm"),
      name: document.getElementById("memorialPetName"),
      status: document.getElementById("petMemorialStatus")
    };
  }

  function update() {
    const ui = elements();
    if (!state.pet || !ui.create || !ui.visit) return;
    const isOwner = Boolean(state.user?.id && state.pet.ownerId && String(state.user.id) === String(state.pet.ownerId));
    const isMemorial = state.pet.status === "memorial" || Boolean(state.memorialId);
    ui.create.hidden = !isOwner || isMemorial || !state.pet.isCloudPet;
    ui.visit.hidden = !isMemorial;
    ui.visit.href = state.memorialId
      ? `memorial.html?memorialId=${encodeURIComponent(state.memorialId)}`
      : `memorial.html?petId=${encodeURIComponent(state.pet.id)}`;
  }

  async function findMemorial() {
    if (!state.pet?.isCloudPet || !window.ThePetGridSupabase?.client) return;
    const { data } = await window.ThePetGridSupabase.client
      .from("pet_memorials").select("id").eq("pet_id", String(state.pet.id)).maybeSingle();
    if (data?.id) state.memorialId = data.id;
  }

  async function setPet(pet) {
    state.pet = pet;
    state.user = await currentUser();
    await findMemorial().catch(() => {});
    update();
  }

  function close() { const modal = elements().modal; if (modal) modal.hidden = true; }
  function open() {
    const ui = elements();
    if (!state.pet || !ui.modal) return;
    ui.name.textContent = state.pet.name || "this pet";
    ui.status.hidden = true;
    ui.modal.hidden = false;
  }

  async function submit(event) {
    event.preventDefault();
    const ui = elements();
    const client = window.ThePetGridSupabase?.client;
    if (!client || !state.pet?.id) return;
    const submitButton = ui.form.querySelector('[type="submit"]');
    const data = new FormData(ui.form);
    submitButton.disabled = true;
    ui.status.hidden = false;
    ui.status.className = "pet-memorial-status";
    ui.status.textContent = "Creating this memorial with care…";
    try {
      const { data: memorial, error } = await client.rpc("create_pet_memorial", {
        p_pet_id: String(state.pet.id),
        p_birth_date: data.get("birthDate") || null,
        p_passed_date: data.get("passedDate"),
        p_farewell_message: String(data.get("farewellMessage") || "").trim(),
        p_story: String(data.get("story") || "").trim() || null,
        p_visibility: data.get("visibility") || "public",
        p_notify_followers: data.get("notifyFollowers") === "on"
      });
      if (error) throw error;
      state.memorialId = memorial?.id;
      state.pet.status = "memorial";
      ui.status.classList.add("is-success");
      const followersNotified = data.get("notifyFollowers") === "on" && data.get("visibility") === "public";
      ui.status.textContent = followersNotified
        ? `🤍 ${state.pet.name}'s Memorial has been created. Followers have been notified.`
        : `🤍 ${state.pet.name}'s Memorial has been created with care.`;
      document.getElementById("petProfileStatus").textContent = "In Memory";
      document.getElementById("petProfileStatus").classList.add("is-memorial");
      update();
      setTimeout(() => { location.href = `memorial.html?memorialId=${encodeURIComponent(state.memorialId)}`; }, 1500);
    } catch (error) {
      ui.status.classList.add("is-error");
      ui.status.textContent = error.message || "The memorial could not be created.";
    } finally {
      submitButton.disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const ui = elements();
    ui.create?.addEventListener("click", open);
    ui.modal?.querySelectorAll("[data-close-pet-memorial]").forEach(node => node.addEventListener("click", close));
    ui.form?.addEventListener("submit", submit);
  });

  window.ThePetGridMemorialFlow = { setPet };
})();
