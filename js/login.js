document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const form = document.querySelector("#authForm");
  const message = document.querySelector("#authMessage");
  const title = document.querySelector("#authTitle");
  const intro = document.querySelector("#authIntro");
  const submitButton = document.querySelector("#authSubmit");
  const modeButtons = document.querySelectorAll("[data-auth-mode]");
  const usernameField = document.querySelector("#usernameField");
  const emailField = document.querySelector("#emailField");
  const authNote = document.querySelector(".auth-note");
  const forgotButton = document.querySelector("#forgotPasswordButton");
  const forgotForm = document.querySelector("#forgotPasswordForm");
  const forgotSubmit = document.querySelector("#forgotPasswordSubmit");
  const backToLogin = document.querySelector("#backToLoginButton");

  if (!form || !message || !submitButton || !window.ThePetGridAuth) {
    console.error("ThePetGrid: login page is missing required elements.");
    return;
  }

  await window.ThePetGridAuth.ready;

  const client = window.ThePetGridSupabase?.client || null;
  let mode = "login";
  let busy = false;

  authNote.textContent = client
    ? "Secure authentication powered by Supabase."
    : "Supabase is not configured. Authentication is unavailable.";

  function showMessage(text, type = "success") {
    message.textContent = text;
    message.className = `auth-message auth-message--${type}`;
    message.hidden = false;
  }

  function hideMessage() {
    message.hidden = true;
    message.textContent = "";
  }

  function setBusy(value) {
    busy = value;
    submitButton.disabled = value;
    modeButtons.forEach((button) => { button.disabled = value; });
    submitButton.textContent = value
      ? (mode === "register" ? "Creating account..." : "Logging in...")
      : (mode === "register" ? "Create Account" : "Log In");
  }

  function setMode(nextMode) {
    if (busy) return;
    mode = nextMode === "register" ? "register" : "login";
    form.hidden = false;
    forgotForm.hidden = true;
    document.querySelector(".auth-tabs").hidden = false;
    const registering = mode === "register";

    title.textContent = registering ? "Create your account" : "Welcome back";
    intro.textContent = registering
      ? "Join ThePetGrid and create a profile for your pets."
      : "Log in to manage your pets and community activity.";
    submitButton.textContent = registering ? "Create Account" : "Log In";
    usernameField.hidden = false;
    emailField.hidden = !registering;
    form.elements.username.required = true;
    form.elements.email.required = registering;
    form.elements.password.autocomplete = registering
      ? "new-password"
      : "current-password";
    hideMessage();

    modeButtons.forEach((button) => {
      const active = button.dataset.authMode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
  }

  const initialParams = new URLSearchParams(window.location.search);
  if (initialParams.get("mode") === "register") {
    setMode("register");
  }

  function redirectAfterLogin() {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("returnTo");
    const isSafe = requested &&
      !requested.includes(":") &&
      !requested.startsWith("//") &&
      !requested.startsWith("/");

    window.location.replace(isSafe ? requested : "my-profile.html");
  }

  function friendlyError(error) {
    const raw = String(error?.message || "").toLowerCase();
    if (raw.includes("invalid login credentials")) {
      return "Incorrect username or password.";
    }
    if (raw.includes("email not confirmed")) {
      return "Your email is not confirmed yet. Open the Supabase confirmation email first.";
    }
    if (raw.includes("user already registered")) {
      return "This email is already registered. Use Log In instead.";
    }
    if (raw.includes("password")) return error.message;
    if (raw.includes("rate limit")) {
      return "Too many attempts. Wait a moment and try again.";
    }
    return error?.message || "Authentication failed. Please try again.";
  }

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.authMode));
  });

  forgotButton?.addEventListener("click", () => {
    if (busy) return;
    hideMessage();
    form.hidden = true;
    forgotForm.hidden = false;
    document.querySelector(".auth-tabs").hidden = true;
    title.textContent = "Reset your password";
    intro.textContent = "Enter your account email and we will send you a secure reset link.";
    forgotForm.elements.resetEmail.value = form.elements.email.value.trim();
    forgotForm.elements.resetEmail.focus();
  });

  backToLogin?.addEventListener("click", () => setMode("login"));

  forgotForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !client) return;
    hideMessage();
    const email = forgotForm.elements.resetEmail.value.trim().toLowerCase();
    if (!email) {
      showMessage("Enter the email used for your account.", "error");
      return;
    }
    busy = true;
    forgotSubmit.disabled = true;
    forgotSubmit.textContent = "Sending…";
    try {
      const redirectTo = new URL("reset-password.html", window.location.href).href;
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      showMessage("Reset email sent. Open the link in your email to choose a new password.");
    } catch (error) {
      showMessage(friendlyError(error), "error");
    } finally {
      busy = false;
      forgotSubmit.disabled = false;
      forgotSubmit.textContent = "Send reset link";
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    hideMessage();

    if (!client) {
      showMessage("Supabase did not load. Check the internet connection and configuration.", "error");
      return;
    }

    const email = form.elements.email.value.trim().toLowerCase();
    const password = form.elements.password.value;
    const username = form.elements.username.value.trim();

    if (mode === "register" && !email) {
      showMessage("Enter your email.", "error");
      return;
    }
    if (password.length < 6) {
      showMessage("Password must contain at least 6 characters.", "error");
      return;
    }
    if (username.length < 2) {
      showMessage("Username must contain at least 2 characters.", "error");
      return;
    }

    setBusy(true);

    try {
      if (mode === "register") {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { data: { username } }
        });
        if (error) throw error;

        if (data.session && data.user) {
          window.ThePetGridAuth.setCurrentUser(data.user);
          showMessage("Account created. You are now logged in.");
          window.setTimeout(redirectAfterLogin, 500);
        } else {
          showMessage(
            "Account created. Check your email and click the confirmation link, then return here and log in."
          );
          setMode("login");
          form.elements.email.value = email;
        }
        return;
      }

      const response = await fetch("/api/username-login", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ username, password })
      });
      const loginData = await response.json().catch(() => ({}));
      if (!response.ok || !loginData.access_token || !loginData.refresh_token) {
        throw new Error(loginData.message || "Invalid login credentials");
      }
      const { data, error } = await client.auth.setSession({
        access_token: loginData.access_token,
        refresh_token: loginData.refresh_token
      });
      if (error) throw error;
      if (!data.user || !data.session) {
        throw new Error("Login did not create a session.");
      }

      window.ThePetGridAuth.setCurrentUser(data.user);
      showMessage(`Welcome back, ${data.user.user_metadata?.username || data.user.email?.split("@")[0] || "Member"}!`);
      window.setTimeout(redirectAfterLogin, 450);
    } catch (error) {
      console.error("ThePetGrid authentication error:", error);
      showMessage(friendlyError(error), "error");
    } finally {
      setBusy(false);
    }
  });

  const existingUser = window.ThePetGridAuth.getCurrentUser();
  if (existingUser) {
    showMessage(`You are already logged in as ${existingUser.username}.`);
  }

  setMode("login");
  if (new URLSearchParams(window.location.search).get("passwordReset") === "success") {
    showMessage("Your password was changed successfully. You can now log in.");
  }
});
