// ==========================================
// THEPETGRID - MY PROFILE (SUPABASE)
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const profileUsername = document.getElementById("profileUsername");
    const memberSince = document.getElementById("memberSince");
    const totalPets = document.getElementById("totalPets");
    const totalLikes = document.getElementById("totalLikes");
    const totalFollowers = document.getElementById("totalFollowers");
    const totalGifts = document.getElementById("totalGifts");
    const myPetsGrid = document.getElementById("myPetsGrid");

    if (!profileUsername || !memberSince || !totalPets || !totalLikes || !totalFollowers || !totalGifts || !myPetsGrid) {
        console.error("My Profile: Missing required HTML elements.");
        return;
    }

    const escapeHtml = value => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const safeNumber = value => Number.isFinite(Number(value)) ? Number(value) : 0;

    function formatAge(value) {
        if (value === null || value === undefined || value === "") return "Age not added";
        if (typeof value === "string" && /[a-z]/i.test(value)) return value;
        const number = Number(value);
        if (Number.isNaN(number)) return String(value);
        return `${number} ${number === 1 ? "year" : "years"}`;
    }

    function normalizePet(row) {
        return {
            id: row.id,
            ownerId: row.owner_id,
            name: row.name || "Unnamed Pet",
            type: row.type || "Other",
            breed: row.breed || "Breed not added",
            age: formatAge(row.age),
            country: row.country || "Location not added",
            city: row.city || "",
            image: row.image_url || "",
            verified: Boolean(row.verified),
            status: row.is_memorial ? "memorial" : "new",
            isLost: false,
            lostReportId: null,
            likes: Number(row.pet_likes?.[0]?.count || 0),
            followers: 0,
            gifts: 0,
            createdAt: row.created_at || ""
        };
    }

    function renderDashboard(pets) {
        totalPets.textContent = pets.length.toLocaleString();
        totalLikes.textContent = pets.reduce((sum, pet) => sum + safeNumber(pet.likes), 0).toLocaleString();
        totalFollowers.textContent = pets.reduce((sum, pet) => sum + safeNumber(pet.followers), 0).toLocaleString();
        totalGifts.textContent = pets.reduce((sum, pet) => sum + safeNumber(pet.gifts), 0).toLocaleString();
    }

    function renderEmptyState(message = "You have not added any pets yet") {
        myPetsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">🐾</div>
                <h3>${escapeHtml(message)}</h3>
                <p>Upload your first pet and it will appear here automatically.</p>
                <a href="upload.html">Add Your First Pet</a>
            </div>
        `;
    }

    function createPetCard(pet) {
        const card = document.createElement("article");
        card.className = "pet-card";

        const image = pet.image || "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80";
        const location = [pet.city, pet.country].filter(Boolean).join(", ");
        const statusLabel = pet.status === "memorial"
            ? "Memorial"
            : pet.isLost
                ? "🔴 LOST — Active"
                : "New";
        const lostAction = pet.status === "memorial"
            ? ""
            : pet.isLost
                ? `<a class="pet-action pet-action--found" href="lost-found.html?reportId=${encodeURIComponent(pet.lostReportId || "")}#reports">🏡 Mark as Found</a>`
                : `<a class="pet-action pet-action--sos" href="lost-found.html?mode=lost&petId=${encodeURIComponent(pet.id)}">🆘 Report Lost</a>`;

        card.innerHTML = `
            <img src="${escapeHtml(image)}" alt="${escapeHtml(pet.name)}">
            <div class="pet-content">
                <h3>${escapeHtml(pet.name)}</h3>
                <p>${escapeHtml(pet.breed)} · ${escapeHtml(pet.age)}</p>
                <p>📍 ${escapeHtml(location)}</p>
                <p>Status: ${statusLabel}</p>
                <p>❤️ ${safeNumber(pet.likes)} &nbsp; 👥 ${safeNumber(pet.followers)}</p>
                <div class="pet-actions">
                    <a class="pet-action pet-action--edit" href="edit-pet.html?id=${encodeURIComponent(pet.id)}">✏️ Edit</a>
                    <a class="pet-action pet-action--view" href="pet.html?id=${encodeURIComponent(pet.id)}">👁 View</a>
                    ${lostAction}
                    <button class="pet-action pet-action--favorite" type="button" data-action="favorite" data-pet-id="${escapeHtml(pet.id)}" aria-label="Toggle favorite">${window.ThePetGridFavorites?.isFavorite?.(pet.id) ? "⭐ Remove from Favorites" : "☆ Add to Favorites"}</button>
                    <button class="pet-action pet-action--delete" type="button" data-action="delete" data-pet-id="${escapeHtml(pet.id)}">🗑 Delete</button>
                </div>
            </div>
        `;

        return card;
    }

    function renderPets(pets) {
        myPetsGrid.innerHTML = "";
        if (!pets.length) {
            renderEmptyState();
            return;
        }
        pets.forEach(pet => myPetsGrid.appendChild(createPetCard(pet)));
    }

    async function getCurrentUser() {
        if (window.ThePetGridAuth?.ready) {
            await window.ThePetGridAuth.ready;
        }
        return window.ThePetGridAuth?.getCurrentUser?.() || null;
    }

    async function loadMyPets(userId) {
        const client = window.ThePetGridSupabase?.client;
        if (!client) throw new Error("Supabase client is not available.");

        const { data, error } = await client
            .from("pets")
            .select("*, pet_likes(count)")
            .eq("owner_id", userId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return Array.isArray(data) ? data.map(normalizePet) : [];
    }

    async function applyLostFoundState(pets, userId) {
        const client = window.ThePetGridSupabase?.client;
        if (!client || !pets.length) return pets;

        const petIds = pets.map(pet => pet.id).filter(Boolean);
        if (!petIds.length) return pets;

        const { data, error } = await client
            .from("lost_pet_reports")
            .select("id, pet_id, reporter_id, status, resolved, created_at")
            .eq("reporter_id", userId)
            .eq("status", "lost")
            .eq("resolved", false)
            .in("pet_id", petIds)
            .order("created_at", { ascending: false });

        if (error) {
            console.warn("My Profile: active Lost & Found state could not be loaded.", error);
            return pets;
        }

        const activeByPet = new Map();
        (data || []).forEach(report => {
            const key = String(report.pet_id || "");
            if (key && !activeByPet.has(key)) activeByPet.set(key, report);
        });

        return pets.map(pet => {
            const report = activeByPet.get(String(pet.id));
            return report
                ? { ...pet, isLost: true, lostReportId: report.id }
                : pet;
        });
    }


    function getStoragePathFromUrl(url) {
        if (!url) return null;
        const marker = "/storage/v1/object/public/pet-images/";
        const index = url.indexOf(marker);
        if (index === -1) return null;
        return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
    }

    async function deletePet(petId) {
        if (!petId || !window.confirm("Are you sure you want to delete this pet? This action cannot be undone.")) return;

        const client = window.ThePetGridSupabase?.client;
        const user = await getCurrentUser();
        if (!client || !user?.id) return;

        const button = myPetsGrid.querySelector(`button[data-action="delete"][data-pet-id="${CSS.escape(String(petId))}"]`);
        if (button) button.disabled = true;

        try {
            const { data: pet, error: readError } = await client
                .from("pets")
                .select("id, owner_id, image_url")
                .eq("id", petId)
                .eq("owner_id", user.id)
                .maybeSingle();

            if (readError) throw readError;
            if (!pet) throw new Error("This pet was not found or you do not have permission to delete it.");

            const { error: deleteError } = await client
                .from("pets")
                .delete()
                .eq("id", petId)
                .eq("owner_id", user.id);

            if (deleteError) throw deleteError;

            const storagePath = getStoragePathFromUrl(pet.image_url);
            if (storagePath) {
                const { error: storageError } = await client.storage
                    .from("pet-images")
                    .remove([storagePath]);
                if (storageError) {
                    console.warn("Pet record was deleted, but its image could not be removed.", storageError);
                }
            }

            await renderPage();
        } catch (error) {
            console.error("Could not delete pet.", error);
            window.alert(error.message || "The pet could not be deleted.");
            if (button) button.disabled = false;
        }
    }

    myPetsGrid.addEventListener("click", async event => {
        const deleteButton = event.target.closest("button[data-action='delete']");
        if (deleteButton) {
            deletePet(deleteButton.dataset.petId);
            return;
        }

        const favoriteButton = event.target.closest("button[data-action='favorite']");
        if (favoriteButton && window.ThePetGridFavorites) {
            const petId = favoriteButton.dataset.petId;
            if (window.ThePetGridFavorites.isBusy(petId)) return;
            favoriteButton.disabled = true;
            try {
                await window.ThePetGridFavorites.toggle(petId);
            } catch (_) {
                // The shared service already displays the error.
            } finally {
                favoriteButton.disabled = false;
                favoriteButton.textContent = window.ThePetGridFavorites.isFavorite(petId)
                    ? "⭐ Remove from Favorites"
                    : "☆ Add to Favorites";
            }
        }
    });

    async function renderPage() {
        myPetsGrid.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🐾</div><h3>Loading your pets…</h3></div>`;

        const user = await getCurrentUser();
        if (!user?.id) {
            window.location.replace("login.html?returnTo=my-profile.html");
            return;
        }

        profileUsername.textContent = user.username || user.email || "Member";

        const client = window.ThePetGridSupabase?.client;
        if (client) {
            const { data: profile } = await client
                .from("profiles")
                .select("username, created_at")
                .eq("id", user.id)
                .maybeSingle();

            if (profile?.username) profileUsername.textContent = profile.username;
            const joined = profile?.created_at ? new Date(profile.created_at) : new Date();
            memberSince.textContent = `Member since ${Number.isNaN(joined.getTime()) ? new Date().getFullYear() : joined.getFullYear()}`;
        }

        try {
            let pets = await loadMyPets(user.id);
            pets = await applyLostFoundState(pets, user.id);
            if (window.ThePetGridFavorites) {
                await window.ThePetGridFavorites.initialize(pets);
            }
            renderDashboard(pets);
            renderPets(pets);
        } catch (error) {
            console.error("My Profile: could not load pets from Supabase.", error);
            renderDashboard([]);
            renderEmptyState("Your pets could not be loaded");
        }
    }

    await renderPage();
});
