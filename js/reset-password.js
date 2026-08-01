document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  const client = window.ThePetGridSupabase?.client || null;
  const form = document.querySelector("#resetPasswordForm");
  const intro = document.querySelector("#resetIntro");
  const message = document.querySelector("#resetMessage");
  const submit = document.querySelector("#resetPasswordSubmit");
  function showMessage(text, type = "success") {
    message.textContent = text;
    message.className = `auth-message auth-message--${type}`;
    message.hidden = false;
  }
  if (!client) {
    intro.textContent = "Password recovery is currently unavailable.";
    showMessage("Supabase did not load. Check the site configuration.", "error");
    return;
  }
  let recoveryReady = false;
  const enableForm = () => {
    recoveryReady = true;
    form.hidden = false;
    intro.textContent = "Enter and confirm your new secure password.";
  };
  client.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session) enableForm();
  });
  const { data, error } = await client.auth.getSession();
  if (error) {
    intro.textContent = "This reset link could not be verified.";
    showMessage(error.message, "error");
    return;
  }
  if (data.session) enableForm();
  window.setTimeout(() => {
    if (!recoveryReady) {
      intro.textContent = "This reset link is invalid or has expired.";
      showMessage("Request a new password reset email from the Log In page.", "error");
    }
  }, 2500);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!recoveryReady || submit.disabled) return;
    message.hidden = true;
    const password = form.elements.password.value;
    const confirmation = form.elements.confirmPassword.value;
    if (password.length < 8) {
      showMessage("Password must contain at least 8 characters.", "error");
      return;
    }
    if (password !== confirmation) {
      showMessage("The two passwords do not match.", "error");
      return;
    }
    submit.disabled = true;
    submit.textContent = "Updating…";
    const { error: updateError } = await client.auth.updateUser({ password });
    if (updateError) {
      showMessage(updateError.message, "error");
      submit.disabled = false;
      submit.textContent = "Update Password";
      return;
    }
    showMessage("Password updated successfully. Returning to Log In…");
    await client.auth.signOut();
    window.setTimeout(() => window.location.replace("login.html?passwordReset=success"), 1200);
  });
});
