(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    async function getAuthUser() {
        if (window.ThePetGridAuth?.ready) await window.ThePetGridAuth.ready;
        return window.ThePetGridAuth?.getCurrentUser?.() || null;
    }

    function getClient() {
        return window.ThePetGridSupabase?.client || null;
    }

    function requestedUsername() {
        const params = new URLSearchParams(window.location.search);
        return String(params.get("username") || params.get("user") || "").trim();
    }

    function setStatus(message, state = "") {
        const status = $("profileSettingsStatus");
        if (!status) return;
        status.textContent = message;
        if (state) status.dataset.state = state;
        else delete status.dataset.state;
    }

    async function initializeSettings() {
        const form = $("profileSettingsForm");
        if (!form) return;

        const client = getClient();
        const user = await getAuthUser();
        if (!client || !user?.id) return;

        const fields = {
            displayName: $("profileDisplayNameInput"),
            bio: $("profileBioInput"),
            country: $("profileCountryInput"),
            city: $("profileCityInput"),
            isPrivate: $("profilePrivateInput"),
            showLocation: $("profileShowLocationInput"),
            messagePrivacy: $("profileMessagePrivacyInput"),
            save: $("saveProfileSettingsButton")
        };

        try {
            const { data, error } = await client
                .from("profiles")
                .select("display_name, bio, country, city, is_private, show_location, message_privacy")
                .eq("id", user.id)
                .single();
            if (error) throw error;

            fields.displayName.value = data.display_name || "";
            fields.bio.value = data.bio || "";
            fields.country.value = data.country || "";
            fields.city.value = data.city || "";
            fields.isPrivate.checked = Boolean(data.is_private);
            fields.showLocation.checked = data.show_location !== false;
            fields.messagePrivacy.value = data.message_privacy || "everyone";
        } catch (error) {
            console.error("Profile settings could not be loaded.", error);
            setStatus("Run the Sprint 10.5 SQL file in Supabase first.", "error");
        }

        form.addEventListener("submit", async event => {
            event.preventDefault();
            fields.save.disabled = true;
            setStatus("Saving…");

            const changes = {
                display_name: fields.displayName.value.trim() || null,
                bio: fields.bio.value.trim(),
                country: fields.country.value.trim() || null,
                city: fields.city.value.trim() || null,
                is_private: fields.isPrivate.checked,
                show_location: fields.showLocation.checked,
                message_privacy: fields.messagePrivacy.value
            };

            try {
                const { error } = await client.from("profiles").update(changes).eq("id", user.id);
                if (error) throw error;
                setStatus("Settings saved successfully.", "success");
                const title = $("profileUsername");
                if (title && changes.display_name) title.textContent = changes.display_name;
            } catch (error) {
                console.error("Profile settings could not be saved.", error);
                setStatus(error.message || "Settings could not be saved.", "error");
            } finally {
                fields.save.disabled = false;
            }
        });
    }

    function showPrivateState(profile) {
        const content = $("profileContent");
        const loading = $("profileLoading");
        const error = $("profileError");
        const title = error?.querySelector("h2");
        const message = $("profileErrorMessage");
        if (loading) loading.hidden = true;
        if (content) content.hidden = true;
        if (error) error.hidden = false;
        if (title) title.textContent = "This profile is private";
        if (message) message.textContent = `Follow @${profile.username} to see their pets and profile details.`;
    }

    function hideLocation() {
        const location = $("profileLocation");
        const country = $("profileCountry");
        const city = $("profileCity");
        if (location) location.textContent = "📍 Location hidden";
        if (country) country.textContent = "Hidden";
        if (city) city.textContent = "Hidden";
    }

    async function initializePublicPrivacy() {
        if (!$("profileContent") || $("profileSettingsForm")) return;

        const username = requestedUsername();
        const client = getClient();
        if (!username || !client) return;

        try {
            const [{ data: profile, error }, viewer] = await Promise.all([
                client
                    .from("profiles")
                    .select("id, username, display_name, bio, country, city, is_private, show_location, message_privacy")
                    .ilike("username", username)
                    .maybeSingle(),
                getAuthUser()
            ]);
            if (error || !profile) return;

            const isOwner = viewer?.id === profile.id;
            let isFollower = false;
            if (viewer?.id && !isOwner) {
                const { data } = await client
                    .from("profile_follows")
                    .select("follower_id")
                    .eq("follower_id", viewer.id)
                    .eq("following_id", profile.id)
                    .maybeSingle();
                isFollower = Boolean(data);
            }

            if (profile.is_private && !isOwner && !isFollower) {
                showPrivateState(profile);
                return;
            }

            if (!profile.show_location && !isOwner) hideLocation();

            const messageAllowed = isOwner || profile.message_privacy === "everyone" ||
                (profile.message_privacy === "followers" && isFollower);
            const messageButton = $("messageButton");
            if (messageButton && !messageAllowed) {
                messageButton.disabled = true;
                messageButton.hidden = true;
            }

            if (profile.display_name) {
                const displayName = $("profileDisplayName");
                const aboutName = $("profileAboutName");
                if (displayName) displayName.textContent = profile.display_name;
                if (aboutName) aboutName.textContent = profile.display_name;
            }
            if (profile.bio && $("profileBio")) $("profileBio").textContent = profile.bio;
        } catch (error) {
            console.warn("Public privacy rules could not be applied.", error);
        }
    }

    document.addEventListener("DOMContentLoaded", async () => {
        await initializeSettings();
        await initializePublicPrivacy();
    });
})();
