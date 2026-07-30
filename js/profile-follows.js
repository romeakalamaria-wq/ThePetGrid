(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);
    const followButton = $("followButton");
    const followersCount = $("profileFollowersCount");
    const followingCount = $("profileFollowingCount");
    const followersButton = $("openFollowersButton");
    const followingButton = $("openFollowingButton");
    const modal = $("connectionsModal");
    const modalTitle = $("connectionsModalTitle");
    const modalSubtitle = $("connectionsModalSubtitle");
    const modalList = $("connectionsList");
    const modalEmpty = $("connectionsEmptyState");
    const modalEmptyTitle = $("connectionsEmptyTitle");
    const modalEmptyText = $("connectionsEmptyText");
    const closeModalButton = $("closeConnectionsModal");
    const searchInput = $("connectionsSearchInput");

    let client = null;
    let currentUser = null;
    let targetProfile = null;
    let isFollowing = false;
    let activeConnections = [];

    function usernameFromUrl() {
        return (new URLSearchParams(location.search).get("username") || "").trim();
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function setFollowButton() {
        if (!followButton || !targetProfile) return;
        const ownProfile = currentUser?.id === targetProfile.id;
        followButton.hidden = ownProfile;
        if (ownProfile) return;
        followButton.disabled = false;
        followButton.textContent = isFollowing ? "✓ Following" : "+ Follow";
        followButton.classList.toggle("is-following", isFollowing);
        followButton.setAttribute("aria-pressed", String(isFollowing));
    }

    async function countRows(column, id) {
        const { count, error } = await client
            .from("profile_follows")
            .select("*", { count: "exact", head: true })
            .eq(column, id);
        if (error) throw error;
        return count || 0;
    }

    async function refreshCounts() {
        if (!targetProfile) return;
        const [followers, following] = await Promise.all([
            countRows("following_id", targetProfile.id),
            countRows("follower_id", targetProfile.id)
        ]);
        if (followersCount) followersCount.textContent = String(followers);
        if (followingCount) followingCount.textContent = String(following);
    }

    async function refreshFollowingState() {
        if (!currentUser || !targetProfile || currentUser.id === targetProfile.id) {
            isFollowing = false;
            setFollowButton();
            return;
        }
        const { data, error } = await client
            .from("profile_follows")
            .select("follower_id")
            .eq("follower_id", currentUser.id)
            .eq("following_id", targetProfile.id)
            .maybeSingle();
        if (error) throw error;
        isFollowing = Boolean(data);
        setFollowButton();
    }

    async function toggleFollow(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (!currentUser) {
            location.href = `login.html?redirect=${encodeURIComponent(location.href)}`;
            return;
        }
        if (!targetProfile || currentUser.id === targetProfile.id || followButton.disabled) return;

        followButton.disabled = true;
        const previous = isFollowing;
        isFollowing = !isFollowing;
        setFollowButton();
        followButton.disabled = true;

        try {
            if (isFollowing) {
                const { error } = await client.from("profile_follows").insert({
                    follower_id: currentUser.id,
                    following_id: targetProfile.id
                });
                if (error) throw error;
            } else {
                const { error } = await client
                    .from("profile_follows")
                    .delete()
                    .eq("follower_id", currentUser.id)
                    .eq("following_id", targetProfile.id);
                if (error) throw error;
            }
            await refreshCounts();
        } catch (error) {
            console.error("ThePetGrid follow error:", error);
            isFollowing = previous;
            alert(error.message || "The follow action could not be completed.");
        } finally {
            setFollowButton();
        }
    }

    async function fetchConnectionProfiles(type) {
        const matchColumn = type === "followers" ? "following_id" : "follower_id";
        const idColumn = type === "followers" ? "follower_id" : "following_id";
        const { data: rows, error } = await client
            .from("profile_follows")
            .select(`${idColumn}, created_at`)
            .eq(matchColumn, targetProfile.id)
            .order("created_at", { ascending: false });
        if (error) throw error;
        const ids = [...new Set((rows || []).map((row) => row[idColumn]).filter(Boolean))];
        if (!ids.length) return [];
        const { data: profiles, error: profilesError } = await client
            .from("profiles")
            .select("id, username, avatar_url, bio, country")
            .in("id", ids);
        if (profilesError) throw profilesError;
        const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));
        return ids.map((id) => byId.get(id)).filter(Boolean);
    }

    function renderConnections(filter = "") {
        if (!modalList) return;
        const query = filter.trim().toLowerCase();
        const visible = activeConnections.filter((profile) =>
            [profile.username, profile.country, profile.bio]
                .some((value) => String(value || "").toLowerCase().includes(query))
        );
        modalList.innerHTML = visible.map((profile) => `
            <article class="connection-card" data-profile-username="${escapeHtml(profile.username)}">
                <img class="connection-avatar" src="${escapeHtml(profile.avatar_url || "../assets/avatar.png")}" alt="${escapeHtml(profile.username)}">
                <div class="connection-user-info">
                    <strong>${escapeHtml(profile.username)}</strong>
                    <span>@${escapeHtml(profile.username)}</span>
                    ${profile.country ? `<small>📍 ${escapeHtml(profile.country)}</small>` : ""}
                </div>
                <a class="connection-follow-btn" href="user-profile.html?username=${encodeURIComponent(profile.username)}">View profile</a>
            </article>
        `).join("");
        if (modalEmpty) modalEmpty.hidden = visible.length > 0;
        if (modalEmptyTitle) modalEmptyTitle.textContent = query ? "No matching users" : "No connections yet";
        if (modalEmptyText) modalEmptyText.textContent = query
            ? "Try a different search term."
            : "New community connections will appear here.";
    }

    async function openConnections(type, event) {
        event?.preventDefault();
        event?.stopPropagation();
        event?.stopImmediatePropagation();
        if (!targetProfile || !modal) return;
        modal.hidden = false;
        modal.classList.add("is-open");
        document.body.classList.add("modal-open");
        if (modalTitle) modalTitle.textContent = type === "followers" ? "Followers" : "Following";
        if (modalSubtitle) modalSubtitle.textContent = `Loading ${type}…`;
        if (modalList) modalList.innerHTML = "";
        if (modalEmpty) modalEmpty.hidden = true;
        try {
            activeConnections = await fetchConnectionProfiles(type);
            if (modalSubtitle) modalSubtitle.textContent = `${activeConnections.length} ${type}`;
            if (searchInput) searchInput.value = "";
            renderConnections();
        } catch (error) {
            console.error("ThePetGrid connections error:", error);
            if (modalSubtitle) modalSubtitle.textContent = "Could not load connections";
            activeConnections = [];
            renderConnections();
        }
    }

    function closeConnections(event) {
        event?.preventDefault();
        event?.stopPropagation();
        event?.stopImmediatePropagation();
        if (!modal) return;
        modal.hidden = true;
        modal.classList.remove("is-open");
        document.body.classList.remove("modal-open");
    }

    async function init() {
        client = window.ThePetGridSupabase?.client;
        if (!client) return;
        const username = usernameFromUrl();
        if (!username) return;

        const [{ data: authData }, profileResult] = await Promise.all([
            client.auth.getUser(),
            client.from("profiles")
                .select("id, username, avatar_url, bio, country")
                .ilike("username", username)
                .maybeSingle()
        ]);
        if (profileResult.error) {
            console.error("ThePetGrid target profile error:", profileResult.error);
            return;
        }
        currentUser = authData?.user || null;
        targetProfile = profileResult.data || null;
        if (!targetProfile) return;

        await Promise.all([refreshCounts(), refreshFollowingState()]);
    }

    followButton?.addEventListener("click", toggleFollow, true);
    followersButton?.addEventListener("click", (event) => openConnections("followers", event), true);
    followingButton?.addEventListener("click", (event) => openConnections("following", event), true);
    closeModalButton?.addEventListener("click", closeConnections, true);
    modal?.addEventListener("click", (event) => {
        if (event.target === modal) closeConnections(event);
    }, true);
    searchInput?.addEventListener("input", () => renderConnections(searchInput.value));

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
