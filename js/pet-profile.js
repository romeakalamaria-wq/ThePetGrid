// ==================================================
// THEPETGRID
// PET PROFILE PAGE
// ==================================================

document.addEventListener("DOMContentLoaded", () => {
let atlasState = null;

try {

    atlasState = JSON.parse(

        sessionStorage.getItem("thepetgrid_atlas_state")

    );

} catch (_) {

    atlasState = null;

}

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

    const atlasStoryElement = document.getElementById("atlasPetStory");
    const atlasStoryTitleElement = document.getElementById("atlasPetStoryTitle");
    const atlasStoryTextElement = document.getElementById("atlasPetStoryText");
    const atlasJoinedElement = document.getElementById("atlasPetJoined");
    const atlasHomeElement = document.getElementById("atlasPetHome");
    const atlasOwnerElement = document.getElementById("atlasPetOwner");
    const atlasCommunityElement = document.getElementById("atlasPetCommunity");
    const atlasTimelineElement = document.getElementById("atlasPetTimeline");

    const atlasConnectionElement = document.getElementById("atlasPetConnection");
    const atlasConnectionTextElement = document.getElementById("atlasPetConnectionText");
    const atlasViewButton = document.getElementById("viewPetOnAtlas");
    const atlasMapTitleElement = document.getElementById("atlasPetMapTitle");
    const atlasMapFrame = document.getElementById("atlasPetMapFrame");
    const atlasMapFallback = document.getElementById("atlasPetMapFallback");
    const atlasMapFallbackTitle = document.getElementById("atlasPetMapFallbackTitle");
    const atlasMapCaption = document.getElementById("atlasPetMapCaption");
    const atlasGalleryCard = document.getElementById("atlasPetGalleryCard");
    const atlasGalleryElement = document.getElementById("atlasPetGallery");
    const atlasNearbyPetsElement = document.getElementById("atlasNearbyPets");


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
            owner: row.profiles?.display_name || row.profiles?.username || "ThePetGrid Member",
            ownerUsername: row.profiles?.username || "",
            bio: row.bio || "No story has been added yet.",
            image: row.image_url || "",
            verified: Boolean(row.verified),
            status: row.is_memorial ? "memorial" : "new",
            likes: Number(row.pet_likes?.[0]?.count || 0),
            followers: 0,
            gifts: 0,
            createdAt: row.created_at || "",
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
            gallery: Array.isArray(row.gallery) ? row.gallery : [],
            isCloudPet: true
        };
    }


    async function getPetById(petId) {

        const client = window.ThePetGridSupabase?.client;

        if (client) {
            try {
                const { data, error } = await client
                    .from("pets")
                    .select("*, profiles:owner_id(username, display_name), pet_likes(count)")
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


    function escapeAtlasHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[character]);
    }

    function formatAtlasDate(value) {
        if (!value) return "Date unavailable";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Date unavailable";
        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit", month: "short", year: "numeric"
        }).format(date);
    }

    function renderAtlasStory(pet, followers) {
        if (!atlasStoryElement || !atlasTimelineElement) return;

        const name = pet.name || "This pet";
        const home = [pet.city, pet.country].filter(Boolean).join(", ") || "Location unavailable";
        const owner = pet.owner || "ThePetGrid Member";
        const joined = formatAtlasDate(pet.createdAt);
        const bio = pet.bio && pet.bio !== "No story has been added yet."
            ? pet.bio
            : `${name} is one of the living stories shining from ${home} in the world of ThePetGrid.`;

        atlasStoryTitleElement.textContent = `${name}'s living story`;
        atlasStoryTextElement.textContent = bio;
        atlasJoinedElement.textContent = joined;
        atlasHomeElement.textContent = home;
        atlasOwnerElement.textContent = owner;
        atlasCommunityElement.textContent = `${Number(followers || 0).toLocaleString("en-GB")} followers`;

        const timeline = [{
            title: "Joined ThePetGrid",
            description: `${name}'s story became part of the living world.`,
            date: joined,
            tone: ""
        }];

        const status = String(pet.status || "new").toLowerCase();
        if (status === "lost") timeline.push({
            title: "Lost signal active",
            description: `The community is helping ${name} find the way home.`,
            date: "Current",
            tone: "is-status"
        });
        else if (status === "memorial") timeline.push({
            title: "In loving memory",
            description: `${name}'s light continues to shine in the Memorial World.`,
            date: "Forever",
            tone: "is-memorial"
        });
        else if (status === "adopted") timeline.push({
            title: "A home was found",
            description: `${name}'s journey reached a new chapter.`,
            date: "Milestone",
            tone: "is-status"
        });
        else timeline.push({
            title: "Living story active",
            description: `${name}'s journey continues with the ThePetGrid community.`,
            date: "Now",
            tone: "is-status"
        });

        atlasTimelineElement.innerHTML = timeline.map(item => `
            <li class="atlas-pet-timeline__item ${item.tone}">
                <span class="atlas-pet-timeline__dot" aria-hidden="true"></span>
                <div class="atlas-pet-timeline__content">
                    <strong>${escapeAtlasHtml(item.title)}</strong>
                    <span>${escapeAtlasHtml(item.description)}</span>
                </div>
                <time>${escapeAtlasHtml(item.date)}</time>
            </li>
        `).join("");

        atlasStoryElement.hidden = false;
    }


    // ==================================================
    // ATLAS CONNECTION
    // ==================================================

    function validCoordinate(value) {
        return Number.isFinite(Number(value));
    }

    function galleryImagesForPet(pet) {
        const values = [
            ...(Array.isArray(pet.gallery) ? pet.gallery : []),
            ...(Array.isArray(pet.images) ? pet.images : []),
            pet.image
        ].map(value => String(value || "").trim()).filter(Boolean);

        return [...new Set(values)];
    }

    function atlasFocusPayload(pet) {
        return {
            id: pet.id,
            name: pet.name || "Pet",
            latitude: validCoordinate(pet.latitude) ? Number(pet.latitude) : null,
            longitude: validCoordinate(pet.longitude) ? Number(pet.longitude) : null,
            city: pet.city || "",
            country: pet.country || ""
        };
    }

    function renderAtlasMap(pet) {
        const location = [pet.city, pet.country].filter(Boolean).join(", ") || "Location unavailable";
        const hasCoordinates = validCoordinate(pet.latitude) && validCoordinate(pet.longitude);

        atlasMapTitleElement.textContent = location;
        atlasMapCaption.textContent = hasCoordinates ? `Approximate location · ${location}` : location;
        atlasMapFallbackTitle.textContent = location;

        if (!hasCoordinates) {
            atlasMapFrame.hidden = true;
            atlasMapFrame.removeAttribute("src");
            atlasMapFallback.hidden = false;
            return;
        }

        const latitude = Number(pet.latitude);
        const longitude = Number(pet.longitude);
        const bbox = [
            longitude - 0.12, latitude - 0.08,
            longitude + 0.12, latitude + 0.08
        ].join(",");

        const params = new URLSearchParams({
            bbox,
            layer: "mapnik",
            marker: `${latitude},${longitude}`
        });

        atlasMapFrame.src = `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
        atlasMapFrame.hidden = false;
        atlasMapFallback.hidden = true;
    }

    function renderAtlasGallery(pet) {
        const images = galleryImagesForPet(pet);

        if (images.length < 2) {
            atlasGalleryCard.hidden = true;
            atlasGalleryElement.innerHTML = "";
            return;
        }

        atlasGalleryCard.hidden = false;
        atlasGalleryElement.innerHTML = images.slice(0, 8).map((image, index) => `
            <button class="atlas-gallery-image" type="button" data-atlas-gallery-image="${escapeAtlasHtml(image)}" aria-label="Open photo ${index + 1}">
                <img src="${escapeAtlasHtml(image)}" alt="${escapeAtlasHtml(pet.name || "Pet")} photo ${index + 1}" loading="lazy">
            </button>
        `).join("");
    }

    async function loadNearbyPets(pet) {
        atlasNearbyPetsElement.innerHTML =
            '<p class="atlas-nearby-pets__empty">Looking for nearby stories…</p>';

        let nearby = [];
        const client = window.ThePetGridSupabase?.client;

        if (client) {
            try {
                let query = client
                    .from("pets")
                    .select("id,name,type,city,country,image_url")
                    .neq("id", String(pet.id))
                    .limit(6);

                if (pet.city) query = query.eq("city", pet.city);
                else if (pet.country) query = query.eq("country", pet.country);

                const { data, error } = await query;
                if (error) throw error;
                nearby = Array.isArray(data) ? data : [];
            } catch (error) {
                console.warn("ThePetGrid: nearby pets could not load.", error);
            }
        } else if (window.PetStore?.getAll) {
            nearby = window.PetStore.getAll()
                .filter(item =>
                    String(item.id) !== String(pet.id) &&
                    ((pet.city && item.city === pet.city) ||
                     (!pet.city && pet.country && item.country === pet.country))
                )
                .slice(0, 6);
        }

        if (!nearby.length) {
            atlasNearbyPetsElement.innerHTML =
                '<p class="atlas-nearby-pets__empty">No nearby pet stories are available yet.</p>';
            return;
        }

        atlasNearbyPetsElement.innerHTML = nearby.map(item => {
            const image = item.image_url || item.image || "../assets/avatar.png";
            const location = [item.city, item.country].filter(Boolean).join(", ") || "ThePetGrid";
            return `
                <a class="atlas-nearby-pet" href="pet.html?id=${encodeURIComponent(item.id)}">
                    <img src="${escapeAtlasHtml(image)}" alt="${escapeAtlasHtml(item.name || "Pet")}" loading="lazy">
                    <span>
                        <strong>${escapeAtlasHtml(item.name || "Pet")}</strong>
                        <small>${escapeAtlasHtml(location)}</small>
                    </span>
                    <b aria-hidden="true">→</b>
                </a>
            `;
        }).join("");
    }

    function renderAtlasConnection(pet) {
        const location = [pet.city, pet.country].filter(Boolean).join(", ") || "the world";
        atlasConnectionTextElement.textContent =
            `${pet.name || "This pet"} is part of the living world from ${location}.`;

        const atlasUrl = new URL("world-experience.html", window.location.href);
        atlasUrl.searchParams.set("petId", String(pet.id));
        atlasViewButton.href = atlasUrl.pathname + atlasUrl.search;

        atlasViewButton.onclick = () => {
            try {
                sessionStorage.setItem(
                    "thepetgrid_atlas_focus_pet",
                    JSON.stringify(atlasFocusPayload(pet))
                );
            } catch (_) {}
        };

        renderAtlasMap(pet);
        renderAtlasGallery(pet);
        loadNearbyPets(pet);
        atlasConnectionElement.hidden = false;
    }

    atlasGalleryElement?.addEventListener("click", event => {
        const button = event.target.closest("[data-atlas-gallery-image]");
        if (!button) return;

        const image = button.dataset.atlasGalleryImage;
        if (!image) return;

        imageElement.src = image;
        window.scrollTo({
            top: profileElement.getBoundingClientRect().top + window.scrollY - 90,
            behavior: "smooth"
        });
    });


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

        renderAtlasStory(pet, followers);
        renderAtlasConnection(pet);

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
