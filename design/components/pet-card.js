// ==================================================
// THEPETGRID
// REUSABLE PET CARD COMPONENT
// ==================================================

(() => {

    "use strict";


    // ==================================================
    // STATUS CONFIGURATION
    // ==================================================

    const statusConfig = {

        new: {
            className: "pet-card__status--new",
            label: "New"
        },

        featured: {
            className: "pet-card__status--featured",
            label: "★ Featured"
        },

        adoption: {
            className: "pet-card__status--adoption",
            label: "🏠 Looking for Home"
        },

        adopted: {
            className: "pet-card__status--adopted",
            label: "✓ Adopted"
        },

        lost: {
            className: "pet-card__status--lost",
            label: "⚠ Lost"
        }

    };


    // ==================================================
    // SAFE HTML
    // ==================================================

    function escapeHTML(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    // ==================================================
    // LOCAL STORAGE
    // ==================================================

    function getLikeStorageKey(petId) {

        return `thepetgrid_pet_${petId}_liked`;

    }


    function getFavoriteStorageKey(petId) {

        return `thepetgrid_pet_${petId}_favorite`;

    }


    function getSavedState(storageKey) {

        return localStorage.getItem(storageKey) === "true";

    }


    // ==================================================
    // CREATE PET CARD
    // ==================================================

    function createPetCard(pet) {

        const status =
            statusConfig[pet.status] || statusConfig.new;

        const isLiked =
            getSavedState(
                getLikeStorageKey(pet.id)
            );

        const isFavorite =
            getSavedState(
                getFavoriteStorageKey(pet.id)
            );

        const baseLikes =
            Number(pet.likes) || 0;

        const displayedLikes =
            baseLikes + (isLiked ? 1 : 0);

        const verifiedBadge = pet.verified
            ? `
                <span class="pet-card__verified">
                    ✓ Verified
                </span>
            `
            : "";

        return `
            <article
                class="pet-card"
                data-pet-id="${escapeHTML(pet.id)}"
                data-pet-name="${escapeHTML(pet.name)}"
                data-base-likes="${baseLikes}"
            >

                <div class="pet-card__media">

                    <img
                        class="pet-card__image"
                        src="${escapeHTML(pet.image)}"
                        alt="${escapeHTML(pet.name)}"
                        loading="lazy"
                    >

                    <div class="pet-card__overlay"></div>

                    ${verifiedBadge}

                    <div class="pet-card__actions">

                        <button
                            class="pet-card__action"
                            type="button"
                            data-action="like"
                            aria-label="${
                                isLiked
                                    ? `Remove like from ${escapeHTML(pet.name)}`
                                    : `Like ${escapeHTML(pet.name)}`
                            }"
                            aria-pressed="${isLiked}"
                        >
                            <span aria-hidden="true">
                                ${isLiked ? "♥" : "♡"}
                            </span>
                        </button>

                        <button
                            class="pet-card__action"
                            type="button"
                            data-action="favorite"
                            aria-label="${
                                isFavorite
                                    ? `Remove ${escapeHTML(pet.name)} from favorites`
                                    : `Add ${escapeHTML(pet.name)} to favorites`
                            }"
                            aria-pressed="${isFavorite}"
                        >
                            <span aria-hidden="true">
                                ${isFavorite ? "★" : "☆"}
                            </span>
                        </button>

                    </div>

                </div>


                <div class="pet-card__content">

                    <div class="pet-card__heading">

                        <div>

                            <p class="pet-card__type">
                                ${escapeHTML(pet.type)}
                                ·
                                ${escapeHTML(pet.breed)}
                            </p>

                            <h2 class="pet-card__name">
                                ${escapeHTML(pet.name)}
                            </h2>

                        </div>

                        <span
                            class="
                                pet-card__status
                                ${status.className}
                            "
                        >
                            ${status.label}
                        </span>

                    </div>


                    <div class="pet-card__meta">

                        <p class="pet-card__meta-item">
                            📍
                            ${escapeHTML(pet.city)},
                            ${escapeHTML(pet.country)}
                        </p>

                        <p class="pet-card__meta-item">
                            👤 Owner:
                            ${escapeHTML(pet.owner)}
                        </p>

                        <p class="pet-card__meta-item">
                            🎂 Age:
                            ${escapeHTML(pet.age)}
                        </p>

                    </div>


                    <div class="pet-card__stats">

                        <div class="pet-card__stat">

                            <strong
                                class="pet-card__stat-value"
                                data-stat="likes"
                            >
                                ${displayedLikes}
                            </strong>

                            <span class="pet-card__stat-label">
                                Likes
                            </span>

                        </div>


                        <div class="pet-card__stat">

                            <strong class="pet-card__stat-value">
                                ${escapeHTML(pet.followers)}
                            </strong>

                            <span class="pet-card__stat-label">
                                Followers
                            </span>

                        </div>


                        <div class="pet-card__stat">

                            <strong class="pet-card__stat-value">
                                ${escapeHTML(pet.gifts)}
                            </strong>

                            <span class="pet-card__stat-label">
                                Gifts
                            </span>

                        </div>

                    </div>


                    <a
                        class="pet-card__cta"
                        href="../../pet.html?id=${encodeURIComponent(pet.id)}"
                    >
                        View Profile

                        <span aria-hidden="true">
                            →
                        </span>
                    </a>

                </div>

            </article>
        `;

    }


    // ==================================================
    // UPDATE ACTION BUTTON
    // ==================================================

    function updateActionButton(
        button,
        action,
        petName,
        isActive
    ) {

        const icon =
            button.querySelector("span");

        button.setAttribute(
            "aria-pressed",
            String(isActive)
        );

        if (!icon) {
            return;
        }

        if (action === "like") {

            icon.textContent =
                isActive ? "♥" : "♡";

            button.setAttribute(
                "aria-label",
                isActive
                    ? `Remove like from ${petName}`
                    : `Like ${petName}`
            );

        }

        if (action === "favorite") {

            icon.textContent =
                isActive ? "★" : "☆";

            button.setAttribute(
                "aria-label",
                isActive
                    ? `Remove ${petName} from favorites`
                    : `Add ${petName} to favorites`
            );

        }

    }


    // ==================================================
    // UPDATE LIKES NUMBER
    // ==================================================

    function updateLikesNumber(
        card,
        isLiked
    ) {

        const likesElement =
            card.querySelector('[data-stat="likes"]');

        if (!likesElement) {
            return;
        }

        const baseLikes =
            Number(card.dataset.baseLikes) || 0;

        likesElement.textContent =
            String(baseLikes + (isLiked ? 1 : 0));

    }


    // ==================================================
    // PLAY ANIMATION
    // ==================================================

    function playActionAnimation(button) {

        button.classList.remove(
            "pet-card__action--animate"
        );

        void button.offsetWidth;

        button.classList.add(
            "pet-card__action--animate"
        );

        button.addEventListener(
            "animationend",
            () => {

                button.classList.remove(
                    "pet-card__action--animate"
                );

            },
            {
                once: true
            }
        );

    }


    // ==================================================
    // INITIALIZE CARD ACTIONS
    // ==================================================

    function initializePetCardActions(container) {

        if (!container) {

            console.error(
                "Pet Card container was not found."
            );

            return;

        }

        if (container.dataset.petCardActions === "ready") {
            return;
        }

        container.dataset.petCardActions = "ready";

        container.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        ".pet-card__action[data-action]"
                    );

                if (!button || !container.contains(button)) {
                    return;
                }

                const card =
                    button.closest(".pet-card");

                if (!card) {
                    return;
                }

                const petId =
                    card.dataset.petId;

                const petName =
                    card.dataset.petName || "pet";

                const action =
                    button.dataset.action;

                const isCurrentlyActive =
                    button.getAttribute("aria-pressed") === "true";

                let newState;

if (
    !window.PetStore
) {

    console.error(
        "PetStore was not loaded."
    );

    return;

}

if (action === "like") {

    newState =
        window.PetStore.toggleLike(
            petId
        );

}

if (action === "favorite") {

    newState =
        window.PetStore.toggleFavorite(
            petId
        );

}

if (typeof newState !== "boolean") {
    return;
}

updateActionButton(
    button,
    action,
    petName,
    newState
);

if (action === "like") {

    updateLikesNumber(
        card,
        newState
    );

}

playActionAnimation(button);

            }
        );

    }


    // ==================================================
    // PUBLIC COMPONENT API
    // ==================================================

    window.PetCard = {

        create: createPetCard,

        initializeActions:
            initializePetCardActions

    };

    window.createPetCard =
        createPetCard;

})();