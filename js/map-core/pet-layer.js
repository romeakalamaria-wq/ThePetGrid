(() => {
  "use strict";

  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);

  class PetLayer {
    constructor(map, options = {}) {
      this.map = map;
      this.sourceId = options.sourceId || "tpg-pets";
      this.petsById = new Map();
      this.markersById = new Map();
      this.visible = true;
      this.onSelect = options.onSelect || (() => {});
      this.userLocation = null;
      this.lastData = { type: "FeatureCollection", features: [] };
      this.selectedPetId = null;
      this.eventsBound = false;
      this.restoreTimer = null;
      this.syncFrame = null;
      this.currentPopup = null;
    }

    layerIds() {
      return {
        clusters: `${this.sourceId}-clusters`,
        clusterCount: `${this.sourceId}-cluster-count`,
        points: `${this.sourceId}-unclustered-hit-area`
      };
    }

    add() {
      const ids = this.layerIds();

      if (!this.map.getSource(this.sourceId)) {
        this.map.addSource(this.sourceId, {
          type: "geojson",
          data: this.lastData,
          cluster: true,
          clusterMaxZoom: 13,
          clusterRadius: 54
        });
      }

      if (!this.map.getLayer(ids.clusters)) this.map.addLayer({
        id: ids.clusters,
        type: "circle",
        source: this.sourceId,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "#ffad28", 10, "#ff8a00", 35, "#ef6c00"],
          "circle-radius": ["step", ["get", "point_count"], 21, 10, 26, 35, 32],
          "circle-stroke-width": 5,
          "circle-stroke-color": "rgba(255,255,255,.98)",
          "circle-opacity": .98,
          "circle-blur": .02
        }
      });

      if (!this.map.getLayer(ids.clusterCount)) this.map.addLayer({
        id: ids.clusterCount,
        type: "symbol",
        source: this.sourceId,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 13,
          // The MapLibre demo glyph server no longer serves Open Sans Bold.
          // Noto Sans Regular is available and keeps cluster counters working.
          "text-font": ["Noto Sans Regular"],
          "text-allow-overlap": true
        },
        paint: { "text-color": "#ffffff" }
      });

      // Invisible MapLibre layer used only to know which pets are currently
      // unclustered. The visible pet marker itself is pure HTML/CSS.
      if (!this.map.getLayer(ids.points)) this.map.addLayer({
        id: ids.points,
        type: "circle",
        source: this.sourceId,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 20,
          "circle-color": "rgba(0,0,0,0.001)",
          "circle-stroke-width": 0
        }
      });

      this.map.getSource(this.sourceId)?.setData(this.lastData);
      this.setVisible(this.visible);
      this.scheduleMarkerSync();

      if (this.eventsBound) return;
      this.eventsBound = true;

      this.map.on("click", ids.clusters, event => {
        const feature = event.features?.[0];
        if (!feature) return;
        this.closePopup();
        const source = this.map.getSource(this.sourceId);
        const clusterId = feature.properties?.cluster_id;
        if (!source || clusterId == null) return;

        const result = source.getClusterExpansionZoom(clusterId, (error, zoom) => {
          if (error || !Number.isFinite(zoom)) return;
          this.map.easeTo({ center: feature.geometry.coordinates, zoom, duration: 600 });
        });
        if (result && typeof result.then === "function") {
          result.then(zoom => {
            if (Number.isFinite(zoom)) this.map.easeTo({ center: feature.geometry.coordinates, zoom, duration: 600 });
          }).catch(() => {});
        }
      });

      [ids.clusters, ids.clusterCount].forEach(layerId => {
        this.map.on("mouseenter", layerId, () => { this.map.getCanvas().style.cursor = "pointer"; });
        this.map.on("mouseleave", layerId, () => { this.map.getCanvas().style.cursor = ""; });
      });

      ["move", "moveend", "zoom", "zoomend", "resize", "idle"].forEach(eventName => {
        this.map.on(eventName, () => this.scheduleMarkerSync());
      });

      this.map.on("styledata", () => {
        window.clearTimeout(this.restoreTimer);
        this.restoreTimer = window.setTimeout(() => {
          if (!this.map.isStyleLoaded()) return;
          this.add();
        }, 80);
      });
    }

    createMarkerElement(pet) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "tpg-pet-avatar-marker";
      element.setAttribute("aria-label", `Open ${pet.name || "pet"}`);
      element.dataset.petId = String(pet.id);

      const frame = document.createElement("span");
      frame.className = "tpg-pet-avatar-marker__frame";

      const image = document.createElement("img");
      image.className = "tpg-pet-avatar-marker__image";
      image.src = pet.image || "../assets/avatar.png";
      image.alt = "";
      image.draggable = false;
      image.addEventListener("error", () => {
        image.src = "../assets/avatar.png";
      }, { once: true });

      const status = document.createElement("span");
      status.className = "tpg-pet-avatar-marker__status";
      status.setAttribute("aria-hidden", "true");

      frame.append(image, status);
      element.append(frame);

      if (pet.verified) {
        const verified = document.createElement("span");
        verified.className = "tpg-pet-avatar-marker__verified";
        verified.textContent = "✓";
        verified.setAttribute("aria-hidden", "true");
        element.append(verified);
      }

      this.applyMarkerState(element, pet);
      element.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        this.openPet(pet);
      });
      return element;
    }

    applyMarkerState(element, pet) {
      element.classList.toggle("is-online", Boolean(pet.online));
      element.classList.toggle("is-offline", !pet.online);
      element.classList.toggle("is-verified", Boolean(pet.verified));
      element.classList.toggle("is-selected", String(pet.id) === this.selectedPetId);
      element.title = `${pet.name || "Pet"} · ${pet.online ? "Online" : "Offline"}${pet.verified ? " · Verified" : ""}`;
    }

    createMarker(pet) {
      const element = this.createMarkerElement(pet);
      const marker = new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat([Number(pet.longitude), Number(pet.latitude)])
        .addTo(this.map);
      marker.getElement().style.display = "none";
      return { marker, element, pet };
    }

    openPet(pet) {
      this.closePopup(false);
      this.selectedPetId = String(pet.id);
      this.refreshMarkerStates();

      this.currentPopup = new maplibregl.Popup({
        offset: 38,
        maxWidth: "420px",
        className: "tpg-premium-popup",
        closeButton: true,
        closeOnClick: false,
        closeOnMove: false,
        focusAfterOpen: false
      })
        .setLngLat([Number(pet.longitude), Number(pet.latitude)])
        .setHTML(this.popupHtml(pet))
        .addTo(this.map);

      this.currentPopup.on("close", () => {
        this.currentPopup = null;
        this.selectedPetId = null;
        this.refreshMarkerStates();
        this.scheduleMarkerSync();
      });

      this.onSelect(pet);
    }

    closePopup(clearSelection = true) {
      if (this.currentPopup) {
        const popup = this.currentPopup;
        this.currentPopup = null;
        popup.remove();
      }
      if (clearSelection) {
        this.selectedPetId = null;
        this.refreshMarkerStates();
      }
    }

    refreshMarkerStates() {
      for (const [id, entry] of this.markersById) {
        const pet = this.petsById.get(id) || entry.pet;
        entry.pet = pet;
        this.applyMarkerState(entry.element, pet);
      }
    }

    scheduleMarkerSync() {
      if (this.syncFrame) return;
      this.syncFrame = window.requestAnimationFrame(() => {
        this.syncFrame = null;
        this.syncMarkers();
      });
    }

    syncMarkers() {
      const ids = this.layerIds();
      if (!this.visible || !this.map.getLayer(ids.points)) {
        for (const entry of this.markersById.values()) entry.element.style.display = "none";
        return;
      }

      let rendered = [];
      try {
        rendered = this.map.queryRenderedFeatures({ layers: [ids.points] }) || [];
      } catch (_) {
        return;
      }

      const visibleIds = new Set(rendered.map(feature => String(feature.properties?.id ?? "")).filter(Boolean));

      for (const [id, entry] of this.markersById) {
        if (id === this.selectedPetId) {
          entry.element.style.display = "block";
          continue;
        }
        // Avoid hiding markers while popup/selection is active.
        if (this.selectedPetId) {
          entry.element.style.display = "block";
          continue;
        }
        entry.element.style.display = visibleIds.has(id) ? "block" : "none";
      }
    }

    distanceLabel(pet) {
      if (!this.userLocation) return "";
      const lat1 = Number(this.userLocation.latitude);
      const lon1 = Number(this.userLocation.longitude);
      const lat2 = Number(pet.latitude);
      const lon2 = Number(pet.longitude);
      if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return "";
      const toRad = value => value * Math.PI / 180;
      const earthRadiusKm = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      const distanceKm = earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (distanceKm < 1) return `${Math.max(10, Math.round(distanceKm * 1000 / 10) * 10)} m away`;
      return `${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km away`;
    }

    popupHtml(pet) {
      const image = pet.image || "../assets/avatar.png";
      const location = [pet.city, pet.country].filter(Boolean).join(", ") || "Location not available";
      const type = pet.type || "Pet";
      const breed = pet.breed || "Breed not specified";
      const likes = Number(pet.likes_count ?? pet.likes ?? 0);
      const followers = Number(pet.followers_count ?? pet.followers ?? 0);
      const owner = pet.owner_name || pet.owner || pet.username || "Pet owner";
      const distance = this.distanceLabel(pet);
      return `<article class="tpg-map-popup tpg-map-popup--premium">
        <div class="tpg-map-popup__media">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(pet.name)}">
          <div class="tpg-map-popup__badges">
            ${pet.verified ? '<span class="tpg-map-popup__verified">✓ Verified</span>' : ""}
            ${pet.online ? '<span class="tpg-map-popup__online"><i></i> Online</span>' : '<span class="tpg-map-popup__offline"><i></i> Offline</span>'}
          </div>
        </div>
        <div class="tpg-map-popup__content">
          <div class="tpg-map-popup__heading"><div>
            <small>${escapeHtml(type)}</small>
            <strong>${escapeHtml(pet.name)}</strong>
            <span class="tpg-map-popup__breed">${escapeHtml(breed)}</span>
          </div></div>
          <div class="tpg-map-popup__meta">
            <p>📍 <span>${escapeHtml(location)}</span></p>
            ${distance ? `<p class="tpg-map-popup__distance">🧭 <span>${escapeHtml(distance)}</span></p>` : ""}
            <p>👤 <span>${escapeHtml(owner)}</span></p>
          </div>
          <div class="tpg-map-popup__stats">
            <span><b>❤️ ${likes}</b><small>Likes</small></span>
            <span><b>👥 ${followers}</b><small>Followers</small></span>
          </div>
          <div class="tpg-map-popup__actions">
            <a class="is-primary" href="pet.html?id=${encodeURIComponent(pet.id)}">View profile</a>
            <a href="messages.html?pet=${encodeURIComponent(pet.id)}">Message</a>
            <a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(pet.latitude)}&mlon=${encodeURIComponent(pet.longitude)}#map=17/${encodeURIComponent(pet.latitude)}/${encodeURIComponent(pet.longitude)}">Directions</a>
          </div>
        </div>
      </article>`;
    }

    setUserLocation(location) {
      const latitude = Number(location?.latitude);
      const longitude = Number(location?.longitude);
      this.userLocation = Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { latitude, longitude }
        : null;
    }

    setPets(pets) {
      const validPets = (Array.isArray(pets) ? pets : []).filter(pet => {
        const longitude = Number(pet.longitude);
        const latitude = Number(pet.latitude);
        return Number.isFinite(longitude) && Number.isFinite(latitude) &&
          longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;
      });

      const nextIds = new Set(validPets.map(pet => String(pet.id)));

      for (const [id, entry] of this.markersById) {
        if (!nextIds.has(id)) {
          entry.marker.remove();
          this.markersById.delete(id);
        }
      }

      this.petsById.clear();
      const features = validPets.map(pet => {
        const id = String(pet.id);
        this.petsById.set(id, pet);
        const current = this.markersById.get(id);
        if (current) {
          current.pet = pet;
          current.marker.setLngLat([Number(pet.longitude), Number(pet.latitude)]);
          const image = current.element.querySelector("img");
          if (image && image.src !== new URL(pet.image || "../assets/avatar.png", document.baseURI).href) {
            image.src = pet.image || "../assets/avatar.png";
          }
          this.applyMarkerState(current.element, pet);
        } else {
          this.markersById.set(id, this.createMarker(pet));
        }

        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [Number(pet.longitude), Number(pet.latitude)] },
          properties: { id, online: Boolean(pet.online), verified: Boolean(pet.verified) }
        };
      });

      this.lastData = { type: "FeatureCollection", features };
      const source = this.map.getSource(this.sourceId);
      if (source) source.setData(this.lastData);
      else if (this.map.isStyleLoaded()) this.add();
      this.scheduleMarkerSync();
    }

    setVisible(visible) {
      this.visible = Boolean(visible);
      const visibility = this.visible ? "visible" : "none";
      Object.values(this.layerIds()).forEach(id => {
        if (this.map.getLayer(id)) this.map.setLayoutProperty(id, "visibility", visibility);
      });
      if (!this.visible) this.closePopup();
      this.scheduleMarkerSync();
    }
  }

  window.ThePetGridMapCore = window.ThePetGridMapCore || {};
  window.ThePetGridMapCore.PetLayer = PetLayer;
})();
