(() => {
  "use strict";

  function init(options = {}) {
    const country = document.getElementById(options.countryId || "petCountry");
    const city = document.getElementById(options.cityId || "petCity");
    const latitude = document.getElementById(options.latitudeId || "petLatitude");
    const longitude = document.getElementById(options.longitudeId || "petLongitude");
    const mapElement = document.getElementById(options.mapId || "petLocationMap");
    const searchInput = document.getElementById(options.searchId || "locationSearch");
    const searchButton = document.getElementById(options.searchButtonId || "locationSearchButton");
    const status = document.getElementById(options.statusId || "locationStatus");
    if (!country || !city || !latitude || !longitude || !mapElement || !window.maplibregl) return null;

    const data = window.ThePetGridLocationData || { countries: [], cities: {} };
    const originalCountry = country.dataset.initialValue || country.value || "";
    const originalCity = city.dataset.initialValue || city.value || "";

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
    }

    function canonicalCountry(value) {
      const clean = String(value || "").trim();
      return data.countries.find(item => item.toLowerCase() === clean.toLowerCase()) || clean;
    }

    function setStatus(message, kind = "") {
      if (!status) return;
      status.textContent = message;
      status.className = `location-picker__status${kind ? ` is-${kind}` : ""}`;
    }

    country.innerHTML = '<option value="">Select country</option>' + data.countries.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
    country.value = canonicalCountry(originalCountry);

    const MapManager = window.ThePetGridMapCore?.MapManager;
    if (!MapManager) return null;
    const mapManager = new MapManager({
      container: mapElement,
      center: [21.82, 39.07],
      zoom: 4.6,
      minZoom: 2,
      maxZoom: 18,
      navigation: true
    });
    const map = mapManager.map;

    let marker = null;

    function createMarkerElement() {
      const element = document.createElement("div");
      element.className = "tpg-location-marker";
      element.setAttribute("aria-label", "Selected pet location");
      element.innerHTML = '<span class="tpg-location-marker__paw" aria-hidden="true">🐾</span>';
      return element;
    }

    function populateCities(selected = "") {
      const list = data.cities[country.value] || [];
      city.innerHTML = '<option value="">Select city</option>' + list.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
      city.disabled = !country.value;
      if (!country.value) return;
      const match = list.find(item => item.toLowerCase() === String(selected).trim().toLowerCase());
      if (match) city.value = match;
      else if (selected) {
        city.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(selected)}">${escapeHtml(selected)}</option>`);
        city.value = selected;
      }
      if (!list.length) setStatus("City list is not available for this country. Search or choose the exact point on the map.");
    }

    function dispatchLocationChange() {
      country.dispatchEvent(new Event("input", { bubbles: true }));
      city.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function setMarker(lat, lng, zoom = 12, notify = true) {
      const latNumber = Number(lat);
      const lngNumber = Number(lng);
      if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) return;
      latitude.value = latNumber.toFixed(6);
      longitude.value = lngNumber.toFixed(6);

      if (!marker) {
        marker = new maplibregl.Marker({ element: createMarkerElement(), draggable: true, anchor: "bottom" })
          .setLngLat([lngNumber, latNumber])
          .addTo(map);
        marker.on("dragend", () => {
          const point = marker.getLngLat();
          latitude.value = point.lat.toFixed(6);
          longitude.value = point.lng.toFixed(6);
          reverseGeocode(point.lat, point.lng);
          dispatchLocationChange();
        });
      } else {
        marker.setLngLat([lngNumber, latNumber]);
      }

      map.easeTo({ center: [lngNumber, latNumber], zoom, duration: 550 });
      if (notify) dispatchLocationChange();
    }

    async function geocode(query) {
      if (!query) return null;
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, { headers: { "Accept-Language": "en" } });
      if (!response.ok) throw new Error("Location search failed.");
      const results = await response.json();
      return results[0] || null;
    }

    async function reverseGeocode(lat, lng) {
      try {
        setStatus("Finding country and city…");
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
        const response = await fetch(url, { headers: { "Accept-Language": "en" } });
        if (!response.ok) throw new Error();
        const result = await response.json();
        const address = result.address || {};
        const foundCountry = canonicalCountry(address.country || "");
        const foundCity = address.city || address.town || address.village || address.municipality || address.county || "";
        if (foundCountry && [...country.options].some(option => option.value === foundCountry)) {
          country.value = foundCountry;
          populateCities(foundCity);
        }
        setStatus(foundCity || foundCountry ? `Selected: ${[foundCity, foundCountry].filter(Boolean).join(", ")}` : "Exact map point selected.", "success");
        dispatchLocationChange();
      } catch {
        setStatus("Exact map point selected.", "success");
      }
    }

    async function focusSelection() {
      const query = [city.value, country.value].filter(Boolean).join(", ");
      if (!query) return;
      try {
        setStatus("Locating selected city…");
        const result = await geocode(query);
        if (!result) throw new Error("Location was not found.");
        setMarker(result.lat, result.lon, 12);
        setStatus(`Selected: ${query}`, "success");
      } catch (error) {
        setStatus(error.message || "Location was not found.", "error");
      }
    }

    async function runSearch() {
      const query = searchInput?.value.trim();
      if (!query) return;
      try {
        setStatus("Searching…");
        const result = await geocode(query);
        if (!result) throw new Error("No matching location was found.");
        setMarker(result.lat, result.lon, 14, false);
        await reverseGeocode(result.lat, result.lon);
      } catch (error) {
        setStatus(error.message || "Search failed.", "error");
      }
    }

    country.addEventListener("change", () => {
      populateCities();
      if (country.value) focusSelection();
      dispatchLocationChange();
    });
    city.addEventListener("change", () => {
      if (city.value) focusSelection();
      dispatchLocationChange();
    });
    map.on("click", event => {
      setMarker(event.lngLat.lat, event.lngLat.lng, Math.max(map.getZoom(), 12), false);
      reverseGeocode(event.lngLat.lat, event.lngLat.lng);
    });
    searchButton?.addEventListener("click", runSearch);
    searchInput?.addEventListener("keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); runSearch(); }
    });

    populateCities(originalCity);
    const initialLat = Number(latitude.value);
    const initialLng = Number(longitude.value);
    map.on("load", () => {
      if (Number.isFinite(initialLat) && Number.isFinite(initialLng) && (initialLat || initialLng)) setMarker(initialLat, initialLng, 12, false);
      else if (country.value || city.value) focusSelection();
      setTimeout(() => map.resize(), 80);
    });

    return {
      map,
      setValue(value = {}) {
        const nextCountry = canonicalCountry(value.country || "");
        if (nextCountry && [...country.options].some(option => option.value === nextCountry)) country.value = nextCountry;
        populateCities(value.city || "");
        const nextLat = Number(value.latitude);
        const nextLng = Number(value.longitude);
        if (Number.isFinite(nextLat) && Number.isFinite(nextLng) && (nextLat || nextLng)) {
          setMarker(nextLat, nextLng, 12, false);
          setStatus(`Saved location: ${[value.city, nextCountry].filter(Boolean).join(", ")}`, "success");
        } else if (nextCountry || value.city) focusSelection();
        dispatchLocationChange();
      },
      reset() {
        country.value = "";
        populateCities();
        latitude.value = "";
        longitude.value = "";
        if (marker) { marker.remove(); marker = null; }
        map.easeTo({ center: [21.82, 39.07], zoom: 4.6 });
        setStatus("Select a country and city, search, or click on the map.");
      }
    };
  }

  window.ThePetGridLocationPicker = { init };
})();
