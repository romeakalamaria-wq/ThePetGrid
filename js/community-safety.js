(() => {
  "use strict";

  const state = { client: null, user: null, blockedIds: new Set(), blockedUsernames: new Set(), blockedProfiles: [] };

  async function authUser() {
    if (window.ThePetGridAuth?.ready) await window.ThePetGridAuth.ready;
    return window.ThePetGridAuth?.getCurrentUser?.() || null;
  }

  async function profileByUsername(username) {
    const value = String(username || "").replace(/^@/, "").trim();
    if (!value || !state.client) return null;
    const { data, error } = await state.client.from("profiles")
      .select("id,username,display_name,avatar_url")
      .ilike("username", value).maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function refresh() {
    state.blockedIds.clear(); state.blockedUsernames.clear(); state.blockedProfiles = [];
    if (!state.client || !state.user?.id) return;
    const { data, error } = await state.client.from("user_blocks")
      .select("blocked_id, profiles!user_blocks_blocked_id_fkey(username)")
      .eq("blocker_id", state.user.id);
    if (error) { console.warn("Blocked users could not be loaded.", error); return; }
    (data || []).forEach(row => {
      state.blockedIds.add(String(row.blocked_id));
      if (row.profiles?.username) state.blockedUsernames.add(String(row.profiles.username).toLowerCase());
      state.blockedProfiles.push({ id: row.blocked_id, username: row.profiles?.username || "Member" });
    });
    window.dispatchEvent(new CustomEvent("thepetgrid:safety-change"));
  }

  async function requireLogin() {
    if (state.user?.id) return true;
    window.alert("Please log in first.");
    return false;
  }

  async function blockByUsername(username) {
    if (!await requireLogin()) return false;
    const target = await profileByUsername(username);
    if (!target || target.id === state.user.id) throw new Error("This member cannot be blocked.");
    if (!window.confirm(`Block @${target.username}? Their posts and conversations will be hidden.`)) return false;
    const { error } = await state.client.from("user_blocks").upsert({ blocker_id: state.user.id, blocked_id: target.id });
    if (error) throw error;
    await refresh();
    return true;
  }

  async function unblock(userId) {
    if (!await requireLogin()) return false;
    const { error } = await state.client.from("user_blocks").delete()
      .eq("blocker_id", state.user.id).eq("blocked_id", userId);
    if (error) throw error;
    await refresh();
    return true;
  }

  async function createReport({ username, type, contentId }) {
    if (!await requireLogin()) return false;
    const target = username ? await profileByUsername(username) : null;
    const reason = window.prompt("Reason: spam, harassment, scam, unsafe, or other", "spam");
    if (reason === null) return false;
    const normalized = String(reason).trim().toLowerCase();
    if (!["spam", "harassment", "scam", "unsafe", "other"].includes(normalized)) {
      window.alert("Please use: spam, harassment, scam, unsafe, or other."); return false;
    }
    const details = window.prompt("Optional details (do not include private information):", "") ?? "";
    const { error } = await state.client.from("content_reports").insert({
      reporter_id: state.user.id,
      reported_user_id: target?.id || null,
      content_type: type,
      content_id: String(contentId || target?.id || username || "unknown"),
      reason: normalized,
      details: String(details).slice(0, 1000)
    });
    if (error?.code === "23505") { window.alert("You have already reported this item."); return false; }
    if (error) throw error;
    window.alert("Thank you. Your report was submitted for review.");
    return true;
  }

  async function initialize() {
    state.client = window.ThePetGridSupabase?.client || null;
    state.user = await authUser();
    await refresh();
    return true;
  }

  const api = {
    ready: null,
    refresh,
    blockByUsername,
    unblock,
    reportUser: username => createReport({ username, type: "user", contentId: username }),
    reportPost: (postId, username) => createReport({ username, type: "post", contentId: postId }),
    isBlockedId: id => state.blockedIds.has(String(id)),
    isBlockedUsername: username => state.blockedUsernames.has(String(username || "").toLowerCase()),
    blockedIds: () => new Set(state.blockedIds),
    blockedUsernames: () => new Set(state.blockedUsernames),
    blockedProfiles: () => state.blockedProfiles.map(profile => ({ ...profile }))
  };
  api.ready = initialize();
  window.ThePetGridSafety = api;
})();
