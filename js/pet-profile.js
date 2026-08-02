// ==================================================
// THEPETGRID
// PET PROFILE PAGE
// ==================================================

document.addEventListener("DOMContentLoaded", () => {

    // ==================================================
    // ELEMENTS
    // ==================================================

    const loadingElement =
        document.getElementById("petProfileLoading");

    const errorElement =
        document.getElementById("petProfileError");

    const profileElement =
        document.getElementById("petProfile");

    const imageElement =
        document.getElementById("petProfileImage");

    const verifiedElement =
        document.getElementById("petProfileVerified");

    const statusElement =
        document.getElementById("petProfileStatus");

    const typeElement =
        document.getElementById("petProfileType");

    const nameElement =
        document.getElementById("petProfileName");

    const locationElement =
        document.getElementById("petProfileLocation");

    const likesElement =
        document.getElementById("petProfileLikes");

    const followersElement =
        document.getElementById("petProfileFollowers");

    const giftsElement =
        document.getElementById("petProfileGifts");

    const ageElement =
        document.getElementById("petProfileAge");

    const breedElement =
        document.getElementById("petProfileBreed");

    const ownerElement =
        document.getElementById("petProfileOwner");

    const countryElement =
        document.getElementById("petProfileCountry");

    const bioNameElement =
        document.getElementById("petProfileBioName");

    const bioElement =
        document.getElementById("petProfileBio");

    const likeButton =
        document.getElementById("likePetButton");

    const likeButtonText =
        document.getElementById("likePetButtonText");

    const favoriteButton =
        document.getElementById("favoritePetButton");

    const followButton =
        document.getElementById("followPetButton");

    const reportLostButton =
        document.getElementById("reportLostPetButton");


    // ==================================================
    // HELPERS
    // ==================================================

    function showLoading() {

        loadingElement.hidden = false;
        errorElement.hidden = true;
        profileElement.hidden = true;

    }


    function showError() {

        loadingElement.hidden = true;
        errorElement.hidden = false;
        profileElement.hidden = true;

    }


    function showProfile() {

        loadingElement.hidden = true;
        errorElement.hidden = true;
        profileElement.hidden = false;

    }


    function getPetIdFromUrl() {

        const params =
            new URLSearchParams(
                window.location.search
            );

        const rawId =
            params.get("id");

        if (!rawId) {

            return null;

        }

        const numericId =
            Number(rawId);

        return Number.isNaN(numericId)
            ? rawId
            : numericId;

    }


    function getDemoPetById(petId) {

        if (!window.PetStore) {
            return null;
        }

        if (typeof window.PetStore.getById === "function") {
            return window.PetStore.getById(petId);
        }

        const pets = typeof window.PetStore.getAll === "function"
            ? window.PetStore.getAll()
            : [];

        return pets.find(pet => String(pet.id) === String(petId)) || null;
    }


    function formatCloudAge(value) {

        if (value === null || value === undefined || value === "") {
            return "Not specified";
        }

        const age = Number(value);

        if (Number.isNaN(age)) {
            return String(value);
        }

        return `${age} ${age === 1 ? "year" : "years"}`;
    }


    function normalizeCloudPet(row) {

        return {
            id: row.id,
            ownerId: row.owner_id,
            name: row.name || "Unnamed Pet",
            type: row.type || "Pet",
            breed: row.breed || "Unknown breed",
            age: formatCloudAge(row.age),
            gender: row.gender || "",
            country: row.country || "Unknown country",
            city: row.city || "",
            owner: row.profiles?.username || "ThePetGrid Member",
            bio: row.bio || "No story has been added yet.",
            image: row.image_url || "",
            verified: Boolean(row.verified),
            status: row.is_memorial ? "memorial" : "new",
            likes: Number(row.pet_likes?.[0]?.count || 0),
            followers: 0,
            gifts: 0,
            createdAt: row.created_at || "",
            isCloudPet: true
        };
    }


    async function getPetById(petId) {

        const client = window.ThePetGridSupabase?.client;

        if (client) {
            try {
                const { data, error } = await client
                    .from("pets")
                    .select("*, profiles:owner_id(username), pet_likes(count)")
                    .eq("id", String(petId))
                    .maybeSingle();

                if (error) {
                    throw error;
                }

                if (data) {
                    return normalizeCloudPet(data);
                }
            } catch (error) {
                console.error("ThePetGrid: pet profile could not load from Supabase.", error);
            }
        }

        return getDemoPetById(petId);
    }


    function formatStatus(status) {

        const statusMap = {

            new:
                "New",

            featured:
                "Featured",

            adoption:
                "Looking for Home",

            adopted:
                "Adopted",

            lost:
                "Lost",

            memorial:
                "In Memory"

        };

        return statusMap[status] ||
            status ||
            "New";

    }


    function getFollowStorageKey(petId) {

        return `follow_${petId}`;

    }


    function isFollowingPet(petId) {

        return (
            localStorage.getItem(
                getFollowStorageKey(petId)
            ) === "true"
        );

    }


    function setFollowingPet(
        petId,
        isFollowing
    ) {

        localStorage.setItem(
            getFollowStorageKey(petId),
            String(isFollowing)
        );

    }


    // ==================================================
    // STATE
    // ==================================================

    let currentPet = null;


    // ==================================================
    // RENDER
    // ==================================================

    function renderPetProfile(pet) {

        const breed =
            pet.breed ||
            "Unknown breed";

        const type =
            pet.type ||
            "Pet";

        const city =
            pet.city ||
            "";

        const country =
            pet.country ||
            "Unknown country";

        const location =
            city
                ? `${city}, ${country}`
                : country;

        const likes =
            pet.isCloudPet && window.ThePetGridLikes
                ? window.ThePetGridLikes.getCount(
                    pet.id,
                    pet.likes
                )
                : (
                    typeof window.PetStore
                        .getDisplayedLikes ===
                    "function"
                        ? window.PetStore
                            .getDisplayedLikes(
                                pet.id
                            )
                        : Number(
                            pet.likes || 0
                        )
                );

        const followers =
            pet.isCloudPet && window.ThePetGridPetFollows
                ? window.ThePetGridPetFollows.getCount(pet.id, pet.followers)
                : Number(pet.followers || 0);

        const gifts =
            Number(
                pet.gifts || 0
            );

        imageElement.src =
            pet.image || "";

        imageElement.alt =
            `${pet.name || "Pet"} profile photo`;

        if (reportLostButton) {
            reportLostButton.href = `lost-found.html?mode=lost&petId=${encodeURIComponent(pet.id)}`;
        }

        verifiedElement.hidden =
            !pet.verified;

        statusElement.textContent =
            formatStatus(
                pet.status
            );
        statusElement.classList.toggle("is-memorial", pet.status === "memorial");
        if (reportLostButton) {
            reportLostButton.hidden = pet.status === "memorial";
        }

        typeElement.textContent =
            `${type} · ${breed}`;

        nameElement.textContent =
            pet.name ||
            "Unnamed Pet";

        locationElement.textContent =
            `📍 ${location}`;

        likesElement.textContent =
            likes;

        followersElement.textContent =
            followers;

        giftsElement.textContent =
            gifts;

        ageElement.textContent =
            pet.age ||
            "Not specified";

        breedElement.textContent =
            breed;

        ownerElement.textContent =
            pet.owner ||
            "Unknown owner";

        countryElement.textContent =
            country;

        bioNameElement.textContent =
            pet.name ||
            "this pet";

        bioElement.textContent =
            pet.bio ||
            "No story has been added yet.";

        updateLikeButton();

        updateFavoriteButton();

        updateFollowButton();

        document.title =
            `${pet.name || "Pet"} — ThePetGrid`;

    }


    // ==================================================
    // LIKE
    // ==================================================

    function updateLikeButton() {

        if (!currentPet) {

            return;

        }

        const isLiked =
            currentPet.isCloudPet && window.ThePetGridLikes
                ? window.ThePetGridLikes.isLiked(
                    currentPet.id
                )
                : (
                    typeof window.PetStore
                        .isLiked ===
                    "function"
                        ? window.PetStore
                            .isLiked(
                                currentPet.id
                            )
                        : false
                );

        likeButton.classList.toggle(
            "is-active",
            isLiked
        );

        likeButton.setAttribute(
            "aria-pressed",
            String(isLiked)
        );

        likeButtonText.textContent =
            isLiked
                ? "Liked"
                : "Like this pet";

        likeButton
            .querySelector("span")
            .textContent =
                isLiked
                    ? "♥"
                    : "♡";

    }


    likeButton.addEventListener(
        "click",
        async () => {

            if (!currentPet) {
                return;
            }

            if (currentPet.isCloudPet && window.ThePetGridLikes) {
                if (window.ThePetGridLikes.isBusy(currentPet.id)) {
                    return;
                }

                likeButton.disabled = true;

                try {
                    await window.ThePetGridLikes.toggle(currentPet.id);
                } catch (_) {
                    // The shared service already restores state and displays the error.
                } finally {
                    likeButton.disabled = false;
                    renderPetProfile(currentPet);
                }

                return;
            }

            if (
                !window.PetStore ||
                typeof window.PetStore.toggleLike !== "function"
            ) {
                return;
            }

            window.PetStore.toggleLike(currentPet.id);
        }
    );


    // ==================================================
    // FAVORITE
    // ==================================================

    function updateFavoriteButton() {

        if (!currentPet) {

            return;

        }

        const isFavorite =
            currentPet.isCloudPet && window.ThePetGridFavorites
                ? window.ThePetGridFavorites.isFavorite(currentPet.id)
                : (
                    typeof window.PetStore?.isFavorite === "function"
                        ? window.PetStore.isFavorite(currentPet.id)
                        : false
                );

        favoriteButton.classList.toggle(
            "is-active",
            isFavorite
        );

        favoriteButton.textContent =
            isFavorite
                ? "★"
                : "☆";

        favoriteButton.setAttribute(
            "aria-pressed",
            String(isFavorite)
        );

        favoriteButton.setAttribute(
            "aria-label",
            isFavorite
                ? "Remove pet from favorites"
                : "Add pet to favorites"
        );

    }


    favoriteButton.addEventListener(
        "click",
        async () => {
            if (!currentPet) return;

            if (currentPet.isCloudPet && window.ThePetGridFavorites) {
                if (window.ThePetGridFavorites.isBusy(currentPet.id)) return;
                favoriteButton.disabled = true;
                try {
                    await window.ThePetGridFavorites.toggle(currentPet.id);
                } catch (_) {
                    // The shared service already restores state and displays the error.
                } finally {
                    favoriteButton.disabled = false;
                    updateFavoriteButton();
                }
                return;
            }

            if (typeof window.PetStore?.toggleFavorite === "function") {
                window.PetStore.toggleFavorite(currentPet.id);
            }
        }
    );


    // ==================================================
    // FOLLOW
    // ==================================================

    function updateFollowButton() {
        if (!currentPet) return;

        const isFollowing =
            currentPet.isCloudPet && window.ThePetGridPetFollows
                ? window.ThePetGridPetFollows.isFollowing(currentPet.id)
                : isFollowingPet(currentPet.id);

        followButton.classList.toggle("is-active", isFollowing);
        followButton.textContent = isFollowing ? "Following" : "Follow Pet";
        followButton.setAttribute("aria-pressed", String(isFollowing));
    }

    followButton.addEventListener("click", async event => {
        event.preventDefault();
        event.stopPropagation();

        if (!currentPet) return;

        if (currentPet.isCloudPet && window.ThePetGridPetFollows) {
            if (window.ThePetGridPetFollows.isBusy(currentPet.id)) return;

            followButton.disabled = true;
            try {
                await window.ThePetGridPetFollows.toggle(currentPet.id);
            } catch (_) {
                // The shared service restores the previous state and shows the error.
            } finally {
                followButton.disabled = false;
                renderPetProfile(currentPet);
            }
            return;
        }

        const wasFollowing = isFollowingPet(currentPet.id);
        const newState = !wasFollowing;
        setFollowingPet(currentPet.id, newState);

        currentPet.followers = Math.max(
            0,
            Number(currentPet.followers || 0) + (newState ? 1 : -1)
        );

        followersElement.textContent = currentPet.followers;
        updateFollowButton();
    });

    // ==================================================
    // STORE CHANGE
    // ==================================================

    window.addEventListener(
        "petstore:change",
        async () => {

            if (!currentPet) {

                return;

            }

            const refreshedPet =
                await getPetById(
                    currentPet.id
                );

            if (!refreshedPet) {

                showError();

                return;

            }

            currentPet =
                refreshedPet;

            renderPetProfile(
                currentPet
            );

        }
    );


    window.addEventListener(
        "thepetgrid:favorites-changed",
        event => {
            if (!currentPet || String(event.detail?.petId) !== String(currentPet.id)) return;
            updateFavoriteButton();
        }
    );

    window.addEventListener(
        "thepetgrid:pet-follows-changed",
        event => {
            if (!currentPet || String(event.detail?.petId) !== String(currentPet.id)) return;
            currentPet.followers = Number(event.detail?.count || 0);
            followersElement.textContent = currentPet.followers;
            updateFollowButton();
        }
    );


    window.addEventListener(
        "thepetgrid:likes-changed",
        event => {
            if (
                !currentPet ||
                String(event.detail?.petId) !== String(currentPet.id)
            ) {
                return;
            }

            currentPet.likes = Number(event.detail?.count || 0);
            renderPetProfile(currentPet);
        }
    );


    // ==================================================
    // INITIALIZE
    // ==================================================

    reportLostButton?.addEventListener("click", () => {
        if (!currentPet) {
            return;
        }

        try {
            sessionStorage.setItem(
                "thepetgrid_lost_report_pet",
                JSON.stringify(currentPet)
            );
        } catch (_) {
            // Lost & Found can still load the profile by petId.
        }
    });

    async function initializePetProfile() {

        showLoading();

        const petId = getPetIdFromUrl();

        if (petId === null) {
            showError();
            return;
        }

        const pet = await getPetById(petId);

        if (!pet) {
            showError();
            return;
        }

        currentPet = pet;

        if (currentPet.isCloudPet && window.ThePetGridLikes) {
            await window.ThePetGridLikes.initialize([currentPet]);
        }
        if (currentPet.isCloudPet && window.ThePetGridFavorites) {
            await window.ThePetGridFavorites.initialize([currentPet]);
        }
        if (currentPet.isCloudPet && window.ThePetGridPetFollows) {
            await window.ThePetGridPetFollows.initialize([currentPet]);
        }
        if (currentPet.isCloudPet && window.ThePetGridPetGifts) {
            await window.ThePetGridPetGifts.initialize(currentPet.id);
            currentPet.gifts = window.ThePetGridPetGifts.getCount();
        }

        renderPetProfile(currentPet);
        if (window.ThePetGridMemorialFlow) {
            await window.ThePetGridMemorialFlow.setPet(currentPet);
        }
        showProfile();
    }


    initializePetProfile();

});
