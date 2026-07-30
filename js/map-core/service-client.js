(() => {
  "use strict";

  const API_URL = "https://api.geoapify.com/v2/places";
  const STORAGE_KEY = "tpg:geoapify-api-key";

  const CATEGORY_BY_TYPE = Object.freeze({
    veterinary: "pet.veterinary",
    shelter: "pet.animal_shelter",
    pet_shop: "pet.shop",
    groomer: "pet.service",
    dog_park: "pet.dog_park"
  });

  class ServiceClient {
    constructor(options = {}) {
      const config = window.ThePetGridGeoapify || {};
      this.apiKey = String(options.apiKey || localStorage.getItem(STORAGE_KEY) || config.apiKey || "").trim();
      this.language = options.language || config.language || "en";
      this.resultLimit = Math.min(500, Math.max(1, Number(options.resultLimit || config.resultLimit || 150)));
      this.cacheTtl = options.cacheTtl || 30 * 60 * 1000;
      this.cooldownMs = options.cooldownMs || 900;
      this.timeoutMs = options.timeoutMs || 18000;
      this.lastRequestAt = 0;
      this.controller = null;
      this.requestId = 0;
    }

    hasApiKey() {
      return Boolean(this.apiKey && !this.apiKey.includes("PASTE_") && this.apiKey.length > 10);
    }

    setApiKey(value, { persist = true } = {}) {
      this.apiKey = String(value || "").trim();
      if (persist) {
        if (this.apiKey) localStorage.setItem(STORAGE_KEY, this.apiKey);
        else localStorage.removeItem(STORAGE_KEY);
      }
    }

    getMaskedApiKey() {
      if (!this.hasApiKey()) return "";
      return `${this.apiKey.slice(0, 5)}••••${this.apiKey.slice(-4)}`;
    }

    abort() {
      if (this.controller) this.controller.abort();
      this.controller = null;
    }

    cacheKey(types, bbox) {
      return `tpg:geoapify:v2:${types.slice().sort().join(",")}:${bbox.map(value => Number(value).toFixed(3)).join(",")}`;
    }

    readCache(key) {
      try {
        const value = JSON.parse(localStorage.getItem(key));
        if (!value || Date.now() - value.savedAt > this.cacheTtl) return null;
        return value.data;
      } catch {
        return null;
      }
    }

    writeCache(key, data) {
      try {
        localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
      } catch {
        // The map still works when browser storage is unavailable or full.
      }
    }

    categoriesFor(types) {
      return [...new Set(types.map(type => CATEGORY_BY_TYPE[type]).filter(Boolean))];
    }

    buildUrl(types, bbox) {
      if (!this.hasApiKey()) throw new Error("Geoapify API key is missing. Add your free key in the Map settings.");
      const categories = this.categoriesFor(types);
      if (!categories.length) throw new Error("No supported service category is selected.");

      const [south, west, north, east] = bbox.map(Number);
      const params = new URLSearchParams({
        categories: categories.join(","),
        filter: `rect:${west},${south},${east},${north}`,
        bias: `rect:${west},${south},${east},${north}`,
        limit: String(this.resultLimit),
        lang: this.language,
        apiKey: this.apiKey
      });
      return `${API_URL}?${params.toString()}`;
    }

    classify(categories = [], requestedTypes = []) {
      const values = new Set(categories);
      const exact = [
        ["veterinary", "pet.veterinary"], ["shelter", "pet.animal_shelter"],
        ["pet_shop", "pet.shop"], ["dog_park", "pet.dog_park"], ["groomer", "pet.service"]
      ];
      return exact.find(([type, category]) => requestedTypes.includes(type) && values.has(category))?.[0] || null;
    }

    normalize(featureCollection, requestedTypes) {
      const seen = new Set();
      return (featureCollection?.features || []).flatMap(feature => {
        const properties = feature.properties || {};
        const coordinates = feature.geometry?.coordinates || [];
        const lng = Number(properties.lon ?? coordinates[0]);
        const lat = Number(properties.lat ?? coordinates[1]);
        const type = this.classify(properties.categories || [], requestedTypes);
        if (!type || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
        const id = String(properties.place_id || `${type}:${lat}:${lng}`);
        if (seen.has(id)) return [];
        seen.add(id);
        return [{
          id, type, lat, lng,
          tags: {
            name: properties.name || properties.address_line1 || "",
            formatted: properties.formatted || "",
            addressLine1: properties.address_line1 || "",
            addressLine2: properties.address_line2 || "",
            city: properties.city || properties.county || "",
            country: properties.country || "",
            postcode: properties.postcode || "",
            website: properties.website || properties.datasource?.raw?.website || "",
            phone: properties.contact?.phone || properties.datasource?.raw?.phone || "",
            categories: properties.categories || []
          }
        }];
      });
    }

    async fetchJson(url, signal) {
      const response = await fetch(url, { method: "GET", signal, headers: { Accept: "application/geo+json,application/json" } });
      if (!response.ok) {
        let detail = "";
        try { detail = (await response.json())?.message || ""; } catch {}
        if (response.status === 401 || response.status === 403) throw new Error("Geoapify rejected the API key. Check the key and its allowed referrers.");
        if (response.status === 429) throw new Error("Geoapify daily or rate limit reached. Try again later.");
        throw new Error(detail || `Geoapify request failed (HTTP ${response.status}).`);
      }
      return response.json();
    }

    async load(types, bbox, { force = false } = {}) {
      const key = this.cacheKey(types, bbox);
      if (!force) {
        const cached = this.readCache(key);
        if (cached) return { data: cached, cached: true };
      }

      const elapsed = Date.now() - this.lastRequestAt;
      if (elapsed < this.cooldownMs) await new Promise(resolve => setTimeout(resolve, this.cooldownMs - elapsed));

      this.abort();
      const requestId = ++this.requestId;
      const controller = new AbortController();
      this.controller = controller;
      const timeout = window.setTimeout(() => controller.abort(), this.timeoutMs);
      this.lastRequestAt = Date.now();

      try {
        const json = await this.fetchJson(this.buildUrl(types, bbox), controller.signal);
        if (requestId !== this.requestId) throw new DOMException("Superseded request", "AbortError");
        const data = this.normalize(json, types);
        this.writeCache(key, data);
        return { data, cached: false };
      } finally {
        window.clearTimeout(timeout);
        if (requestId === this.requestId) this.controller = null;
      }
    }
  }

  ServiceClient.STORAGE_KEY = STORAGE_KEY;
  ServiceClient.CATEGORY_BY_TYPE = CATEGORY_BY_TYPE;
  window.ThePetGridMapCore = window.ThePetGridMapCore || {};
  window.ThePetGridMapCore.ServiceClient = ServiceClient;
})();
