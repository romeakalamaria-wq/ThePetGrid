(() => {
  "use strict";

  let memorials = [
    { id: "luna", name: "Luna", type: "Golden Retriever", years: "2011 — 2025", image: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1000&q=85", message: "Our forever sunshine and the gentlest soul.", storyTitle: "A lifetime of sunshine", candles: 64, flowers: 41 },
    { id: "milo", name: "Milo", type: "Tabby Cat", years: "2013 — 2024", image: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=1000&q=85", message: "The smallest paws left the biggest mark.", storyTitle: "The quiet heart of our home", candles: 47, flowers: 29 },
    { id: "coco", name: "Coco", type: "Netherland Dwarf Rabbit", years: "2017 — 2025", image: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=1000&q=85", message: "Forever hopping through our happiest memories.", storyTitle: "Small paws, endless joy", candles: 37, flowers: 23 }
  ];

  const countsKey = "tpg:memorial-demo-counts";
  const messageKey = "tpg:memorial-demo-messages";
  const savedCounts = JSON.parse(localStorage.getItem(countsKey) || "{}");

  function getClient() { return window.ThePetGridSupabase?.client || null; }

  function normalizeCloudMemorial(row) {
    const pet = row.pets || {};
    const birthYear = row.birth_date ? new Date(row.birth_date).getFullYear() : "";
    const passedYear = row.passed_date ? new Date(row.passed_date).getFullYear() : "";
    return {
      id: row.id,
      petId: row.pet_id,
      name: pet.name || "Beloved Pet",
      type: [pet.type, pet.breed].filter(Boolean).join(" · ") || "Companion",
      years: [birthYear, passedYear].filter(Boolean).join(" — ") || "Forever remembered",
      image: pet.image_url || "../assets/avatar.png",
      message: row.farewell_message || "Forever in our hearts.",
      story: row.story || pet.bio || "A beautiful life, remembered with love.",
      storyTitle: "A life filled with love",
      candles: Number(row.candles?.[0]?.count || 0),
      flowers: Number(row.flowers?.[0]?.count || 0),
      isCloud: true
    };
  }

  async function loadCloudMemorials() {
    const client = getClient();
    if (!client) return;
    const { data, error } = await client.from("pet_memorials")
      .select("*,pets(name,type,breed,bio,image_url)")
      .eq("visibility", "public").order("created_at", { ascending: false });
    if (error) throw error;
    if (data?.length) memorials = data.map(normalizeCloudMemorial);
  }

  function countFor(id, kind, fallback) {
    return Number(savedCounts[`${id}:${kind}`] ?? fallback);
  }

  function renderCards(query = "") {
    const grid = document.getElementById("memorialGrid");
    if (!grid) return;
    const normalized = query.trim().toLowerCase();
    const filtered = memorials.filter(item => `${item.name} ${item.type}`.toLowerCase().includes(normalized));
    grid.innerHTML = filtered.length ? filtered.map((item, index) => `
      <article class="memorial-card" style="--delay:${index * 80}ms">
        <a class="memorial-card__image" href="memorial.html?id=${item.id}"><img src="${item.image}" alt="${item.name}"><span>✦ In loving memory</span></a>
        <div class="memorial-card__content">
          <p>${item.years}</p><h3>${item.name}</h3><small>${item.type}</small><blockquote>“${item.message}”</blockquote>
          <div class="memorial-card__counts"><span>🕯️ ${countFor(item.id, "candle", item.candles)}</span><span>🌸 ${countFor(item.id, "flower", item.flowers)}</span></div>
          <a href="memorial.html?id=${item.id}">Visit Memorial <span>→</span></a>
        </div>
      </article>`).join("") : '<p class="memorial-empty">No memorials match your search.</p>';
  }

  async function setupGarden() {
    const search = document.getElementById("memorialSearch");
    if (!document.getElementById("memorialGrid")) return;
    renderCards();
    await loadCloudMemorials().then(() => renderCards(search?.value || "")).catch(() => {});
    search?.addEventListener("input", () => renderCards(search.value));
    const modal = document.getElementById("createMemorialModal");
    document.getElementById("openCreateMemorial")?.addEventListener("click", () => { modal.hidden = false; });
    modal?.querySelectorAll("[data-close-create]").forEach(el => el.addEventListener("click", () => { modal.hidden = true; }));
  }

  async function setupDetail() {
    if (!document.getElementById("memoryPage")) return;
    const params = new URLSearchParams(location.search);
    const memorialId = params.get("memorialId");
    const petId = params.get("petId");
    let item = memorials.find(entry => entry.id === (params.get("id") || "luna")) || memorials[0];
    const client = getClient();
    if (client && (memorialId || petId)) {
      let query = client.from("pet_memorials").select("*,pets(name,type,breed,bio,image_url)");
      query = memorialId ? query.eq("id", memorialId) : query.eq("pet_id", petId);
      const { data } = await query.maybeSingle();
      if (data) item = normalizeCloudMemorial(data);
    }
    document.title = `Remembering ${item.name} — ThePetGrid`;
    document.getElementById("memoryName").textContent = item.name;
    document.getElementById("memoryDates").textContent = item.years;
    document.getElementById("memoryPortrait").src = item.image;
    document.getElementById("memoryCover").style.backgroundImage = `url("${item.image}")`;
    document.getElementById("memoryStoryTitle").textContent = item.storyTitle;
    document.getElementById("memoryMessagesTitle").textContent = `Messages for ${item.name}`;
    const candleEl = document.getElementById("detailCandleCount");
    const flowerEl = document.getElementById("detailFlowerCount");
    candleEl.textContent = countFor(item.id, "candle", item.candles);
    flowerEl.textContent = countFor(item.id, "flower", item.flowers);

    const toast = document.getElementById("memoryToast");
    const showToast = message => {
      toast.textContent = message; toast.classList.add("is-visible");
      clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
    };

    document.querySelectorAll("[data-memory-action]").forEach(button => button.addEventListener("click", () => {
      const kind = button.dataset.memoryAction;
      const fallback = kind === "candle" ? item.candles : item.flowers;
      const next = countFor(item.id, kind, fallback) + 1;
      savedCounts[`${item.id}:${kind}`] = next;
      localStorage.setItem(countsKey, JSON.stringify(savedCounts));
      (kind === "candle" ? candleEl : flowerEl).textContent = next;
      button.classList.add("is-given");
      showToast(kind === "candle" ? `A candle is now glowing for ${item.name}.` : `Your flower was left for ${item.name}.`);
    }));

    const modal = document.getElementById("memoryMessageModal");
    document.getElementById("writeMemoryButton")?.addEventListener("click", () => { modal.hidden = false; });
    modal?.querySelectorAll("[data-close-memory]").forEach(el => el.addEventListener("click", () => { modal.hidden = true; }));
    const list = document.getElementById("memoryMessageList");
    const storedMessages = JSON.parse(localStorage.getItem(messageKey) || "[]");
    storedMessages.forEach(entry => list.insertAdjacentHTML("afterbegin", messageMarkup(entry)));
    document.getElementById("memoryMessageForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const entry = { author: String(data.get("author")).trim(), message: String(data.get("message")).trim() };
      storedMessages.unshift(entry); localStorage.setItem(messageKey, JSON.stringify(storedMessages));
      list.insertAdjacentHTML("afterbegin", messageMarkup(entry));
      event.currentTarget.reset(); modal.hidden = true; showToast("Your memory has been added with love.");
    });
  }

  function messageMarkup(entry) {
    const escape = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
    return `<article><div>💛</div><p><strong>${escape(entry.author)}</strong><span>${escape(entry.message)}</span><small>Just now</small></p></article>`;
  }

  setupGarden(); setupDetail();
})();
