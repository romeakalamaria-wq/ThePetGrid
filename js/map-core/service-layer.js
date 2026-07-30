(() => {
  "use strict";

  const labels = {
    veterinary: ["✚", "Veterinary clinic"],
    shelter: ["⌂", "Animal shelter"],
    pet_shop: ["▣", "Pet shop"],
    groomer: ["✂", "Groomer & pet service"],
    dog_park: ["♧", "Dog park"]
  };

  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);

  const safeExternalUrl = value => {
    try {
      const url = new URL(String(value || ""));
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };

  class ServiceLayer {
    constructor(map) {
      this.map = map;
      this.markers = [];
      this.markerById = new Map();
      this.elementById = new Map();
    }

    clear() {
      this.markers.forEach(marker => marker.remove());
      this.markers = [];
      this.markerById.clear();
      this.elementById.clear();
    }

    select(id, { fly = true, openPopup = true } = {}) {
      const key = String(id);
      const marker = this.markerById.get(key);
      const element = this.elementById.get(key);
      if (!marker || !element) return false;

      this.elementById.forEach(item => item.classList.remove("is-selected"));
      element.classList.add("is-selected");
      window.setTimeout(() => element.classList.remove("is-selected"), 1400);

      const coordinates = marker.getLngLat();
      if (fly) {
        this.map.easeTo({
          center: [coordinates.lng, coordinates.lat],
          zoom: Math.max(this.map.getZoom(), 16),
          duration: 650,
          essential: true
        });
      }
      if (openPopup) marker.togglePopup();
      return true;
    }

    render(services) {
      this.clear();

      services.forEach(service => {
        const [icon, label] = labels[service.type] || ["•", "Pet service"];
        const element = document.createElement("button");
        element.type = "button";
        element.className = `tpg-service-marker is-${service.type}`;
        element.innerHTML = `<span>${icon}</span>`;
        element.setAttribute("aria-label", service.tags.name || label);

        const address = service.tags.formatted || [
          service.tags.addressLine1,
          service.tags.addressLine2,
          service.tags.city,
          service.tags.country
        ].filter(Boolean).join(", ");
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

        const popup = new maplibregl.Popup({
          offset: 28,
          maxWidth: "460px",
          closeButton: true,
          closeOnClick: true,
          className: "tpg-premium-popup"
        }).setHTML(html);

        const marker = new maplibregl.Marker({ element, anchor: "bottom" })
          .setLngLat([service.lng, service.lat])
          .setPopup(popup)
          .addTo(this.map);

        const key = String(service.id);
        element.addEventListener("click", () => this.select(key, { fly: false, openPopup: false }));
        this.markers.push(marker);
        this.markerById.set(key, marker);
        this.elementById.set(key, element);
      });
    }
  }

  ServiceLayer.LABELS = labels;
  window.ThePetGridMapCore = window.ThePetGridMapCore || {};
  window.ThePetGridMapCore.ServiceLayer = ServiceLayer;
})();
