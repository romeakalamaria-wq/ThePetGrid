document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector("#featuredPets");

  if (!grid || !window.PetStore) return;

  const pets = PetStore.getAll().slice(0, 6);

  grid.innerHTML = pets.map((p) => {
    const isMemorial = p.status === "memorial";

    return `
      <article class="pet-card">
        <a href="pages/pet.html?id=${p.id}" aria-label="View ${p.name}'s profile">
          <img src="${p.image}" alt="${p.name}">
        </a>

        <div class="pet-card-body">
          <h3>${p.name}${p.verified ? " ✓" : ""}</h3>

          <div class="pet-meta">
            ${p.breed} · ${p.city}, ${p.country}
          </div>

          <div class="home-pet-preview-note">
            Featured pet preview
          </div>

          <div class="home-pet-actions">
            <a href="pages/pet.html?id=${p.id}">
              View Profile
            </a>

            ${
              isMemorial
                ? `<a class="home-visit-memorial" href="pages/memorial.html?petId=${p.id}">
                     🕯️ Visit Memorial
                   </a>`
                : ""
            }
          </div>
        </div>
      </article>
    `;
  }).join("");
});
