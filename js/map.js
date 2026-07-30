document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const Core = window.ThePetGridMapCore;
  const mapElement = document.getElementById("worldMap");
  if (!mapElement || !Core?.MapManager || !Core?.PetLayer) return;

  const ui = {
    loading: document.getElementById("mapLoading"), serviceLoading: document.getElementById("serviceLoadingOverlay"), search: document.getElementById("mapSearch"),
    type: document.getElementById("mapTypeFilter"), onlineOnly: document.getElementById("mapOnlineOnly"),
    reset: document.getElementById("mapReset"), title: document.getElementById("sidebarTitle"),
    message: document.getElementById("sidebarMessage"), count: document.getElementById("sidebarCount"),
    list: document.getElementById("mapPetList"), topCountries: document.getElementById("topCountries"),
    petCount: document.getElementById("mapPetCount"), countryCount: document.getElementById("mapCountryCount"),
    cityCount: document.getElementById("mapCityCount"), onlineCount: document.getElementById("mapOnlineCount"),
    serviceStatus: document.getElementById("serviceStatus"), refreshServices: document.getElementById("refreshServices"),
    serviceExplorer: document.getElementById("serviceExplorer"), serviceExplorerCount: document.getElementById("serviceExplorerCount"),
    serviceExplorerMessage: document.getElementById("serviceExplorerMessage"), serviceExplorerList: document.getElementById("serviceExplorerList"),
    serviceSort: document.getElementById("serviceSort"), layerPets: document.getElementById("layerPets"),
    serviceToggles: [...document.querySelectorAll("[data-service-layer]")]
  };

  const fallbackImage = "../assets/avatar.png";
  const countryCoords = {
    greece:[21.82,39.07],cyprus:[33.43,35.13],italy:[12.57,41.87],france:[2.21,46.23],germany:[10.45,51.17],
    spain:[-3.75,40.46],portugal:[-8.22,39.4],"united kingdom":[-3.44,55.38],uk:[-3.44,55.38],ireland:[-7.69,53.14],
    usa:[-95.71,37.09],"united states":[-95.71,37.09],canada:[-106.35,56.13],brazil:[-51.93,-14.24],australia:[133.78,-25.27],
    japan:[138.25,36.2],india:[78.96,20.59],turkey:[35.24,38.96],egypt:[30.8,26.82],"south africa":[22.94,-30.56]
  };
  const cityCoords = { athens:[23.73,37.98],thessaloniki:[22.94,40.64],patras:[21.73,38.25],rome:[12.5,41.9],milan:[9.19,45.46],paris:[2.35,48.86],berlin:[13.4,52.52],london:[-0.13,51.51],tokyo:[139.69,35.68],istanbul:[28.98,41.01] };

  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);
  const normalize = value => String(value || "").trim().toLowerCase();
  const hash = value => { let h = 0; for (const c of String(value)) h = ((h << 5) - h) + c.charCodeAt(0) | 0; return h; };

  const manager = new Core.MapManager({ container: mapElement, center: [8,25], zoom: 1.6, minZoom: 1.2, fullscreen: true, geolocate: true });
  const map = manager.map;
  const petLayer = new Core.PetLayer(map, { onSelect: pet => renderSidebar([pet], pet.name, "Selected pet") });
  const serviceClient = new Core.ServiceClient();
  const serviceLayer = new Core.ServiceLayer(map);

  // Keep the visitor position only in memory. It is used to calculate
  // the distance shown in pet cards and is never written to storage.
  let userLocation = null;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        userLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        petLayer.setUserLocation(userLocation);
        renderServiceExplorer(currentServices);
      },
      () => { userLocation = null; petLayer.setUserLocation(null); },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 300000 }
    );
  }

  let pets = [];
  let visiblePets = [];
  let serviceRefreshTimer = null;
  let serviceRefreshSequence = 0;
  let currentServices = [];

  function coordinatesFor(pet) {
    const lat = Number(pet.latitude), lng = Number(pet.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) return [lng, lat];
    const city = cityCoords[normalize(pet.city)];
    const country = countryCoords[normalize(pet.country)];
    const base = city || country;
    if (!base) return null;
    const jitter = ((Math.abs(hash(pet.id || pet.name)) % 100) - 50) / 180;
    return [base[0] + jitter, base[1] + jitter];
  }

  function normalizePet(row, cloud = true) {
    const coords = coordinatesFor(row);
    if (!coords) return null;
    return {
      id: row.id, ownerId: row.owner_id || row.ownerId || null, name: row.name || "Unnamed Pet",
      type: row.type || "Other", breed: row.breed || "", country: row.country || "", city: row.city || "",
      image: (cloud ? row.image_url : row.image || row.image_url) || fallbackImage,
      verified: Boolean(row.verified), longitude: coords[0], latitude: coords[1], online: false
    };
  }

  async function loadPets() {
    const client = window.ThePetGridSupabase?.client;
    if (!client) return (window.PetStore?.getAll?.() || []).map(row => normalizePet(row, false)).filter(Boolean);
    const { data, error } = await client.from("pets").select("id,owner_id,name,type,breed,country,city,image_url,verified,latitude,longitude,created_at").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(row => normalizePet(row, true)).filter(Boolean);
  }

  function renderTypes() {
    const types = [...new Set(pets.map(p => p.type).filter(Boolean))].sort();
    ui.type.innerHTML = '<option value="all">All pet types</option>' + types.map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("");
  }

  function renderStats() {
    ui.petCount.textContent = pets.length;
    ui.countryCount.textContent = new Set(pets.map(p => normalize(p.country)).filter(Boolean)).size;
    ui.cityCount.textContent = new Set(pets.map(p => normalize(p.city)).filter(Boolean)).size;
    ui.onlineCount.textContent = pets.filter(p => p.online).length;
  }

  function renderSidebar(list, title = "Pets around the world", message = "Select a marker or search for a location.") {
    ui.title.textContent = title; ui.message.textContent = message; ui.count.textContent = list.length;
    ui.list.innerHTML = list.slice(0, 40).map(pet => `<a class="map-pet-card" href="pet.html?id=${encodeURIComponent(pet.id)}"><img src="${escapeHtml(pet.image)}" alt="${escapeHtml(pet.name)}"><span><strong>${escapeHtml(pet.name)}</strong><small>${pet.online ? "🟢 " : ""}${escapeHtml([pet.city, pet.country].filter(Boolean).join(", "))}</small></span></a>`).join("");
  }

  function renderTopCountries() {
    const counts = new Map();
    pets.forEach(p => { if (p.country) counts.set(p.country, (counts.get(p.country) || 0) + 1); });
    ui.topCountries.innerHTML = [...counts.entries()].sort((a,b) => b[1]-a[1]).slice(0,8).map(([country,count]) => `<button type="button" data-country="${escapeHtml(country)}"><strong>${escapeHtml(country)}</strong><span>${count} pets</span></button>`).join("");
  }

  function fitVisible() {
    if (!visiblePets.length) return;
    if (visiblePets.length === 1) { map.easeTo({ center: [visiblePets[0].longitude, visiblePets[0].latitude], zoom: 11, duration: 550 }); return; }
    const bounds = new maplibregl.LngLatBounds();
    visiblePets.forEach(p => bounds.extend([p.longitude, p.latitude]));
    map.fitBounds(bounds, { padding: 70, maxZoom: 11, duration: 600 });
  }

  function applyFilters({ fit = false } = {}) {
    const query = normalize(ui.search.value), type = ui.type.value;
    visiblePets = pets.filter(pet => {
      const text = normalize([pet.name, pet.type, pet.breed, pet.city, pet.country].join(" "));
      return (!query || text.includes(query)) && (type === "all" || pet.type === type) && (!ui.onlineOnly.checked || pet.online);
    });
    petLayer.setPets(visiblePets);
    renderSidebar(visiblePets, query ? `Results for “${ui.search.value.trim()}”` : "Pets around the world", visiblePets.length ? "Choose a pet to open its profile." : "No pets matched these filters.");
    if (fit) fitVisible();
  }

  const serviceMeta = {
    veterinary: ["✚", "Veterinary"], shelter: ["⌂", "Shelter"], pet_shop: ["▣", "Pet shop"],
    groomer: ["✂", "Groomer"], dog_park: ["♧", "Dog park"]
  };

  function distanceKm(from, service) {
    if (!from) return null;
    const toRad = value => value * Math.PI / 180;
    const earthRadius = 6371;
    const lat1 = toRad(Number(from.latitude));
    const lat2 = toRad(Number(service.lat));
    const deltaLat = toRad(Number(service.lat) - Number(from.latitude));
    const deltaLng = toRad(Number(service.lng) - Number(from.longitude));
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDistance(km) {
    if (!Number.isFinite(km)) return "Distance unavailable";
    if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m away`;
    return `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`;
  }

  function sortedServices(services) {
    const mode = ui.serviceSort?.value || "nearest";
    return services.map(service => ({ ...service, distance: distanceKm(userLocation, service) })).sort((a, b) => {
      if (mode === "name") return String(a.tags.name || "").localeCompare(String(b.tags.name || ""));
      if (mode === "type") return String(a.type).localeCompare(String(b.type)) || String(a.tags.name || "").localeCompare(String(b.tags.name || ""));
      if (Number.isFinite(a.distance) && Number.isFinite(b.distance)) return a.distance - b.distance;
      if (Number.isFinite(a.distance)) return -1;
      if (Number.isFinite(b.distance)) return 1;
      return String(a.tags.name || "").localeCompare(String(b.tags.name || ""));
    });
  }

  function renderServiceExplorer(services = currentServices) {
    if (!ui.serviceExplorer || !ui.serviceExplorerList) return;
    const hasActiveLayers = activeServiceTypes().length > 0;
    ui.serviceExplorer.hidden = !hasActiveLayers;
    if (!hasActiveLayers) return;

    const sorted = sortedServices(services);
    ui.serviceExplorerCount.textContent = sorted.length;
    ui.serviceExplorerMessage.textContent = sorted.length
      ? `${sorted.length} places in the visible map area. Select one to open it.`
      : "No matching services are visible here. Move the map or zoom closer.";

    ui.serviceExplorerList.innerHTML = sorted.slice(0, 75).map(service => {
      const [icon, label] = serviceMeta[service.type] || ["•", "Pet service"];
      const name = service.tags.name || label;
      const address = service.tags.addressLine1 || service.tags.formatted || [service.tags.city, service.tags.country].filter(Boolean).join(", ");
      return `<button class="service-result-card is-${escapeHtml(service.type)}" type="button" data-service-id="${escapeHtml(service.id)}">
        <span class="service-result-card__icon" aria-hidden="true">${icon}</span>
        <span class="service-result-card__body">
          <small>${escapeHtml(label)}</small>
          <strong>${escapeHtml(name)}</strong>
          <span>${escapeHtml(address || "Address unavailable")}</span>
        </span>
        <span class="service-result-card__distance">${escapeHtml(formatDistance(service.distance))}</span>
      </button>`;
    }).join("");
  }

  function activeServiceTypes() { return ui.serviceToggles.filter(input => input.checked).map(input => input.dataset.serviceLayer); }
  function setServiceStatus(text, kind = "") { ui.serviceStatus.textContent = text; ui.serviceStatus.className = `service-status${kind ? ` is-${kind}` : ""}`; }
  function setServiceLoading(isLoading) {
    if (!ui.serviceLoading) return;
    ui.serviceLoading.hidden = !isLoading;
  }
  function currentBbox() { const b = map.getBounds(); return [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]; }

  async function refreshServices({ force = false, source = "automatic" } = {}) {
    const types = activeServiceTypes();
    const sequence = ++serviceRefreshSequence;

    if (!types.length) {
      serviceClient.abort();
      serviceLayer.clear();
      currentServices = [];
      renderServiceExplorer();
      setServiceLoading(false);
      setServiceStatus("Enable a service layer to show nearby places.");
      return;
    }
    if (map.getZoom() < 13) {
      serviceClient.abort();
      serviceLayer.clear();
      setServiceLoading(false);
      setServiceStatus("Zoom in to level 13 or closer. Services will refresh automatically.", "error");
      return;
    }

    const b = map.getBounds();
    if ((b.getEast() - b.getWest()) * (b.getNorth() - b.getSouth()) > 1.5) {
      serviceClient.abort();
      serviceLayer.clear();
      setServiceLoading(false);
      setServiceStatus("The visible area is too large. Zoom in closer and services will refresh automatically.", "error");
      return;
    }

    if (ui.refreshServices) ui.refreshServices.disabled = true;
    setServiceLoading(true);
    setServiceStatus("Searching nearby pet services…", "loading");

    try {
      const result = await serviceClient.load(types, currentBbox(), { force });
      if (sequence !== serviceRefreshSequence) return;
      const services = result?.data || [];
      currentServices = services;
      serviceLayer.render(services);
      renderServiceExplorer(services);
      const suffix = result?.cached ? " (cached)" : "";
      setServiceStatus(services.length ? `${services.length} services found${suffix}.` : `No matching services found in this area${suffix}.`, services.length ? "success" : "");
    } catch (error) {
      if (sequence !== serviceRefreshSequence || error?.name === "AbortError") return;
      setServiceStatus(error?.message || "Services are temporarily unavailable.", "error");
    } finally {
      if (sequence === serviceRefreshSequence) {
        if (ui.refreshServices) ui.refreshServices.disabled = false;
        setServiceLoading(false);
      }
    }
  }

  function scheduleServiceRefresh({ immediate = false, force = false, source = "automatic" } = {}) {
    window.clearTimeout(serviceRefreshTimer);
    if (!activeServiceTypes().length) {
      serviceClient.abort();
      serviceLayer.clear();
      currentServices = [];
      renderServiceExplorer();
      setServiceLoading(false);
      setServiceStatus("Enable a service layer to show nearby places.");
      return;
    }
    const delay = immediate ? 0 : 550;
    setServiceStatus(map.getZoom() >= 13 ? "Map changed — updating nearby services automatically…" : "Zoom in to level 13 or closer. Services will refresh automatically.", map.getZoom() >= 13 ? "loading" : "error");
    serviceRefreshTimer = window.setTimeout(() => refreshServices({ force, source }), delay);
  }

  manager.ready(async () => {
    try {
      petLayer.add();
      pets = await loadPets(); visiblePets = [...pets]; petLayer.setPets(visiblePets);
      renderTypes(); renderStats(); renderTopCountries(); renderSidebar(visiblePets); fitVisible();
      new Core.PresenceBridge(onlineIds => {
        pets.forEach(p => { p.online = onlineIds.has(String(p.ownerId)); });
        renderStats(); applyFilters();
      });
    } catch (error) {
      console.error("ThePetGrid map could not start:", error);
      renderSidebar([], "Map unavailable", "Pets could not be loaded. Check Supabase configuration.");
    } finally {
      ui.loading?.classList.add("is-hidden"); manager.resizeSoon();
    }
  });

  let searchTimer;
  ui.search?.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => applyFilters({ fit: true }), 180); });
  ui.type?.addEventListener("change", () => applyFilters({ fit: true }));
  ui.onlineOnly?.addEventListener("change", () => applyFilters({ fit: true }));
  ui.reset?.addEventListener("click", () => { ui.search.value = ""; ui.type.value = "all"; ui.onlineOnly.checked = false; applyFilters({ fit: true }); });
  ui.layerPets?.addEventListener("change", () => petLayer.setVisible(ui.layerPets.checked));
  ui.serviceToggles.forEach(input => input.addEventListener("change", () => {
    renderServiceExplorer();
    scheduleServiceRefresh({ immediate: true });
  }));
  ui.serviceSort?.addEventListener("change", () => renderServiceExplorer());
  ui.serviceExplorerList?.addEventListener("click", event => {
    const card = event.target.closest("[data-service-id]");
    if (!card) return;
    ui.serviceExplorerList.querySelectorAll(".is-active").forEach(item => item.classList.remove("is-active"));
    card.classList.add("is-active");
    serviceLayer.select(card.dataset.serviceId, { fly: true, openPopup: true });
  });
  ui.refreshServices?.addEventListener("click", () => scheduleServiceRefresh({ immediate: true, force: true, source: "manual" }));
  map.on("movestart", () => { if (activeServiceTypes().length) serviceClient.abort(); });
  map.on("moveend", () => scheduleServiceRefresh());
  ui.topCountries?.addEventListener("click", event => { const button = event.target.closest("[data-country]"); if (!button) return; ui.search.value = button.dataset.country; applyFilters({ fit: true }); });
});
