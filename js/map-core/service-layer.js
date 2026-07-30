(() => {
  "use strict";
  const labels = {
    veterinary: ["✚", "Veterinary clinic"], shelter: ["⌂", "Animal shelter"],
    pet_shop: ["▣", "Pet shop"], groomer: ["✂", "Groomer & pet service"], dog_park: ["♧", "Dog park"]
  };
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);
  const safeExternalUrl = value => {
    try { const url = new URL(String(value || "")); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; }
    catch { return ""; }
  };

  class ServiceLayer {
    constructor(map) { this.map = map; this.markers = []; }
    clear() { this.markers.forEach(marker => marker.remove()); this.markers = []; }
    render(services) {
      this.clear();
      services.forEach(service => {
        const [icon, label] = labels[service.type] || ["•", "Pet service"];
        const element = document.createElement("button");
        element.type = "button";
        element.className = `tpg-service-marker is-${service.type}`;
        element.innerHTML = `<span>${icon}</span>`;
        element.setAttribute("aria-label", service.tags.name || label);
        element.addEventListener("click", () => {
          element.classList.remove("is-selected");
          void element.offsetWidth;
          element.classList.add("is-selected");
          window.setTimeout(() => element.classList.remove("is-selected"), 650);
        });

        const address = service.tags.formatted || [service.tags.addressLine1, service.tags.addressLine2, service.tags.city, service.tags.country].filter(Boolean).join(", ");
        const website = safeExternalUrl(service.tags.website);
        const directionsUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(service.lat)}&mlon=${encodeURIComponent(service.lng)}#map=18/${encodeURIComponent(service.lat)}/${encodeURIComponent(service.lng)}`;
        const html = `<article class="service-popup">
          <div class="service-popup__badge ${escapeHtml(service.type)}">${icon}</div>
          <div class="service-popup__body">
            <small>${escapeHtml(label)}</small>
            <strong>${escapeHtml(service.tags.name || label)}</strong>
            ${address ? `<p>${escapeHtml(address)}</p>` : ""}
            ${service.tags.phone ? `<p class="service-popup__contact">☎ ${escapeHtml(service.tags.phone)}</p>` : ""}
            <div class="service-popup__actions">
              <a target="_blank" rel="noopener" href="${directionsUrl}">Open location</a>
              ${website ? `<a target="_blank" rel="noopener" href="${escapeHtml(website)}">Website</a>` : ""}
            </div>
          </div>
        </article>`;

        const popup = new maplibregl.Popup({ offset: 28, maxWidth: "460px", closeButton: true, closeOnClick: true, className: "tpg-premium-popup" }).setHTML(html);
        this.markers.push(new maplibregl.Marker({ element, anchor: "bottom" }).setLngLat([service.lng, service.lat]).setPopup(popup).addTo(this.map));
      });
    }
  }
  window.ThePetGridMapCore = window.ThePetGridMapCore || {};
  window.ThePetGridMapCore.ServiceLayer = ServiceLayer;
})();
