// ==========================================
// THEPETGRID - SUPABASE PET LIKES
// ==========================================

(() => {
    "use strict";

    const likeState = new Map();
    const busyPets = new Set();

    function getClient() {
        return window.ThePetGridSupabase?.client || null;
    }

    function isCloudPetId(petId) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            .test(String(petId || ""));
    }

    function normalizeCount(value) {
        const number = Number(value);
        return Number.isFinite(number) && number >= 0 ? number : 0;
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
            likeState.set(String(pet.id), {
                count: normalizeCount(pet.likes),
                liked: false
            });
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
            .from("pet_likes")
            .select("pet_id")
            .eq("user_id", user.id)
            .in("pet_id", petIds);

        if (error) {
            console.error("ThePetGrid: could not load the user's likes.", error);
            return;
        }

        const likedIds = new Set((data || []).map(row => String(row.pet_id)));
        petIds.forEach(petId => {
            const current = likeState.get(petId) || { count: 0, liked: false };
            current.liked = likedIds.has(petId);
            likeState.set(petId, current);
        });
    }

    function isLiked(petId) {
        return Boolean(likeState.get(String(petId))?.liked);
    }

    function getCount(petId, fallback = 0) {
        return normalizeCount(likeState.get(String(petId))?.count ?? fallback);
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

    async function toggle(petId) {
        const id = String(petId || "");

        if (!isCloudPetId(id)) {
            throw new Error("Supabase likes can only be used with cloud pets.");
        }

        if (busyPets.has(id)) return likeState.get(id) || { count: 0, liked: false };

        const client = getClient();
        const user = await getCurrentUser();

        if (!client) {
            throw new Error("Supabase client is not available.");
        }

        if (!user?.id) {
            window.alert("Please log in to like this pet.");
            redirectToLogin();
            return null;
        }

        const previous = { ...(likeState.get(id) || { count: 0, liked: false }) };
        const next = {
            liked: !previous.liked,
            count: Math.max(0, previous.count + (previous.liked ? -1 : 1))
        };

        likeState.set(id, next);
        busyPets.add(id);
        window.dispatchEvent(new CustomEvent("thepetgrid:likes-changed", {
            detail: { petId: id, ...next }
        }));

        try {
            let error;

            if (previous.liked) {
                ({ error } = await client
                    .from("pet_likes")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("pet_id", id));
            } else {
                ({ error } = await client
                    .from("pet_likes")
                    .insert({ user_id: user.id, pet_id: id }));
            }

            if (error) throw error;
            return next;
        } catch (error) {
            likeState.set(id, previous);
            window.dispatchEvent(new CustomEvent("thepetgrid:likes-changed", {
                detail: { petId: id, ...previous }
            }));
            console.error("ThePetGrid: like could not be saved.", error);
            window.alert(error.message || "The like could not be saved.");
            throw error;
        } finally {
            busyPets.delete(id);
        }
    }

    window.ThePetGridLikes = {
        initialize,
        isCloudPetId,
        isLiked,
        getCount,
        isBusy,
        toggle
    };
})();
