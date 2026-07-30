(() => {
  "use strict";

  class MapManager {
    constructor(options = {}) {
      if (!window.maplibregl) throw new Error("MapLibre GL JS is not loaded.");
      const container = typeof options.container === "string"
        ? document.getElementById(options.container)
        : options.container;
      if (!container) throw new Error("Map container was not found.");

      this.map = new maplibregl.Map({
        container,
        style: options.style || window.ThePetGridMapStyle?.create?.(),
        center: options.center || [21.82, 39.07],
        zoom: options.zoom ?? 4.6,
        minZoom: options.minZoom ?? 2,
        maxZoom: options.maxZoom ?? 19,
        attributionControl: options.attributionControl !== false
      });

      if (options.navigation !== false) {
        this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      }
      if (options.fullscreen) this.map.addControl(new maplibregl.FullscreenControl(), "top-right");
      if (options.geolocate) {
        this.map.addControl(new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false
        }), "top-right");
      }
    }

    ready(callback) {
      if (this.map.loaded()) callback(this.map);
      else this.map.once("load", () => callback(this.map));
      return this;
    }

    resizeSoon(delay = 80) {
      window.setTimeout(() => this.map.resize(), delay);
    }

    destroy() {
      this.map?.remove();
    }
  }

  window.ThePetGridMapCore = window.ThePetGridMapCore || {};
  window.ThePetGridMapCore.MapManager = MapManager;
})();
