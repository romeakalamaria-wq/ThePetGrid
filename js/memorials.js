(() => {
  "use strict";

  let memorials = [];
  let tributeRows = [];

  function getClient() {
    return window.ThePetGridSupabase?.client || null;
  }

  function escapeText(value) {
    return String(value || "").replace(
      /[&<>"']/g,
      character =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[character]
    );
  }

  function formatMemorialDate(value) {
    if (!value) return "";
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function memorialDates(item) {
    const years = String(item.years || "")
      .split("—")
      .map(value => value.trim());

    return {
      birth: item.birthDate || years[0] || "—",
      death: item.deathDate || years[1] || "—"
    };
  }

  function tributeCount(memorialId, type) {
    return tributeRows.filter(
      row =>
        String(row.memorial_id) === String(memorialId) &&
        row.tribute_type === type
    ).length;
  }

  function normalizeCloudMemorial(row) {
    const pet = row.pets || {};
    const birthYear = row.birth_date
      ? new Date(row.birth_date).getFullYear()
      : "";
    const passedYear = row.passed_date
      ? new Date(row.passed_date).getFullYear()
      : "";

    return {
      id: row.id,
      petId: row.pet_id,
      ownerId: row.owner_id,
      name: pet.name || "Beloved Pet",
      type:
        [pet.type, pet.breed].filter(Boolean).join(" · ") ||
        "Companion",
      years:
        [birthYear, passedYear].filter(Boolean).join(" — ") ||
        "Forever remembered",
      birthDate:
        formatMemorialDate(row.birth_date) ||
        birthYear ||
        "—",
      deathDate:
        formatMemorialDate(row.passed_date) ||
        passedYear ||
        "—",
      image: pet.image_url || "../assets/avatar.png",
      message:
        row.farewell_message ||
        "Forever in our hearts.",
      story:
        row.story ||
        pet.bio ||
        "A beautiful life, remembered with love.",
      storyTitle: "A life filled with love",
      caption: `Forever loved, ${pet.name || "beautiful soul"}`,
      signature:
        "Your family will carry you with them, always. 🤍",
      gallery: [
        pet.image_url || "../assets/avatar.png",
        pet.image_url || "../assets/avatar.png",
        pet.image_url || "../assets/avatar.png"
      ],
      candles: tributeCount(row.id, "candle"),
      flowers: tributeCount(row.id, "flower"),
      isCloud: true,
      visibility: row.visibility
    };
  }

  async function loadSharedData() {
    const client = getClient();
    if (!client) {
      memorials = [];
      tributeRows = [];
      return;
    }

    const [memorialResult, tributeResult] = await Promise.all([
      client
        .from("pet_memorials")
        .select("*,pets(name,type,breed,bio,image_url)")
        .eq("visibility", "public")
        .order("created_at", { ascending: false }),

      client
        .from("memorial_tributes")
        .select(
          "id,memorial_id,user_id,tribute_type,author_name,message,created_at"
        )
        .order("created_at", { ascending: false })
    ]);

    if (memorialResult.error) {
      throw memorialResult.error;
    }

    if (tributeResult.error) {
      throw tributeResult.error;
    }

    tributeRows = Array.isArray(tributeResult.data)
      ? tributeResult.data
      : [];

    memorials = Array.isArray(memorialResult.data)
      ? memorialResult.data.map(normalizeCloudMemorial)
      : [];
  }

  async function getSignedInUser() {
    const client = getClient();
    if (!client) return null;

    try {
      const {
        data: { user },
        error
      } = await client.auth.getUser();

      if (error) return null;
      return user || null;
    } catch (_) {
      return null;
    }
  }

  async function ensureSignedIn(showToast) {
    const user = await getSignedInUser();

    if (!user) {
      if (typeof showToast === "function") {
        showToast("Please log in to leave a tribute.");
      }
      return null;
    }

    return user;
  }

  function updateGardenCounters() {
    const memorialCount = document.getElementById("memorialCount");
    const candleCount = document.getElementById("candleCount");
    const flowerCount = document.getElementById("flowerCount");

    if (memorialCount) memorialCount.textContent = String(memorials.length);
    if (candleCount) candleCount.textContent = String(
      tributeRows.filter(row => row.tribute_type === "candle").length
    );
    if (flowerCount) flowerCount.textContent = String(
      tributeRows.filter(row => row.tribute_type === "flower").length
    );
  }

  function renderCards(query = "") {
    const grid = document.getElementById("memorialGrid");
    if (!grid) return;

    const normalized = query.trim().toLowerCase();
    const filtered = memorials.filter(item =>
      `${item.name} ${item.type}`.toLowerCase().includes(normalized)
    );

    grid.innerHTML = filtered.length
      ? filtered.map((item, index) => `
        <article class="memorial-card" style="--delay:${index * 80}ms">
          <a class="memorial-card__image" href="memorial.html?memorialId=${encodeURIComponent(item.id)}">
            <img src="${escapeText(item.image)}" alt="${escapeText(item.name)}">
            <span>✦ In loving memory</span>
          </a>
          <div class="memorial-card__content">
            <p>${escapeText(item.years)}</p>
            <h3>${escapeText(item.name)}</h3>
            <small>${escapeText(item.type)}</small>
            <blockquote>“${escapeText(item.message)}”</blockquote>
            <div class="memorial-card__counts">
              <span>🕯️ ${tributeCount(item.id, "candle")}</span>
              <span>🌸 ${tributeCount(item.id, "flower")}</span>
            </div>
            <a href="memorial.html?memorialId=${encodeURIComponent(item.id)}">
              Visit Memorial <span>→</span>
            </a>
          </div>
        </article>
      `).join("")
      : '<p class="memorial-empty">No memorials match your search.</p>';
  }

  async function setupGarden() {
    const grid = document.getElementById("memorialGrid");
    if (!grid) return;

    const search = document.getElementById("memorialSearch");

    try {
      await loadSharedData();
      renderCards(search?.value || "");
      updateGardenCounters();
    } catch (error) {
      console.error("ThePetGrid: could not load Memorial Garden.", error);
      grid.innerHTML =
        '<p class="memorial-empty">The Memorial Garden could not be loaded right now.</p>';
    }

    search?.addEventListener("input", () => renderCards(search.value));

    const modal = document.getElementById("createMemorialModal");
    document.getElementById("openCreateMemorial")?.addEventListener("click", () => {
      if (modal) modal.hidden = false;
    });
    modal?.querySelectorAll("[data-close-create]").forEach(element =>
      element.addEventListener("click", () => {
        modal.hidden = true;
      })
    );
  }

  function formatRelativeTime(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return "Recently";

    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  function messageMarkup(entry) {
    const author = entry.author_name?.trim() || "ThePetGrid community";

    return `
      <article data-shared-memory="${escapeText(entry.id)}">
        <div>💛</div>
        <p>
          <strong>${escapeText(author)}</strong>
          <span>${escapeText(entry.message)}</span>
          <small>${formatRelativeTime(entry.created_at)}</small>
        </p>
      </article>
    `;
  }

  async function insertSimpleTribute(memorialId, type, showToast) {
    const client = getClient();
    if (!client) {
      showToast("Tributes are unavailable right now.");
      return false;
    }

    const user = await ensureSignedIn(showToast);
    if (!user) return false;

    const { error } = await client
      .from("memorial_tributes")
      .insert({
        memorial_id: memorialId,
        user_id: user.id,
        tribute_type: type
      });

    if (error) {
      if (error.code === "23505") {
        showToast(
          type === "candle"
            ? "Your candle is already glowing here."
            : "Your flower is already resting here."
        );
        return false;
      }

      console.error(`ThePetGrid: could not add ${type}.`, error);
      showToast("We could not save your tribute.");
      return false;
    }

    return true;
  }

  function refreshLocalTributes(memorialId, candleEl, flowerEl, list) {
    const memorialTributes = tributeRows.filter(
      row => String(row.memorial_id) === String(memorialId)
    );

    candleEl.textContent = String(
      memorialTributes.filter(row => row.tribute_type === "candle").length
    );

    flowerEl.textContent = String(
      memorialTributes.filter(row => row.tribute_type === "flower").length
    );

    const memories = memorialTributes.filter(
      row => row.tribute_type === "memory"
    );

    list.innerHTML = memories.length
      ? memories.map(messageMarkup).join("")
      : '<p class="memorial-empty">No memories have been shared yet. Be the first to leave one.</p>';
  }

  async function loadDetailItem(memorialId, petId) {
    const client = getClient();
    if (!client) return null;

    let query = client
      .from("pet_memorials")
      .select("*,pets(name,type,breed,bio,image_url)");

    query = memorialId
      ? query.eq("id", memorialId)
      : query.eq("pet_id", petId);

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return normalizeCloudMemorial(data);
  }

  function renderDetail(item) {
    document.title = `Remembering ${item.name} — ThePetGrid`;
    document.getElementById("memoryName").textContent = item.name;
    document.getElementById("memoryDates").textContent = item.years;

    const portrait = document.getElementById("memoryPortrait");
    portrait.src = item.image;
    portrait.alt = `${item.name} memorial portrait`;

    document.getElementById("memoryPortraitName").textContent = item.name;

    const portraitDates = memorialDates(item);
    document.getElementById("memoryBirthDate").textContent = portraitDates.birth;
    document.getElementById("memoryDeathDate").textContent = portraitDates.death;

    document.getElementById("memoryCover").style.backgroundImage = `url("${item.image}")`;
    document.getElementById("memoryStoryTitle").textContent = item.storyTitle;
    document.getElementById("memoryMessagesTitle").textContent = `Messages for ${item.name}`;
    document.getElementById("memoryCoverNote").textContent =
      `${item.name} was part of every ordinary day — and made each one extraordinary.`;

    const storyParts = Array.isArray(item.story)
      ? item.story
      : [item.story || item.message];

    document.getElementById("memoryStoryText").innerHTML = storyParts
      .filter(Boolean)
      .map(text => `<p>${escapeText(text)}</p>`)
      .join("");

    document.getElementById("memorySignatureText").textContent =
      item.signature || `You will remain in our hearts, ${item.name}. 🤍`;

    document.getElementById("memoryPortraitCaption").textContent =
      item.caption || `Forever loved, ${item.name}`;

    const gallery = item.gallery?.length
      ? item.gallery
      : [item.image, item.image, item.image];

    [1, 2, 3].forEach((number, index) => {
      const image = document.getElementById(`memoryGalleryImage${number}`);
      image.src = gallery[index] || item.image;
      image.alt = `${item.name} — treasured memory ${number}`;
    });
  }

  async function refreshTributeRowsForMemorial(memorialId) {
    const client = getClient();
    if (!client) return [];

    const { data, error } = await client
      .from("memorial_tributes")
      .select("id,memorial_id,user_id,tribute_type,author_name,message,created_at")
      .eq("memorial_id", memorialId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    tributeRows = tributeRows
      .filter(row => String(row.memorial_id) !== String(memorialId))
      .concat(data || []);

    return data || [];
  }

  function subscribeToTributes(memorialId, candleEl, flowerEl, list) {
    const client = getClient();
    if (!client?.channel) return;

    const channel = client
      .channel(`memorial-tributes-${memorialId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "memorial_tributes",
          filter: `memorial_id=eq.${memorialId}`
        },
        async () => {
          try {
            await refreshTributeRowsForMemorial(memorialId);
            refreshLocalTributes(memorialId, candleEl, flowerEl, list);
          } catch (_) {}
        }
      )
      .subscribe();

    window.addEventListener(
      "beforeunload",
      () => {
        try {
          client.removeChannel(channel);
        } catch (_) {}
      },
      { once: true }
    );
  }

  async function setupDetail() {
    if (!document.getElementById("memoryPage")) return;

    const params = new URLSearchParams(location.search);
    const memorialId = params.get("memorialId");
    const petId = params.get("petId");
    const client = getClient();

    const toast = document.getElementById("memoryToast");
    const showToast = message => {
      toast.textContent = message;
      toast.classList.add("is-visible");
      clearTimeout(showToast.timer);
      showToast.timer = setTimeout(
        () => toast.classList.remove("is-visible"),
        2800
      );
    };

    if (!client || (!memorialId && !petId)) {
      showToast("This memorial could not be found.");
      return;
    }

    let item;

    try {
      await loadSharedData();
      item = await loadDetailItem(memorialId, petId);
    } catch (error) {
      console.error("ThePetGrid: could not load memorial detail.", error);
      showToast("This memorial could not be loaded.");
      return;
    }

    if (!item) {
      showToast("This memorial could not be found.");
      return;
    }

    renderDetail(item);

    const candleEl = document.getElementById("detailCandleCount");
    const flowerEl = document.getElementById("detailFlowerCount");
    const list = document.getElementById("memoryMessageList");

    refreshLocalTributes(item.id, candleEl, flowerEl, list);

    document.querySelectorAll("[data-memory-action]").forEach(button =>
      button.addEventListener("click", async () => {
        const kind = button.dataset.memoryAction;
        if (!["candle", "flower"].includes(kind)) return;
        if (button.disabled) return;

        button.disabled = true;

        try {
          const saved = await insertSimpleTribute(item.id, kind, showToast);
          if (!saved) return;

          await refreshTributeRowsForMemorial(item.id);
          refreshLocalTributes(item.id, candleEl, flowerEl, list);

          button.classList.add("is-given");
          showToast(
            kind === "candle"
              ? `A candle is now glowing for ${item.name}.`
              : `Your flower was left for ${item.name}.`
          );
        } catch (error) {
          console.error("ThePetGrid: could not refresh tribute.", error);
          showToast("Your tribute was saved, but the count could not refresh yet.");
        } finally {
          button.disabled = false;
        }
      })
    );

    const modal = document.getElementById("memoryMessageModal");

    document.getElementById("writeMemoryButton")?.addEventListener("click", async () => {
      const user = await ensureSignedIn(showToast);
      if (!user) return;
      if (modal) modal.hidden = false;
    });

    modal?.querySelectorAll("[data-close-memory]").forEach(element =>
      element.addEventListener("click", () => {
        modal.hidden = true;
      })
    );

    document.getElementById("memoryMessageForm")?.addEventListener("submit", async event => {
      event.preventDefault();

      const form = event.currentTarget;

      const user = await ensureSignedIn(showToast);
      if (!user) return;

      const formData = new FormData(form);

      const author = String(formData.get("author") || "").trim();
      const message = String(formData.get("message") || "").trim();

      if (!message) return;

      const submitButton = form.querySelector('[type="submit"]');
      if (submitButton) submitButton.disabled = true;

      try {
        const { data, error } = await client
          .from("memorial_tributes")
          .insert({
            memorial_id: item.id,
            user_id: user.id,
            tribute_type: "memory",
            author_name:
              author ||
              user.user_metadata?.username ||
              user.email?.split("@")[0] ||
              "ThePetGrid community",
            message
          })
          .select("id,memorial_id,user_id,tribute_type,author_name,message,created_at")
          .single();

        if (error) throw error;

        tributeRows.unshift(data);
        refreshLocalTributes(item.id, candleEl, flowerEl, list);

        form.reset();
        modal.hidden = true;
        showToast("Your memory has been added with love.");
      } catch (error) {
        console.error("ThePetGrid: could not save memory.", error);
        showToast("We could not save your memory.");
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });

    subscribeToTributes(item.id, candleEl, flowerEl, list);
  }

  setupGarden();
  setupDetail();
})();
