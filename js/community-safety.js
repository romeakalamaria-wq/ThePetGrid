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

  function ensureReportModal() {
    let modal = document.getElementById("tpgSafetyReportModal");
    if (modal) return modal;

    const style = document.createElement("style");
    style.textContent = `
      .tpg-report-modal[hidden]{display:none!important}
      .tpg-report-modal{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:20px}
      .tpg-report-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.62);backdrop-filter:blur(5px)}
      .tpg-report-card{position:relative;width:min(520px,100%);max-height:90vh;overflow:auto;box-sizing:border-box;background:#fff;border:1px solid rgba(226,232,240,.9);border-radius:24px;padding:28px;box-shadow:0 28px 80px rgba(15,23,42,.3)}
      .tpg-report-close{position:absolute;right:16px;top:16px;width:38px;height:38px;border:0;border-radius:50%;background:#f1f5f9;color:#334155;font-size:24px;line-height:1;cursor:pointer}
      .tpg-report-kicker{display:block;margin-bottom:7px;color:#d97706;font-size:12px;font-weight:900;letter-spacing:.12em}
      .tpg-report-title{margin:0 48px 7px 0;color:#172033;font-size:26px;line-height:1.15}
      .tpg-report-copy{margin:0 0 20px;color:#64748b;line-height:1.5}
      .tpg-report-reasons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:19px}
      .tpg-report-option{position:relative}
      .tpg-report-option input{position:absolute;opacity:0;pointer-events:none}
      .tpg-report-option span{display:flex;align-items:center;justify-content:center;min-height:46px;box-sizing:border-box;padding:10px 12px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;color:#334155;font-weight:800;cursor:pointer;transition:.18s ease}
      .tpg-report-option input:checked+span{border-color:#f59e0b;background:#fff7ed;color:#b45309;box-shadow:0 0 0 3px rgba(245,158,11,.11)}
      .tpg-report-label{display:block;margin-bottom:7px;color:#334155;font-weight:800}
      .tpg-report-label small{font-weight:600;color:#94a3b8}
      .tpg-report-details{width:100%;min-height:96px;box-sizing:border-box;resize:vertical;border:1px solid #dbe3ee;border-radius:14px;padding:12px 14px;font:inherit;color:#1e293b;outline:none}
      .tpg-report-details:focus{border-color:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.11)}
      .tpg-report-counter{display:block;margin-top:5px;text-align:right;color:#94a3b8;font-size:12px}
      .tpg-report-note{margin:12px 0 0;color:#94a3b8;font-size:12px;line-height:1.4}
      .tpg-report-message{min-height:21px;margin:10px 0 0;font-size:14px;font-weight:800}
      .tpg-report-message.is-error{color:#be123c}
      .tpg-report-message.is-success{color:#15803d}
      .tpg-report-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}
      .tpg-report-actions button{border:0;border-radius:12px;padding:11px 18px;font-weight:900;cursor:pointer}
      .tpg-report-cancel{background:#f1f5f9;color:#475569}
      .tpg-report-submit{background:linear-gradient(135deg,#f59e0b,#f97316);color:#fff;box-shadow:0 8px 20px rgba(249,115,22,.2)}
      .tpg-report-submit:disabled{opacity:.65;cursor:wait}
      @media(max-width:560px){
        .tpg-report-card{padding:23px 18px;border-radius:20px}
        .tpg-report-reasons{grid-template-columns:1fr}
        .tpg-report-actions{flex-direction:column-reverse}
        .tpg-report-actions button{width:100%}
      }
    `;
    document.head.appendChild(style);

    modal = document.createElement("div");
    modal.id = "tpgSafetyReportModal";
    modal.className = "tpg-report-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="tpg-report-backdrop" data-report-close></div>
      <section class="tpg-report-card" role="dialog" aria-modal="true" aria-labelledby="tpgReportTitle">
        <button type="button" class="tpg-report-close" data-report-close aria-label="Close">×</button>
        <span class="tpg-report-kicker">THEPETGRID SAFETY</span>
        <h2 class="tpg-report-title" id="tpgReportTitle">Report content</h2>
        <p class="tpg-report-copy">Tell us what is wrong. Your report will be sent to the moderation team for review.</p>

        <form id="tpgReportForm">
          <div class="tpg-report-reasons">
            <label class="tpg-report-option"><input type="radio" name="tpgReportReason" value="spam" checked><span>🚫 Spam</span></label>
            <label class="tpg-report-option"><input type="radio" name="tpgReportReason" value="harassment"><span>⚠️ Harassment</span></label>
            <label class="tpg-report-option"><input type="radio" name="tpgReportReason" value="scam"><span>🛡️ Scam</span></label>
            <label class="tpg-report-option"><input type="radio" name="tpgReportReason" value="unsafe"><span>🚨 Unsafe</span></label>
            <label class="tpg-report-option"><input type="radio" name="tpgReportReason" value="other"><span>••• Other</span></label>
          </div>

          <label class="tpg-report-label" for="tpgReportDetails">Additional details <small>(optional)</small></label>
          <textarea class="tpg-report-details" id="tpgReportDetails" maxlength="1000" placeholder="Add anything that may help the moderation team…"></textarea>
          <span class="tpg-report-counter" id="tpgReportCounter">0 / 1000</span>
          <p class="tpg-report-note">Please do not include passwords, addresses, phone numbers, or other private information.</p>
          <p class="tpg-report-message" id="tpgReportMessage" aria-live="polite"></p>

          <div class="tpg-report-actions">
            <button type="button" class="tpg-report-cancel" data-report-close>Cancel</button>
            <button type="submit" class="tpg-report-submit" id="tpgReportSubmit">Submit report</button>
          </div>
        </form>
      </section>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll("[data-report-close]").forEach(button => {
      button.addEventListener("click", () => {
        modal.hidden = true;
        document.body.style.overflow = "";
      });
    });

    const details = modal.querySelector("#tpgReportDetails");
    details.addEventListener("input", () => {
      modal.querySelector("#tpgReportCounter").textContent = `${details.value.length} / 1000`;
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !modal.hidden) {
        modal.hidden = true;
        document.body.style.overflow = "";
      }
    });

    return modal;
  }

  function chooseReportReason(type) {
    const modal = ensureReportModal();
    modal.querySelector("#tpgReportTitle").textContent =
      type === "user" ? "Report member" : "Report this post";

    const form = modal.querySelector("#tpgReportForm");
    form.reset();

    const details = modal.querySelector("#tpgReportDetails");
    details.value = "";
    modal.querySelector("#tpgReportCounter").textContent = "0 / 1000";

    const message = modal.querySelector("#tpgReportMessage");
    message.textContent = "";
    message.className = "tpg-report-message";

    modal.hidden = false;
    document.body.style.overflow = "hidden";

    return new Promise(resolve => {
      let finished = false;

      const finish = value => {
        if (finished) return;
        finished = true;
        form.removeEventListener("submit", onSubmit);
        modal.querySelectorAll("[data-report-close]").forEach(button => {
          button.removeEventListener("click", onCancel);
        });
        resolve(value);
      };

      const onSubmit = event => {
        event.preventDefault();
        const reason = form.querySelector('input[name="tpgReportReason"]:checked')?.value || "other";
        finish({ reason, details: details.value.trim() });
      };

      const onCancel = () => finish(null);

      form.addEventListener("submit", onSubmit);
      modal.querySelectorAll("[data-report-close]").forEach(button => {
        button.addEventListener("click", onCancel);
      });
    });
  }

  async function createReport({ username, type, contentId }) {
    if (!await requireLogin()) return false;

    const target = username ? await profileByUsername(username) : null;
    const selection = await chooseReportReason(type);
    if (!selection) return false;

    const modal = ensureReportModal();
    const submit = modal.querySelector("#tpgReportSubmit");
    const message = modal.querySelector("#tpgReportMessage");

    submit.disabled = true;
    submit.textContent = "Submitting…";
    message.textContent = "";

    try {
      const normalized = String(selection.reason).trim().toLowerCase();

      const { error } = await state.client.from("content_reports").insert({
        reporter_id: state.user.id,
        reported_user_id: target?.id || null,
        content_type: type,
        content_id: String(contentId || target?.id || username || "unknown"),
        reason: normalized,
        details: String(selection.details || "").slice(0, 1000)
      });

      if (error?.code === "23505") {
        message.textContent = "You have already reported this item.";
        message.className = "tpg-report-message is-error";
        return false;
      }

      if (error) throw error;

      message.textContent = "Report submitted. Thank you for helping keep ThePetGrid safe.";
      message.className = "tpg-report-message is-success";

      setTimeout(() => {
        modal.hidden = true;
        document.body.style.overflow = "";
      }, 1100);

      return true;
    } catch (error) {
      message.textContent = error?.message || "The report could not be submitted.";
      message.className = "tpg-report-message is-error";
      return false;
    } finally {
      submit.disabled = false;
      submit.textContent = "Submit report";
    }
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
