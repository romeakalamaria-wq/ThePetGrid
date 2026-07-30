// ==========================================
// THEPETGRID - SUPABASE PET FOLLOWS
// ==========================================

(() => {
    "use strict";

    const followState = new Map();
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

    function normalizeCount(value) {
        const number = Number(value);
        return Number.isFinite(number) && number >= 0 ? number : 0;
    }

    function emit(petId) {
        const state = followState.get(String(petId)) || { count: 0, following: false };
        window.dispatchEvent(new CustomEvent("thepetgrid:pet-follows-changed", {
            detail: {
                petId: String(petId),
                count: state.count,
                following: state.following
            }
        }));
    }

    async function initialize(pets = []) {
        const cloudPets = pets.filter(pet => pet && isCloudPetId(pet.id));
        if (!cloudPets.length) return;

        const client = getClient();
        if (!client) return;

        const petIds = cloudPets.map(pet => String(pet.id));

        petIds.forEach((petId, index) => {
            followState.set(petId, {
                count: normalizeCount(cloudPets[index]?.followers),
                following: false
            });
        });

        const { data: allRows, error: countError } = await client
            .from("pet_follows")
            .select("pet_id")
            .in("pet_id", petIds);

        if (countError) {
            console.error("ThePetGrid: could not load pet follower counts.", countError);
            return;
        }

        const counts = new Map();
        (allRows || []).forEach(row => {
            const id = String(row.pet_id);
            counts.set(id, (counts.get(id) || 0) + 1);
        });

        const user = await getCurrentUser();
        let followedIds = new Set();

        if (user?.id) {
            const { data: userRows, error: userError } = await client
                .from("pet_follows")
                .select("pet_id")
                .eq("user_id", user.id)
                .in("pet_id", petIds);

            if (userError) {
                console.error("ThePetGrid: could not load the user's pet follows.", userError);
            } else {
                followedIds = new Set((userRows || []).map(row => String(row.pet_id)));
            }
        }

        petIds.forEach(petId => {
            followState.set(petId, {
                count: counts.get(petId) || 0,
                following: followedIds.has(petId)
            });
            emit(petId);
        });
    }

    function getCount(petId, fallback = 0) {
        return normalizeCount(followState.get(String(petId))?.count ?? fallback);
    }

    function isFollowing(petId) {
        return Boolean(followState.get(String(petId))?.following);
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
            throw new Error("Supabase pet follows can only be used with cloud pets.");
        }
        if (busyPets.has(id)) return followState.get(id);

        const client = getClient();
        const user = await getCurrentUser();
        if (!client) throw new Error("Supabase client is not available.");

        if (!user?.id) {
            window.alert("Please log in to follow this pet.");
            redirectToLogin();
            return null;
        }

        const previous = { ...(followState.get(id) || { count: 0, following: false }) };
        const next = {
            following: !previous.following,
            count: Math.max(0, previous.count + (previous.following ? -1 : 1))
        };

        followState.set(id, next);
        busyPets.add(id);
        emit(id);

        try {
            let error;
            if (previous.following) {
                ({ error } = await client
                    .from("pet_follows")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("pet_id", id));
            } else {
                ({ error } = await client
                    .from("pet_follows")
                    .insert({ user_id: user.id, pet_id: id }));
            }
            if (error) throw error;
            return next;
        } catch (error) {
            followState.set(id, previous);
            emit(id);
            console.error("ThePetGrid: pet follow could not be saved.", error);
            window.alert(error.message || "The follow could not be saved.");
            throw error;
        } finally {
            busyPets.delete(id);
        }
    }

    window.ThePetGridPetFollows = {
        initialize,
        isCloudPetId,
        getCount,
        isFollowing,
        isBusy,
        toggle
    };
})();
