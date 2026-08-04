(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);

  const els = {
    gate: $("#moderationGate"),
    app: $("#moderationApp"),
    list: $("#reportsList"),
    empty: $("#reportsEmpty"),
    summary: $("#resultsSummary"),
    status: $("#moderationStatus"),
    refresh: $("#refreshReportsButton"),
    search: $("#reportSearch"),
    statusFilter: $("#statusFilter"),
    typeFilter: $("#typeFilter"),
    reasonFilter: $("#reasonFilter"),
    sort: $("#sortFilter"),
    clear: $("#clearFiltersButton"),
    modal: $("#reportModal"),
    modalDetails: $("#reportModalDetails"),
    modalTitle: $("#reportModalTitle"),
    form: $("#reportDecisionForm"),
    reportId: $("#decisionReportId"),
    decision: $("#decisionStatus"),
    notes: $("#moderatorNotes"),
    notesCounter: $("#notesCounter"),
    save: $("#saveDecisionButton"),

    counts: {
      open: $("#openCount"),
      reviewing: $("#reviewingCount"),
      resolved: $("#resolvedCount"),
      dismissed: $("#dismissedCount"),
      total: $("#totalCount")
    }
  };

  const state = {
    client: null,
    user: null,
    reports: [],
    filtered: [],
    current: null,
    loading: false
  };

  const safe = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const fmt = (value) =>
    new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));

  const labelProfile = (profile) =>
    profile?.display_name ||
    profile?.username ||
    "Unknown member";

  const priority = (report) => {
    if (["unsafe", "scam", "harassment"].includes(report.reason)) {
      return "high";
    }

    if (report.reason === "spam") {
      return "medium";
    }

    return "normal";
  };

  function setStatus(message, type = "") {
    if (!els.status) {
      return;
    }

    els.status.textContent = message;
    els.status.dataset.type = type;
  }

  function hideAccessGate() {
    if (!els.gate) {
      return;
    }

    els.gate.hidden = true;
    els.gate.style.display = "none";
    els.gate.setAttribute("aria-hidden", "true");
  }

  function showModerationApp() {
    if (!els.app) {
      return;
    }

    els.app.hidden = false;
    els.app.style.display = "";
    els.app.removeAttribute("aria-hidden");
  }

  function deny(title, message) {
    if (!els.gate) {
      return;
    }

    els.gate.hidden = false;
    els.gate.style.display = "";
    els.gate.removeAttribute("aria-hidden");
    els.gate.classList.add("access-denied");

    els.gate.innerHTML = `
      <h1>${safe(title)}</h1>
      <p>${safe(message)}</p>
      <p>
        <a href="../index.html">
          Return to ThePetGrid
        </a>
      </p>
    `;

    if (els.app) {
      els.app.hidden = true;
      els.app.style.display = "none";
    }
  }

  async function requireAdmin() {
    if (!state.client) {
      deny(
        "Supabase is not configured",
        "Add the project URL and publishable key before opening the Moderation Center."
      );

      return false;
    }

    if (window.ThePetGridAuth?.ready) {
      await window.ThePetGridAuth.ready;
    }

    const {
      data: { user },
      error
    } = await state.client.auth.getUser();

    if (error || !user) {
      location.href =
        "login.html?returnTo=" +
        encodeURIComponent("admin-moderation.html");

      return false;
    }

    state.user = user;

    const {
      data,
      error: adminError
    } = await state.client.rpc("is_admin");

    if (adminError || data !== true) {
      deny(
        "Access denied",
        "This page is available only to approved ThePetGrid administrators."
      );

      return false;
    }

    hideAccessGate();
    showModerationApp();

    return true;
  }

  async function loadReports() {
    if (state.loading) {
      return;
    }

    state.loading = true;

    if (els.refresh) {
      els.refresh.disabled = true;
    }

    setStatus("Loading moderation queue…");

    try {
      const { data, error } = await state.client
        .from("content_reports")
        .select(`
          id,
          reporter_id,
          reported_user_id,
          content_type,
          content_id,
          reason,
          details,
          status,
          moderator_notes,
          reviewed_by,
          reviewed_at,
          created_at,
          reporter:profiles!content_reports_reporter_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          ),
          reported:profiles!content_reports_reported_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          ),
          reviewer:profiles!content_reports_reviewed_by_fkey(
            id,
            username,
            display_name
          )
        `)
        .order("created_at", {
          ascending: false
        })
        .limit(500);

      if (error) {
        throw error;
      }

      state.reports = data || [];

      renderCounts();
      applyFilters();

      setStatus(
        `Queue updated ${new Intl.DateTimeFormat("en-GB", {
          timeStyle: "short"
        }).format(new Date())}.`
      );
    } catch (error) {
      console.error(
        "ThePetGrid moderation reports error:",
        error
      );

      setStatus(
        error.message || "Reports could not be loaded.",
        "error"
      );

      if (els.list) {
        els.list.innerHTML = `
          <div class="reports-empty">
            <h2>Could not load reports</h2>
            <p>
              ${safe(
                error.message ||
                "Check the Moderation Center SQL and RLS policies."
              )}
            </p>
          </div>
        `;
      }
    } finally {
      state.loading = false;

      if (els.refresh) {
        els.refresh.disabled = false;
      }
    }
  }

  function renderCounts() {
    const count = (status) =>
      state.reports.filter(
        (report) => report.status === status
      ).length;

    if (els.counts.open) {
      els.counts.open.textContent = count("open");
    }

    if (els.counts.reviewing) {
      els.counts.reviewing.textContent =
        count("reviewing");
    }

    if (els.counts.resolved) {
      els.counts.resolved.textContent =
        count("resolved");
    }

    if (els.counts.dismissed) {
      els.counts.dismissed.textContent =
        count("dismissed");
    }

    if (els.counts.total) {
      els.counts.total.textContent =
        state.reports.length;
    }
  }

  function applyFilters() {
    const query =
      els.search?.value.trim().toLowerCase() || "";

    const status =
      els.statusFilter?.value || "all";

    const type =
      els.typeFilter?.value || "all";

    const reason =
      els.reasonFilter?.value || "all";

    state.filtered = state.reports.filter(
      (report) => {
        const haystack = [
          report.content_id,
          report.details,
          report.reason,
          report.content_type,
          report.status,
          report.reporter?.username,
          report.reporter?.display_name,
          report.reported?.username,
          report.reported?.display_name
        ]
          .join(" ")
          .toLowerCase();

        return (
          (!query || haystack.includes(query)) &&
          (status === "all" ||
            report.status === status) &&
          (type === "all" ||
            report.content_type === type) &&
          (reason === "all" ||
            report.reason === reason)
        );
      }
    );

    const weight = {
      unsafe: 0,
      scam: 1,
      harassment: 2,
      spam: 3,
      other: 4
    };

    const sortValue =
      els.sort?.value || "newest";

    state.filtered.sort((a, b) => {
      if (sortValue === "oldest") {
        return (
          new Date(a.created_at) -
          new Date(b.created_at)
        );
      }

      if (sortValue === "priority") {
        return (
          (weight[a.reason] ?? 99) -
            (weight[b.reason] ?? 99) ||
          new Date(b.created_at) -
            new Date(a.created_at)
        );
      }

      return (
        new Date(b.created_at) -
        new Date(a.created_at)
      );
    });

    renderReports();
  }

  function renderReports() {
    if (els.summary) {
      els.summary.textContent =
        `Showing ${state.filtered.length} of ` +
        `${state.reports.length} reports`;
    }

    if (els.empty) {
      els.empty.hidden =
        state.filtered.length > 0;
    }

    if (!els.list) {
      return;
    }

    els.list.innerHTML = state.filtered
      .map((report) => {
        const reportedLabel =
          labelProfile(report.reported) ||
          report.content_type;

        return `
          <article
            class="report-card"
            data-report-id="${safe(report.id)}"
            data-priority="${priority(report)}"
          >
            <div>
              <div class="report-card__top">
                <span
                  class="status-badge status-${safe(
                    report.status
                  )}"
                >
                  ${safe(report.status)}
                </span>

                <span class="type-badge">
                  ${safe(report.content_type)}
                </span>

                <span class="reason-badge">
                  ${safe(report.reason)}
                </span>
              </div>

              <h2>
                ${safe(
                  labelProfile(report.reporter)
                )}
                reported
                ${safe(reportedLabel)}
              </h2>

              <p>
                <strong>Content ID:</strong>
                ${safe(report.content_id)}
              </p>

              <p class="report-card__details">
                ${safe(
                  report.details ||
                  "No additional details supplied."
                )}
              </p>

              <div class="report-card__meta">
                <span>
                  Submitted ${fmt(report.created_at)}
                </span>

                ${
                  report.reviewed_at
                    ? `
                      <span>
                        Reviewed ${fmt(
                          report.reviewed_at
                        )}
                      </span>
                    `
                    : ""
                }

                ${
                  report.reviewer
                    ? `
                      <span>
                        By ${safe(
                          labelProfile(
                            report.reviewer
                          )
                        )}
                      </span>
                    `
                    : ""
                }
              </div>
            </div>

            <button
              class="review-button"
              type="button"
              data-review-report="${safe(report.id)}"
            >
              Review
            </button>
          </article>
        `;
      })
      .join("");
  }

  function openModal(id) {
    const report = state.reports.find(
      (item) => item.id === id
    );

    if (!report) {
      return;
    }

    state.current = report;

    if (els.reportId) {
      els.reportId.value = report.id;
    }

    if (els.decision) {
      els.decision.value = report.status;
    }

    if (els.notes) {
      els.notes.value =
        report.moderator_notes || "";
    }

    if (els.notesCounter) {
      els.notesCounter.textContent =
        els.notes?.value.length || 0;
    }

    if (els.modalTitle) {
      els.modalTitle.textContent =
        `Review ${report.content_type} report`;
    }

    if (els.modalDetails) {
      els.modalDetails.innerHTML = `
        <div>
          <strong>Reporter:</strong>
          ${safe(labelProfile(report.reporter))}
          ${
            report.reporter?.username
              ? `(@${safe(
                  report.reporter.username
                )})`
              : ""
          }
        </div>

        <div>
          <strong>Reported member:</strong>
          ${safe(labelProfile(report.reported))}
          ${
            report.reported?.username
              ? `(@${safe(
                  report.reported.username
                )})`
              : ""
          }
        </div>

        <div>
          <strong>Reason:</strong>
          ${safe(report.reason)}
        </div>

        <div>
          <strong>Content ID:</strong>
          ${safe(report.content_id)}
        </div>

        <div>
          <strong>Submitted:</strong>
          ${fmt(report.created_at)}
        </div>

        <div>
          <strong>Details:</strong>
          ${safe(report.details || "No details")}
        </div>
      `;
    }

    if (els.modal) {
      els.modal.hidden = false;
    }

    document.body.style.overflow = "hidden";

    els.decision?.focus();
  }

  function closeModal() {
    if (els.modal) {
      els.modal.hidden = true;
    }

    document.body.style.overflow = "";
    state.current = null;
  }

  async function saveDecision(event) {
    event.preventDefault();

    if (!state.current) {
      return;
    }

    const next =
      els.decision?.value || "open";

    const notes =
      els.notes?.value.trim() || "";

    if (
      ["resolved", "dismissed"].includes(next) &&
      notes.length < 5
    ) {
      setStatus(
        "Add a short moderator note before closing a report.",
        "error"
      );

      els.notes?.focus();

      return;
    }

    if (els.save) {
      els.save.disabled = true;
    }

    try {
      const payload = {
        status: next,
        moderator_notes: notes,
        reviewed_by: state.user.id,
        reviewed_at: new Date().toISOString()
      };

      const { error } = await state.client
        .from("content_reports")
        .update(payload)
        .eq("id", state.current.id);

      if (error) {
        throw error;
      }

      closeModal();
      await loadReports();

      setStatus(
        `Report marked as ${next}.`
      );
    } catch (error) {
      console.error(
        "ThePetGrid moderation decision error:",
        error
      );

      setStatus(
        error.message ||
          "Decision could not be saved.",
        "error"
      );
    } finally {
      if (els.save) {
        els.save.disabled = false;
      }
    }
  }

  function bind() {
    const filterElements = [
      els.search,
      els.statusFilter,
      els.typeFilter,
      els.reasonFilter,
      els.sort
    ].filter(Boolean);

    filterElements.forEach((element) => {
      element.addEventListener(
        element === els.search
          ? "input"
          : "change",
        applyFilters
      );
    });

    els.clear?.addEventListener(
      "click",
      () => {
        if (els.search) {
          els.search.value = "";
        }

        if (els.statusFilter) {
          els.statusFilter.value = "all";
        }

        if (els.typeFilter) {
          els.typeFilter.value = "all";
        }

        if (els.reasonFilter) {
          els.reasonFilter.value = "all";
        }

        if (els.sort) {
          els.sort.value = "newest";
        }

        applyFilters();
      }
    );

    els.refresh?.addEventListener(
      "click",
      loadReports
    );

    els.list?.addEventListener(
      "click",
      (event) => {
        const button = event.target.closest(
          "[data-review-report]"
        );

        if (button) {
          openModal(
            button.dataset.reviewReport
          );
        }
      }
    );

    document
      .querySelectorAll(
        "[data-close-report-modal]"
      )
      .forEach((element) => {
        element.addEventListener(
          "click",
          closeModal
        );
      });

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          els.modal &&
          !els.modal.hidden
        ) {
          closeModal();
        }
      }
    );

    els.notes?.addEventListener(
      "input",
      () => {
        if (els.notesCounter) {
          els.notesCounter.textContent =
            els.notes.value.length;
        }
      }
    );

    els.form?.addEventListener(
      "submit",
      saveDecision
    );
  }

  async function init() {
    state.client =
      window.ThePetGridSupabase?.client ||
      null;

    bind();

    const adminAllowed =
      await requireAdmin();

    if (!adminAllowed) {
      return;
    }

    await loadReports();
  }

  init().catch((error) => {
    console.error(
      "ThePetGrid Moderation Center error:",
      error
    );

    deny(
      "Moderation Center unavailable",
      error.message ||
        "An unexpected error occurred."
    );
  });
})();