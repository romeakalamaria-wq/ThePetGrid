(() => {
  "use strict";

  const isPagesDirectory = /\/pages\//.test(window.location.pathname);
  const atlasHref = isPagesDirectory ? "world-experience.html" : "pages/world-experience.html";

  document.body.classList.add("atlas-shell");

  function ensureAtlasNavLink() {
    const nav = document.querySelector(".main-nav");
    if (!nav || nav.querySelector('[data-atlas-nav]')) return;

    const link = document.createElement("a");
    link.href = atlasHref;
    link.dataset.atlasNav = "true";
    link.innerHTML = "<span aria-hidden=\"true\">🌍</span> Atlas";
    nav.prepend(link);
  }

  function ensureReturnButton() {
    if (document.querySelector(".atlas-return")) return;
    const link = document.createElement("a");
    link.className = "atlas-return";
    link.href = atlasHref;
    link.setAttribute("aria-label", "Return to Atlas");
    link.innerHTML = `
      <span class="atlas-return__globe" aria-hidden="true">🌍</span>
      <span class="atlas-return__copy"><small>One living world</small><strong>Return to Atlas</strong></span>
    `;
    document.body.append(link);
  }

  function ensureTransition() {
    let overlay = document.querySelector(".atlas-transition");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "atlas-transition";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="atlas-transition__content">
        <div class="atlas-transition__orbit"><span aria-hidden="true">🐾</span></div>
        <small>THEPETGRID · ATLAS</small>
        <strong id="atlasTransitionText">Travelling through the living world…</strong>
      </div>
    `;
    document.body.append(overlay);
    return overlay;
  }

  function transitionLabel(anchor) {
    const href = anchor.getAttribute("href") || "";
    const text = anchor.textContent.trim();
    if (/world-experience/.test(href)) return "Returning to Atlas…";
    if (/pet\.html/.test(href)) return "Opening a living story…";
    if (/pets\.html/.test(href)) return "Exploring the living world…";
    if (/community\.html/.test(href)) return "Entering the community…";
    if (/messages\.html/.test(href)) return "Connecting to the Signal Center…";
    if (/lost-found\.html/.test(href)) return "Opening the rescue network…";
    return text ? `Opening ${text}…` : "Travelling through ThePetGrid…";
  }

  function shouldTransition(event, anchor) {
    if (event.defaultPrevented || event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return false;

    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    if (url.pathname === window.location.pathname && url.hash) return false;
    return /\.html$/.test(url.pathname) || url.pathname.endsWith("/");
  }

  function bindTransitions() {
    const overlay = ensureTransition();
    document.addEventListener("click", (event) => {
      const anchor = event.target.closest("a[href]");
      if (!shouldTransition(event, anchor)) return;

      event.preventDefault();
      const target = anchor.href;
      const label = overlay.querySelector("#atlasTransitionText");
      if (label) label.textContent = transitionLabel(anchor);
      overlay.classList.add("is-active");
      overlay.setAttribute("aria-hidden", "false");
      window.setTimeout(() => { window.location.href = target; }, 360);
    });

    window.addEventListener("pageshow", () => {
      overlay.classList.remove("is-active");
      overlay.setAttribute("aria-hidden", "true");
    });
  }

  ensureAtlasNavLink();

const isMessagesPage = /\/messages\.html$/i.test(window.location.pathname);

if (!isMessagesPage || window.innerWidth > 720) {
  ensureReturnButton();
}

bindTransitions();
})();
