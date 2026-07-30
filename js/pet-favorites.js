// ==========================================
// THEPETGRID - SUPABASE PET FAVORITES
// ==========================================

(() => {
    "use strict";

    const favoriteState = new Map();
    const busyPets = new Set();

    function getClient() {
        return window.ThePetGridSupabase?.client || null;
    }

    function isCloudPetId(petId) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            .test(String(petId || ""));
    }

    async function getCurrentUser() {
        if (window.ThePetGridAuth?.ready) {
            await window.ThePetGridAuth.ready;
        }
        return window.ThePetGridAuth?.getCurrentUser?.() || null;
    }

    function setInitialState(pets = []) {
        pets.forEach(pet => {
            if (!pet || !isCloudPetId(pet.id)) return;
            if (!favoriteState.has(String(pet.id))) {
                favoriteState.set(String(pet.id), false);
            }
        });
    }

    async function initialize(pets = []) {
        const cloudPets = pets.filter(pet => pet && isCloudPetId(pet.id));
        setInitialState(cloudPets);
        if (!cloudPets.length) return;

        const client = getClient();
        const user = await getCurrentUser();
        if (!client || !user?.id) return;

        const petIds = cloudPets.map(pet => String(pet.id));
        const { data, error } = await client
            .from("pet_favorites")
            .select("pet_id")
            .eq("user_id", user.id)
            .in("pet_id", petIds);

        if (error) {
            console.error("ThePetGrid: could not load the user's favorites.", error);
            return;
        }

        const favoriteIds = new Set((data || []).map(row => String(row.pet_id)));
        petIds.forEach(petId => favoriteState.set(petId, favoriteIds.has(petId)));
    }

    function isFavorite(petId) {
        return Boolean(favoriteState.get(String(petId)));
    }

    function isBusy(petId) {
        return busyPets.has(String(petId));
    }

    function redirectToLogin() {
        const current = `${window.location.pathname.split("/").pop() || "index.html"}${window.location.search}${window.location.hash}`;
        const loginPath = window.location.pathname.includes("/pages/")
            ? "login.html"
            : "pages/login.html";
        window.location.href = `${loginPath}?returnTo=${encodeURIComponent(current)}`;
    }

    function emit(petId, favorite) {
        window.dispatchEvent(new CustomEvent("thepetgrid:favorites-changed", {
            detail: { petId: String(petId), favorite: Boolean(favorite) }
        }));
    }

    async function toggle(petId) {
        const id = String(petId || "");
        if (!isCloudPetId(id)) {
            throw new Error("Supabase favorites can only be used with cloud pets.");
        }
        if (busyPets.has(id)) return isFavorite(id);

        const client = getClient();
        const user = await getCurrentUser();
        if (!client) throw new Error("Supabase client is not available.");

        if (!user?.id) {
            window.alert("Please log in to save favorites.");
            redirectToLogin();
            return null;
        }

        const previous = isFavorite(id);
        const next = !previous;
        favoriteState.set(id, next);
        busyPets.add(id);
        emit(id, next);

        try {
            let error;
            if (previous) {
                ({ error } = await client
                    .from("pet_favorites")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("pet_id", id));
            } else {
                ({ error } = await client
                    .from("pet_favorites")
                    .insert({ user_id: user.id, pet_id: id }));
            }
            if (error) throw error;
            return next;
        } catch (error) {
            favoriteState.set(id, previous);
            emit(id, previous);
            console.error("ThePetGrid: favorite could not be saved.", error);
            window.alert(error.message || "The favorite could not be saved.");
            throw error;
        } finally {
            busyPets.delete(id);
        }
    }

    window.ThePetGridFavorites = {
        initialize,
        isCloudPetId,
        isFavorite,
        isBusy,
        toggle
    };
})();
