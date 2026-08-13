(() => {
  "use strict";

  const form = document.getElementById("betaFeedbackForm");
  const page = document.getElementById("betaFeedbackPage");
  const description = document.getElementById("betaFeedbackDescription");
  const device = document.getElementById("betaFeedbackDevice");
  const counter = document.getElementById("betaFeedbackCounter");
  const status = document.getElementById("betaFeedbackStatus");
  const submit = document.getElementById("betaFeedbackSubmit");
  const userLabel = document.getElementById("betaFeedbackUser");
  const autoPage = document.getElementById("betaFeedbackAutoPage");

  if (!form) return;

  function setStatus(message, type = "") {
    status.textContent = message;
    status.className = `beta-feedback-status${type ? ` is-${type}` : ""}`;
  }

  function currentUser() {
    return window.ThePetGridAuth?.getCurrentUser?.() || null;
  }

  function updateUserLabel() {
    const user = currentUser();
    userLabel.textContent = user
      ? `Signed in as @${user.username || "member"}`
      : "Not signed in";
  }

  function autoDeviceValue() {
    const width = window.innerWidth;
    const viewport = `${width}×${window.innerHeight}`;
    const platform = navigator.userAgentData?.platform || navigator.platform || "";
    return [platform, viewport].filter(Boolean).join(" · ");
  }

  async function submitFeedback(event) {
    event.preventDefault();

    const client = window.ThePetGridSupabase?.client;
    const user = currentUser();

    if (!client) {
      setStatus("Feedback service is temporarily unavailable.", "error");
      return;
    }

    const type =
      form.querySelector('input[name="feedbackType"]:checked')?.value || "bug";

    const payload = {
      user_id: user?.id || null,
      username: user?.username || null,
      feedback_type: type,
      page_name: page.value,
      description: description.value.trim(),
      device_info: device.value.trim() || autoDeviceValue(),
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      status: "new"
    };

    if (!payload.page_name || payload.description.length < 3) {
      setStatus("Choose a page and add a short description.", "error");
      return;
    }

    submit.disabled = true;
    submit.textContent = "Sending…";
    setStatus("");

    try {
      const { error } = await client
        .from("beta_feedback")
        .insert(payload);

      if (error) throw error;

      form.reset();
      form.querySelector('input[value="bug"]').checked = true;
      counter.textContent = "0";
      setStatus("✅ Thank you. Your feedback was sent.", "success");
    } catch (error) {
      console.error("ThePetGrid beta feedback:", error);
      setStatus(
        error?.message || "The feedback could not be sent.",
        "error"
      );
    } finally {
      submit.disabled = false;
      submit.textContent = "Send Feedback";
    }
  }

  description.addEventListener("input", () => {
    counter.textContent = String(description.value.length);
  });

  form.addEventListener("submit", submitFeedback);

  autoPage.textContent =
    `Feedback form: ${location.pathname.split("/").pop() || "beta-feedback.html"}`;

  device.value = autoDeviceValue();

  if (window.ThePetGridAuth?.ready) {
    window.ThePetGridAuth.ready.then(updateUserLabel);
  } else {
    updateUserLabel();
  }

  window.addEventListener("thepetgrid:auth-changed", updateUserLabel);
})();
