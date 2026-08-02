document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const navigation = document.querySelector(".main-nav");

  if (!navigation) return;

  // Memorials is installed globally so it appears on every page that uses
  // the shared header, including older pages whose HTML predates Sprint 10.
  if (!navigation.querySelector('[href$="memorials.html"]')) {
    const memorialLink = document.createElement("a");
    memorialLink.href = location.pathname.includes("/pages/")
      ? "memorials.html"
      : "pages/memorials.html";
    memorialLink.textContent = "Memorials";
    memorialLink.className = "memorials-nav-link";

    const messagesLink = [...navigation.querySelectorAll("a")]
      .find(link => (link.getAttribute("href") || "").endsWith("messages.html"));
    if (messagesLink) messagesLink.insertAdjacentElement("afterend", memorialLink);
    else navigation.appendChild(memorialLink);
  }

  if (toggle) {
    toggle.addEventListener("click", () => {
      const isOpen = navigation.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  const current = location.pathname.split("/").pop() || "index.html";
  navigation.querySelectorAll("a").forEach(link => {
    const target = (link.getAttribute("href") || "").split("/").pop();
    link.classList.toggle("active", target === current);
  });
});
