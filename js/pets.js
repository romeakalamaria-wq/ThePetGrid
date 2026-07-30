document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("petsGrid");
  const search = document.getElementById("petSearch");
  const sort = document.getElementById("petSort");
  const filters = document.getElementById("petFilters");
  const count = document.getElementById("resultCount");
  const clearButton = document.getElementById("clearFilters");
  const pagination = document.getElementById("pagination");

  if (!grid || !window.PetStore) return;

  const state = { filter: "all", page: 1, pageSize: 9, pets: [], source: "demo" };
  const otherTypes = new Set(["Hamster", "Fish", "Reptile", "Other"]);
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));

  function formatAge(value) {
    if (value === null || value === undefined || value === "") return "Age not added";
    if (typeof value === "string" && /[a-z]/i.test(value)) return value;
    const number = Number(value);
    if (Number.isNaN(number)) return String(value);
    return `${number} ${number === 1 ? "year" : "years"}`;
  }

  function normalizeCloudPet(row) {
    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name || "Unnamed Pet",
      type: row.type || "Other",
      breed: row.breed || "Breed not added",
      age: formatAge(row.age),
      gender: row.gender || "",
      country: row.country || "",
      city: row.city || "",
      owner: row.profiles?.username || "ThePetGrid Member",
      bio: row.bio || "",
      image: row.image_url || "",
      verified: Boolean(row.verified),
      status: row.is_memorial ? "memorial" : "new",
      likes: Number(row.pet_likes?.[0]?.count || 0),
      followers: 0,
      gifts: 0,
      createdAt: row.created_at || ""
    };
  }

  async function loadPets() {
    grid.innerHTML = `<div class="empty-state"><span>🐾</span><h2>Loading pets…</h2><p>Fetching the latest pets from ThePetGrid.</p></div>`;

    const client = window.ThePetGridSupabase?.client;
    if (!client) {
      state.pets = PetStore.getAll();
      state.source = "demo";
      return;
    }

    try {
      const { data, error } = await client
        .from("pets")
        .select("*, profiles:owner_id(username), pet_likes(count)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (Array.isArray(data) && data.length > 0) {
        state.pets = data.map(normalizeCloudPet);
        state.source = "supabase";
      } else {
        state.pets = PetStore.getAll();
        state.source = "demo";
      }
    } catch (error) {
      console.error("ThePetGrid: could not load pets from Supabase.", error);
      state.pets = PetStore.getAll();
      state.source = "demo";
    }
  }

  function getFilteredPets() {
    const term = search.value.trim().toLowerCase();
    let pets = [...state.pets].filter(pet => {
      const searchable = [pet.name, pet.type, pet.breed, pet.country, pet.city, pet.owner, pet.status].join(" ").toLowerCase();
      if (term && !searchable.includes(term)) return false;
      if (state.filter === "favorites") return isPetFavorite(pet);
      if (state.filter === "other") return otherTypes.has(pet.type);
      if (state.filter !== "all") return pet.type === state.filter;
      return true;
    });

    switch (sort.value) {
      case "liked": pets.sort((a,b) => displayedLikes(b) - displayedLikes(a)); break;
      case "followed": pets.sort((a,b) => (b.followers || 0) - (a.followers || 0)); break;
      case "az": pets.sort((a,b) => String(a.name).localeCompare(String(b.name))); break;
      default:
        pets.sort((a,b) => {
          const aDate = a.createdAt ? Date.parse(a.createdAt) : Number(a.id) || 0;
          const bDate = b.createdAt ? Date.parse(b.createdAt) : Number(b.id) || 0;
          return bDate - aDate;
        });
    }
    return pets;
  }

  function isCloudPet(pet) {
    return Boolean(pet?.ownerId) && window.ThePetGridLikes?.isCloudPetId?.(pet.id);
  }

  function isPetLiked(pet) {
    return isCloudPet(pet)
      ? window.ThePetGridLikes?.isLiked?.(pet.id) || false
      : PetStore.isLiked(pet.id);
  }

  function displayedLikes(pet) {
    return isCloudPet(pet)
      ? window.ThePetGridLikes?.getCount?.(pet.id, pet.likes) ?? Number(pet.likes || 0)
      : Number(pet.likes || 0) + (PetStore.isLiked(pet.id) ? 1 : 0);
  }

  function isPetFavorite(pet) {
    return isCloudPet(pet)
      ? window.ThePetGridFavorites?.isFavorite?.(pet.id) || false
      : PetStore.isFavorite(pet.id);
  }

  function statusLabel(status) {
    const labels = { featured:"Featured", adoption:"Looking for home", adopted:"Adopted", lost:"Lost", new:"New", memorial:"Memorial" };
    return labels[status] || "Pet profile";
  }

  function card(pet) {
    const liked = isPetLiked(pet);
    const favorite = isPetFavorite(pet);
    const location = [pet.city, pet.country].filter(Boolean).join(", ") || "Location not added";
    const image = pet.image || "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80";
    return `<article class="pet-card">
      <a class="pet-card__media" href="pet.html?id=${encodeURIComponent(pet.id)}" aria-label="View ${escapeHtml(pet.name)} profile">
        <img class="pet-card__image" src="${escapeHtml(image)}" alt="${escapeHtml(pet.name)}" loading="lazy">
        <span class="pet-card__badges">${pet.verified ? '<span class="pet-badge pet-badge--verified">✓ Verified</span>' : '<span></span>'}<span class="pet-badge pet-badge--status">${escapeHtml(statusLabel(pet.status))}</span></span>
      </a>
      <div class="pet-card__quick-actions">
        <button class="card-icon-button ${liked ? "is-active" : ""}" type="button" data-like="${escapeHtml(pet.id)}" aria-label="${liked ? "Remove like" : "Like"} ${escapeHtml(pet.name)}">${liked ? "❤️" : "🤍"}</button>
        <button class="card-icon-button ${favorite ? "is-active" : ""}" type="button" data-favorite="${escapeHtml(pet.id)}" aria-label="${favorite ? "Remove from favorites" : "Add to favorites"}">${favorite ? "⭐" : "☆"}</button>
      </div>
      <div class="pet-card__content">
        <p class="pet-card__eyebrow">${escapeHtml(pet.type || "Pet")}</p>
        <div class="pet-card__name-row"><h2 class="pet-card__name"><a href="pet.html?id=${encodeURIComponent(pet.id)}">${escapeHtml(pet.name)}</a></h2><span class="pet-card__likes">❤️ ${displayedLikes(pet)}</span></div>
        <p class="pet-card__breed">${escapeHtml(pet.breed || "Breed not added")} · ${escapeHtml(pet.age || "Age not added")}</p>
        <div class="pet-card__meta"><span>📍 ${escapeHtml(location)}</span><span>👤 ${escapeHtml(pet.owner || "Unknown owner")}</span></div>
        <div class="pet-card__stats"><span>👥 ${Number(pet.followers || 0).toLocaleString()}</span><span>🎁 ${Number(pet.gifts || 0).toLocaleString()}</span><span>🐾 ${escapeHtml(pet.type || "Pet")}</span></div>
        <a class="pet-card__view" href="pet.html?id=${encodeURIComponent(pet.id)}">View Profile</a>
      </div>
    </article>`;
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) { pagination.innerHTML = ""; return; }
    let html = `<button class="page-button" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""}>‹</button>`;
    for (let page = 1; page <= totalPages; page += 1) html += `<button class="page-button ${page === state.page ? "is-active" : ""}" data-page="${page}">${page}</button>`;
    html += `<button class="page-button" data-page="${state.page + 1}" ${state.page === totalPages ? "disabled" : ""}>›</button>`;
    pagination.innerHTML = html;
  }

  function render() {
    const pets = getFilteredPets();
    const totalPages = Math.max(1, Math.ceil(pets.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.pageSize;
    const visible = pets.slice(start, start + state.pageSize);
    count.textContent = pets.length;
    grid.innerHTML = visible.length ? visible.map(card).join("") : `<div class="empty-state"><span>🐾</span><h2>No pets found</h2><p>Try another search or clear the active filters.</p></div>`;
    renderPagination(totalPages);
  }

  grid.addEventListener("click", async event => {
    const likeButton = event.target.closest("[data-like]");
    const favoriteButton = event.target.closest("[data-favorite]");

    if (likeButton) {
      event.preventDefault();
      const pet = state.pets.find(item => String(item.id) === String(likeButton.dataset.like));
      if (!pet) return;

      if (isCloudPet(pet)) {
        if (window.ThePetGridLikes?.isBusy?.(pet.id)) return;
        likeButton.disabled = true;
        try {
          await window.ThePetGridLikes.toggle(pet.id);
        } catch (_) {
          // The shared service already restores state and shows the error.
        } finally {
          likeButton.disabled = false;
          render();
        }
      } else {
        PetStore.toggleLike(pet.id);
        render();
      }
    }

    if (favoriteButton) {
      event.preventDefault();
      const pet = state.pets.find(item => String(item.id) === String(favoriteButton.dataset.favorite));
      if (!pet) return;

      if (isCloudPet(pet) && window.ThePetGridFavorites) {
        if (window.ThePetGridFavorites.isBusy(pet.id)) return;
        favoriteButton.disabled = true;
        try {
          await window.ThePetGridFavorites.toggle(pet.id);
        } catch (_) {
          // The shared service already restores state and displays the error.
        } finally {
          favoriteButton.disabled = false;
          render();
        }
      } else {
        PetStore.toggleFavorite(pet.id);
        render();
      }
    }
  });

  filters.addEventListener("click", event => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.filter = button.dataset.filter;
    state.page = 1;
    filters.querySelectorAll(".filter-chip").forEach(chip => chip.classList.toggle("is-active", chip === button));
    render();
  });

  pagination.addEventListener("click", event => {
    const button = event.target.closest("[data-page]");
    if (!button || button.disabled) return;
    state.page = Number(button.dataset.page);
    render();
    document.querySelector(".browse-shell").scrollIntoView({behavior:"smooth", block:"start"});
  });

  search.addEventListener("input", () => { state.page = 1; render(); });
  sort.addEventListener("change", () => { state.page = 1; render(); });
  clearButton.addEventListener("click", () => {
    search.value = ""; sort.value = "newest"; state.filter = "all"; state.page = 1;
    filters.querySelectorAll(".filter-chip").forEach(chip => chip.classList.toggle("is-active", chip.dataset.filter === "all"));
    render();
  });
  window.addEventListener("petstore:change", render);

  await loadPets();

  if (window.ThePetGridLikes) {
    await window.ThePetGridLikes.initialize(state.pets);
  }
  if (window.ThePetGridFavorites) {
    await window.ThePetGridFavorites.initialize(state.pets);
  }

  window.addEventListener("thepetgrid:likes-changed", render);
  window.addEventListener("thepetgrid:favorites-changed", render);
  render();
});
