(() => {
  "use strict";

  const STORAGE_KEY = "thepetgrid_lost_found_reports";
  const PET_DRAFT_KEY = "thepetgrid_lost_report_pet";
  const SIGHTINGS_KEY = "thepetgrid_lost_pet_sightings";
  const PLACEHOLDER = "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=82";
  const DEFAULT_CENTER = [23.7275, 37.9838];
  const IS_LOCAL_DEVELOPMENT = ["localhost", "127.0.0.1"].includes(location.hostname);
  const demoReports = [
    { id:"demo-lost-bella", status:"lost", name:"Bella", type:"Dog", breed:"Golden Retriever", city:"Athens, Greece", country:"Greece", area:"National Garden", address:"National Garden, Athens, Greece", latitude:37.9737, longitude:23.7374, date:"2026-07-29", description:"Friendly golden retriever wearing a red collar. Last seen near the National Garden.", image:"https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=82", resolved:false },
    { id:"demo-found-cat", status:"found", name:"Unknown Cat", type:"Cat", breed:"Tabby", city:"Thessaloniki, Greece", country:"Greece", area:"Waterfront", address:"Thessaloniki Waterfront, Greece", latitude:40.6264, longitude:22.9484, date:"2026-07-30", description:"Young tabby found safely near the waterfront.", image:"https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=82", resolved:false }
  ];

  const grid = document.querySelector("#lostFoundGrid");
  const filters = [...document.querySelectorAll("[data-lf-filter]")];
  const formSection = document.querySelector("#reportFormSection");
  const form = document.querySelector("#lostFoundForm");
  const formTitle = document.querySelector("#reportFormTitle");
  const statusInput = document.querySelector("#reportStatus");
  const imageInput = document.querySelector("#reportImage");
  const imagePreview = document.querySelector("#reportImagePreview");
  const message = document.querySelector("#reportMessage");
  const latitudeInput = document.querySelector("#reportLatitude");
  const longitudeInput = document.querySelector("#reportLongitude");
  const addressInput = document.querySelector("#reportAddress");
  const locationSearch = document.querySelector("#reportLocationSearch");
  const suggestions = document.querySelector("#reportLocationSuggestions");
  const locationStatus = document.querySelector("#reportLocationStatus");
  const params = new URLSearchParams(location.search);
  const simpleSightingModal = document.querySelector("#lfSimpleSighting");
  const simpleSightingForm = document.querySelector("#lfSimpleSightingForm");
  const simpleSightingReportId = document.querySelector("#lfSimpleSightingReportId");
  const simpleSightingLatitude = document.querySelector("#lfSimpleSightingLatitude");
  const simpleSightingLongitude = document.querySelector("#lfSimpleSightingLongitude");
  const simpleSightingPet = document.querySelector("#lfSimpleSightingPet");
  const simpleSightingTime = document.querySelector("#lfSimpleSightingTime");
  const simpleSightingNote = document.querySelector("#lfSimpleSightingNote");
  const simpleSightingPhoto = document.querySelector("#lfSimpleSightingPhoto");
  const simpleSightingPhotoToggle = document.querySelector("#lfSimplePhotoToggle");
  const simpleSightingPhotoField = document.querySelector("#lfSimplePhotoField");
  const simpleSightingMessage = document.querySelector("#lfSimpleSightingMessage");
  const simpleSightingLocationStatus = document.querySelector("#lfSimpleSightingLocationStatus");

  let imageData = "";
  let currentFilter = "all";
  let pickerMap = null;
  let pickerMarker = null;
  let reportsMap = null;
  let reportMarkers = [];
  let searchTimer = null;
  let suggestionResults = [];
  let cloudReports = [];
  let currentUserId = null;
  let reportsChannel = null;
  let simpleSightingMap = null;
  let simpleSightingMarker = null;

  const safe = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  const numberOrNull = value => {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };


  function storedSightings(){try{const value=JSON.parse(localStorage.getItem(SIGHTINGS_KEY)||"[]");return Array.isArray(value)?value:[]}catch(_){return[]}}
  function saveSighting(sighting){const sightings=storedSightings();sightings.unshift(sighting);localStorage.setItem(SIGHTINGS_KEY,JSON.stringify(sightings));window.dispatchEvent(new CustomEvent("thepetgrid:sightings-changed",{detail:{sighting,sightings}}))}
  function reportSightings(reportId){return storedSightings().filter(item=>String(item.reportId)===String(reportId)).sort((a,b)=>Date.parse(b.seenAt||0)-Date.parse(a.seenAt||0))}
  function relativeSightingTime(value){const time=Date.parse(value||"");if(!Number.isFinite(time))return"just now";const diff=Math.max(0,Date.now()-time),minutes=Math.floor(diff/60000),hours=Math.floor(diff/3600000),days=Math.floor(diff/86400000);if(minutes<1)return"just now";if(minutes<60)return`${minutes} min ago`;if(hours<24)return`${hours} hr${hours===1?"":"s"} ago`;return`${days} day${days===1?"":"s"} ago`}
  function localDateTimeValue(date=new Date()){const offset=date.getTimezoneOffset();return new Date(date.getTime()-offset*60000).toISOString().slice(0,16)}
  function setSimpleSightingMessage(text,type=""){if(!simpleSightingMessage)return;simpleSightingMessage.textContent=text;simpleSightingMessage.className=`lf-simple-sighting__message${type?` is-${type}`:""}`;simpleSightingMessage.hidden=!text}
  function simpleSightingMarkerElement(){const element=document.createElement("div");element.className="lf-simple-sighting-marker";element.textContent="👁";return element}
  function setSimpleSightingPoint(lat,lng,zoom=16){if(!simpleSightingMap)return;const latitude=Number(lat),longitude=Number(lng);if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return;simpleSightingLatitude.value=latitude.toFixed(6);simpleSightingLongitude.value=longitude.toFixed(6);if(!simpleSightingMarker){simpleSightingMarker=new maplibregl.Marker({element:simpleSightingMarkerElement(),anchor:"center"}).setLngLat([longitude,latitude]).addTo(simpleSightingMap)}else simpleSightingMarker.setLngLat([longitude,latitude]);simpleSightingMap.easeTo({center:[longitude,latitude],zoom:Math.max(simpleSightingMap.getZoom(),zoom),duration:450});simpleSightingLocationStatus.textContent="Location selected."}
  function ensureSimpleSightingMap(report){if(simpleSightingMap){setTimeout(()=>simpleSightingMap.resize(),50);return}if(!window.ThePetGridMapCore?.MapManager)return;const lat=numberOrNull(report?.latitude),lng=numberOrNull(report?.longitude),center=lat!==null&&lng!==null?[lng,lat]:DEFAULT_CENTER;const manager=new window.ThePetGridMapCore.MapManager({container:"lfSimpleSightingMap",center,zoom:lat!==null?14:5,minZoom:2,maxZoom:18,navigation:true});simpleSightingMap=manager.map;simpleSightingMap.on("click",event=>setSimpleSightingPoint(event.lngLat.lat,event.lngLat.lng));simpleSightingMap.on("load",()=>setTimeout(()=>simpleSightingMap.resize(),80))}
  function openSimpleSighting(reportId){const report=allReports().find(item=>String(item.id)===String(reportId));if(!report||report.status!=="lost"||report.resolved)return;simpleSightingForm.reset();simpleSightingReportId.value=String(report.id);simpleSightingPet.textContent=`👁 Sighting for ${report.name||"this pet"}`;simpleSightingTime.value=localDateTimeValue();simpleSightingLatitude.value="";simpleSightingLongitude.value="";simpleSightingPhotoField.hidden=true;setSimpleSightingMessage("");simpleSightingLocationStatus.textContent="Tap the map to place the point.";if(simpleSightingMarker){simpleSightingMarker.remove();simpleSightingMarker=null}simpleSightingModal.hidden=false;document.body.style.overflow="hidden";setTimeout(()=>{ensureSimpleSightingMap(report);simpleSightingMap?.resize();const lat=numberOrNull(report.latitude),lng=numberOrNull(report.longitude);if(lat!==null&&lng!==null)simpleSightingMap?.easeTo({center:[lng,lat],zoom:14,duration:0})},80)}
  function closeSimpleSighting(){simpleSightingModal.hidden=true;document.body.style.overflow=""}
  async function fileToDataUrl(file){if(!file)return"";if(!file.type.startsWith("image/"))throw new Error("Choose an image file.");if(file.size>4*1024*1024)throw new Error("The image must be smaller than 4 MB.");return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));reader.onerror=()=>reject(new Error("The photo could not be read."));reader.readAsDataURL(file)})}

  function storedReports() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function allReports() {
    const saved = storedReports();
    const merged = new Map();

    if (IS_LOCAL_DEVELOPMENT && !cloudReports.length && !saved.length) {
      demoReports.forEach(report => merged.set(String(report.id), report));
    }

    cloudReports.forEach(report => merged.set(String(report.id), report));
    saved.forEach(report => merged.set(String(report.id), report));

    return [...merged.values()].sort(
      (a, b) =>
        Date.parse(b.createdAt || b.resolvedAt || b.date || 0) -
        Date.parse(a.createdAt || a.resolvedAt || a.date || 0)
    );
  }

  function saveOrUpdateReport(report) {
    const reports = storedReports();
    const index = reports.findIndex(item => String(item.id) === String(report.id));
    if (index >= 0) reports[index] = report;
    else reports.unshift(report);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    window.dispatchEvent(new CustomEvent("thepetgrid:lost-reports-changed", { detail:{ reports } }));
  }

  function normalizeCloudPet(row) {
    if (!row) return null;
    return {
      id: row.id, name: row.name || "", type: row.type || "Other", breed: row.breed || "",
      age: row.age ?? "", gender: row.gender || "", country: row.country || "", city: row.city || "",
      owner: row.profiles?.display_name || row.profiles?.username || "ThePetGrid Member", image: row.image_url || ""
    };
  }

  function normalizeCloudReport(row) {
    return {
      id:row.id, ownerId:row.reporter_id, petId:row.pet_id, status:row.status,
      name:row.pet_name, type:row.pet_type, breed:row.breed || "", age:row.age || "",
      gender:row.gender || "", color:row.color || "", country:row.country || "",
      city:row.city || "", area:row.area || "", address:row.address || "",
      latitude:row.latitude, longitude:row.longitude, date:row.event_date || "",
      owner:row.owner_name || "", phone:row.phone || "", email:row.email || "",
      reward:row.reward || "", description:row.description || "", image:row.image_url || PLACEHOLDER,
      resolved:Boolean(row.resolved), resolvedAt:row.resolved_at || null,
      createdAt:row.created_at || "", isCloudReport:true
    };
  }

  async function loadCloudReports() {
    const client = window.ThePetGridSupabase?.client;
    if (!client) return;
    try {
      // Guests use the privacy-safe view (no phone/email). Signed-in members
      // may read the full report so they can contact the reporter.
      const source = currentUserId ? "lost_pet_reports" : "public_lost_pet_reports";
      const { data, error } = await client.from(source).select("*").order("created_at", { ascending:false });
      if (error) throw error;
      cloudReports = Array.isArray(data) ? data.map(normalizeCloudReport) : [];
    } catch (error) {
      console.info("ThePetGrid: shared Lost & Found reports need the Sprint 9.4 SQL setup.", error.message || error);
      cloudReports = [];
    }
  }

  function subscribeCloudReports() {
    const client = window.ThePetGridSupabase?.client;
    if (!client || reportsChannel) return;
    reportsChannel = client.channel("lost-found-shared-reports")
      .on("postgres_changes", { event:"*", schema:"public", table:"lost_pet_reports" }, async () => {
        await loadCloudReports();
        render();
      })
      .subscribe();
  }

  async function publishCloudReport(report) {
    const client = window.ThePetGridSupabase?.client;

    if (!client) {
      throw new Error("The server connection is unavailable. Please try again.");
    }

    if (!currentUserId) {
      const error = new Error("Sign in is required to publish a Lost & Found alert.");
      error.code = "AUTH_REQUIRED";
      throw error;
    }

    const petId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(report.petId || "")) ? report.petId : null;
    const row = {
      reporter_id:currentUserId, pet_id:petId, status:report.status, pet_name:report.name,
      pet_type:report.type, breed:report.breed, age:String(report.age || ""), gender:report.gender,
      color:report.color, country:report.country, city:form.elements.city.value.trim(), area:report.area,
      address:report.address, latitude:report.latitude, longitude:report.longitude,
      event_date:report.date, owner_name:report.owner, phone:report.phone, email:report.email,
      reward:report.reward, description:report.description,
      image_url:String(report.image || "").startsWith("data:") ? null : report.image
    };

    const { data, error } = await client
      .from("lost_pet_reports")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      console.error("ThePetGrid: Lost & Found cloud publish failed.", error);
      throw new Error(error.message || "The alert could not be published.");
    }

    return normalizeCloudReport(data);
  }

  function getDraftPet(id) {
    try {
      const pet = JSON.parse(sessionStorage.getItem(PET_DRAFT_KEY) || "null");
      return pet && String(pet.id) === String(id) ? pet : null;
    } catch (_) {
      return null;
    }
  }

  async function findPet(id) {
    if (!id) return null;
    const draftPet = getDraftPet(id);
    if (draftPet) return draftPet;
    const localPet = window.PetStore?.getById?.(id);
    if (localPet) return localPet;
    const client = window.ThePetGridSupabase?.client;
    if (!client) return null;
    try {
      const { data, error } = await client.from("pets").select("*, profiles:owner_id(username, display_name)").eq("id", String(id)).maybeSingle();
      if (error) throw error;
      return normalizeCloudPet(data);
    } catch (error) {
      console.error("ThePetGrid: could not prefill the lost pet report.", error);
      return null;
    }
  }

  function setLocationStatus(text, kind = "") {
    locationStatus.textContent = text;
    locationStatus.className = `lf-location-status${kind ? ` is-${kind}` : ""}`;
  }

  function markerElement(className, content) {
    const element = document.createElement("div");
    element.className = className;
    element.innerHTML = content;
    return element;
  }

  function ensurePickerMap() {
    if (pickerMap || !window.ThePetGridMapCore?.MapManager) {
      pickerMap?.resize();
      return;
    }
    const manager = new window.ThePetGridMapCore.MapManager({ container:"reportLocationMap", center:DEFAULT_CENTER, zoom:5, minZoom:2, maxZoom:18, navigation:true });
    pickerMap = manager.map;
    pickerMap.on("click", event => selectMapPoint(event.lngLat.lat, event.lngLat.lng, true));
    pickerMap.on("load", () => setTimeout(() => pickerMap.resize(), 80));
  }

  function setPickerMarker(lat, lng, zoom = 15) {
    ensurePickerMap();
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !pickerMap) return;
    latitudeInput.value = latitude.toFixed(6);
    longitudeInput.value = longitude.toFixed(6);
    if (!pickerMarker) {
      pickerMarker = new maplibregl.Marker({ element:markerElement("lf-location-marker", "<span>🐾</span>"), draggable:true, anchor:"bottom" }).setLngLat([longitude, latitude]).addTo(pickerMap);
      pickerMarker.on("dragend", () => {
        const point = pickerMarker.getLngLat();
        selectMapPoint(point.lat, point.lng, true, false);
      });
    } else pickerMarker.setLngLat([longitude, latitude]);
    pickerMap.easeTo({ center:[longitude, latitude], zoom:Math.max(pickerMap.getZoom(), zoom), duration:500 });
  }

  function addressParts(result) {
    const address = result?.address || {};
    return {
      country: address.country || "",
      city: address.city || address.town || address.village || address.municipality || address.county || "",
      area: address.road || address.neighbourhood || address.suburb || address.quarter || address.city_district || result?.name || "",
      full: result?.display_name || ""
    };
  }

  function applyAddress(result) {
    const parts = addressParts(result);
    if (parts.country) document.querySelector("#reportCountry").value = parts.country;
    if (parts.city) document.querySelector("#reportCity").value = parts.city;
    if (parts.area) form.elements.area.value = parts.area;
    addressInput.value = parts.full;
    locationSearch.value = parts.full;
    suggestions.hidden = true;
    setPickerMarker(result.lat, result.lon);
    setLocationStatus(`Selected: ${parts.full || `${result.lat}, ${result.lon}`}`, "success");
  }

  async function reverseGeocode(lat, lng) {
    try {
      setLocationStatus("Finding the selected address…");
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
      const response = await fetch(url, { headers:{ "Accept-Language":"en" } });
      if (!response.ok) throw new Error();
      const result = await response.json();
      applyAddress({ ...result, lat, lon:lng });
    } catch (_) {
      addressInput.value = `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
      setLocationStatus("Exact map point selected. Complete the country, city and area fields.", "success");
    }
  }

  function selectMapPoint(lat, lng, reverse = false, moveMarker = true) {
    if (moveMarker) setPickerMarker(lat, lng);
    else {
      latitudeInput.value = Number(lat).toFixed(6);
      longitudeInput.value = Number(lng).toFixed(6);
    }
    if (reverse) reverseGeocode(lat, lng);
  }

  async function searchAddresses(query) {
    if (query.length < 3) {
      suggestions.hidden = true;
      return;
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, { headers:{ "Accept-Language":"en" } });
      if (!response.ok) throw new Error();
      suggestionResults = await response.json();
      suggestions.innerHTML = suggestionResults.length
        ? suggestionResults.map((item, index) => `<button class="lf-location-suggestion" type="button" data-location-index="${index}">${safe(item.display_name)}</button>`).join("")
        : '<div class="lf-location-suggestion">No matching addresses found. Click directly on the map.</div>';
      suggestions.hidden = false;
    } catch (_) {
      suggestions.innerHTML = '<div class="lf-location-suggestion">Address search is unavailable. Click directly on the map.</div>';
      suggestions.hidden = false;
    }
  }

  function ensureReportsMap() {
    if (reportsMap || !window.ThePetGridMapCore?.MapManager) return;
    const manager = new window.ThePetGridMapCore.MapManager({ container:"lostFoundReportsMap", center:DEFAULT_CENTER, zoom:4.5, minZoom:2, maxZoom:18, navigation:true });
    reportsMap = manager.map;
    window.ThePetGridLostFoundMap = reportsMap;
    window.dispatchEvent(new CustomEvent("thepetgrid:lost-found-map-ready", { detail:{ map:reportsMap } }));
    reportsMap.on("load", renderReportMarkers);
  }

  function renderReportMarkers() {
    if (!reportsMap || !reportsMap.loaded()) return;
    reportMarkers.forEach(marker => marker.remove());
    reportMarkers = [];
    const bounds = new maplibregl.LngLatBounds();
    allReports().forEach(report => {
      const lat = numberOrNull(report.latitude);
      const lng = numberOrNull(report.longitude);
      if (lat === null || lng === null) return;
      const state = report.resolved ? "resolved" : report.status === "found" ? "found" : "lost";
      const element = markerElement(`lf-report-map-marker is-${state}`, report.resolved ? "✓" : report.status === "found" ? "🐾" : "!"
      );
      const popup = new maplibregl.Popup({ offset:20 }).setHTML(`<div class="lf-map-popup"><strong>${safe(report.name || "Pet report")}</strong><span>${safe(report.address || report.city || "Selected map point")}</span><span>${report.resolved ? "✅ Resolved" : report.status === "found" ? "🟢 Found" : "🔴 Lost"}</span></div>`);
      const marker = new maplibregl.Marker({ element, anchor:"center" }).setLngLat([lng, lat]).setPopup(popup).addTo(reportsMap);
      reportMarkers.push(marker);
      bounds.extend([lng, lat]);
    });
    storedSightings().forEach(sighting=>{const lat=numberOrNull(sighting.latitude),lng=numberOrNull(sighting.longitude);if(lat===null||lng===null)return;const element=markerElement("lf-sighting-marker","👁");const popup=new maplibregl.Popup({offset:18}).setHTML(`<div class="lf-map-popup"><strong>Community sighting</strong><span>${safe(relativeSightingTime(sighting.seenAt))}</span><span>${safe(sighting.note||"No note added")}</span></div>`);const marker=new maplibregl.Marker({element,anchor:"center"}).setLngLat([lng,lat]).setPopup(popup).addTo(reportsMap);reportMarkers.push(marker);bounds.extend([lng,lat])});
    if (!bounds.isEmpty()) reportsMap.fitBounds(bounds, { padding:60, maxZoom:12, duration:500 });
  }

  function focusReportOnMap(reportId) {
    const report = allReports().find(item => String(item.id) === String(reportId));
    const lat = numberOrNull(report?.latitude);
    const lng = numberOrNull(report?.longitude);
    if (!report || lat === null || lng === null || !reportsMap) return;
    document.querySelector("#lostFoundReportsMap")?.scrollIntoView({ behavior:"smooth", block:"center" });
    reportsMap.easeTo({ center:[lng, lat], zoom:15, duration:700 });
    const index = allReports().filter(item => numberOrNull(item.latitude) !== null && numberOrNull(item.longitude) !== null).findIndex(item => String(item.id) === String(reportId));
    reportMarkers[index]?.togglePopup();
  }

  function ensureHomeAgainToast() {
    let toast = document.querySelector("#homeAgainToast");

    if (toast) {
      return toast;
    }

    toast = document.createElement("section");
    toast.id = "homeAgainToast";
    toast.className = "lf-home-again-toast";
    toast.hidden = true;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);

    return toast;
  }

  function showHomeAgainToast(report) {
    const toast = ensureHomeAgainToast();

    toast.innerHTML = `
      <span class="lf-home-again-toast__icon" aria-hidden="true">🏡</span>
      <span>
        <small>HOME AGAIN</small>
        <strong>${safe(report.name || "This pet")} is safely back home.</strong>
        <em>Thank you to everyone who helped.</em>
      </span>
    `;

    toast.hidden = false;
    toast.classList.remove("is-leaving");

    requestAnimationFrame(() => {
      toast.classList.add("is-visible");
    });

    window.clearTimeout(showHomeAgainToast.timer);

    showHomeAgainToast.timer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
      toast.classList.add("is-leaving");

      window.setTimeout(() => {
        toast.hidden = true;
        toast.classList.remove("is-leaving");
      }, 240);
    }, 4800);
  }

  function filteredReports() {
    return allReports().filter(item => {
      if (currentFilter === "all") return true;
      if (currentFilter === "resolved") return Boolean(item.resolved);
      if (currentFilter === "lost") return item.status === "lost" && !item.resolved;
      if (currentFilter === "found") return item.status === "found" && !item.resolved;
      return true;
    });
  }

  function render() {
    if (!grid) return;
    const reports = filteredReports();
    grid.innerHTML = reports.length ? reports.map(item => {
      const state = item.resolved ? "resolved" : item.status === "found" ? "found" : "lost";
      const hasLocation = numberOrNull(item.latitude) !== null && numberOrNull(item.longitude) !== null;
      const canResolve = !item.isCloudReport || String(item.ownerId || "") === String(currentUserId || "");
      const contact = currentUserId && !item.resolved
        ? `${item.phone ? `<a class="lf-card__action" href="tel:${safe(item.phone)}">📞 Call reporter</a>` : ""}${item.email ? `<a class="lf-card__action" href="mailto:${safe(item.email)}?subject=${encodeURIComponent(`ThePetGrid: ${item.name || "pet report"}`)}">✉️ Email</a>` : ""}`
        : (!currentUserId && !item.resolved ? `<a class="lf-card__action" href="./login.html">🔒 Sign in for contact</a>` : "");
      const statusLabel = item.resolved
        ? "HOME AGAIN"
        : state.toUpperCase();

      return `<article id="report-card-${safe(item.id)}" class="lf-card${item.resolved ? " is-resolved" : ""}" data-report-id="${safe(item.id)}"><div class="lf-card__media"><img src="${safe(item.image || PLACEHOLDER)}" alt="${safe(item.name || "Pet report")}" loading="lazy"><span class="lf-status lf-status--${state}">${statusLabel}</span></div><div class="lf-card__body"><h3>${safe(item.name || "Unknown pet")}</h3><div class="lf-meta"><span>🐾 ${safe(item.type || "Pet")}</span><span>📍 ${safe(item.address || item.city || "Location unavailable")}</span></div><p class="lf-description">${safe(item.description || "Community report")}</p>${(() => { const sightings = reportSightings(item.id); return sightings.length ? `<div class="lf-sighting-summary"><span>👁 ${sightings.length} sighting${sightings.length === 1 ? "" : "s"}</span><small>Latest: ${safe(relativeSightingTime(sightings[0].seenAt))}</small></div>` : ""; })()}<div class="lf-card__footer"><span>${item.resolved ? "🏡 Safely home" : "Community alert"}</span><span class="lf-date">${safe(item.resolvedAt ? new Date(item.resolvedAt).toLocaleDateString() : item.date || "")}</span></div><div class="lf-card__actions">${hasLocation ? `<button class="lf-card__action lf-card__action--map" type="button" data-view-report-map="${safe(item.id)}">📍 View on map</button>` : ""}${item.status === "lost" && !item.resolved ? `<button class="lf-card__action lf-card__action--sighting" type="button" data-report-sighting="${safe(item.id)}" data-pet-name="${safe(item.name)}">👁 I saw this pet</button>` : ""}${contact}<button class="lf-card__action lf-card__action--share" type="button" data-share-url="${safe(`${location.origin}${location.pathname}?reportId=${encodeURIComponent(item.id)}#reports`)}" data-share-title="${safe(item.resolved ? `${item.name || "This pet"} is Home Again` : `Help find ${item.name || "this lost pet"}`)}" data-share-text="${safe(item.resolved ? `🏡 Great news — ${item.name || "this pet"} is safely back home.` : `🚨 ${item.name || "A pet"} is missing near ${item.address || item.city || "this area"}. Please help.`)}">📤 Share</button>${item.status === "lost" && !item.resolved && canResolve ? `<button class="lf-card__action lf-card__action--home" type="button" data-resolve-report="${safe(item.id)}">🏡 Home Again</button>` : ""}</div></div></article>`;
    }).join("") : '<div class="lf-empty"><strong>No reports in this category yet.</strong>New community reports will appear here.</div>';
    renderReportMarkers();
  }

  async function resolveReport(reportId) {
    const report = allReports().find(
      item => String(item.id) === String(reportId)
    );

    if (
      !report ||
      report.resolved ||
      report.status !== "lost"
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Has ${report.name || "this pet"} returned home safely?`
    );

    if (!confirmed) {
      return;
    }

    const resolvedAt = new Date().toISOString();
    const updatedReport = {
      ...report,
      resolved: true,
      resolvedAt,
      homeAgain: true
    };

    if (
      report.isCloudReport &&
      String(report.ownerId || "") === String(currentUserId || "")
    ) {
      const client = window.ThePetGridSupabase?.client;

      if (!client) {
        window.alert("The connection is unavailable. Try again.");
        return;
      }

      const { error } = await client
        .from("lost_pet_reports")
        .update({
          resolved: true,
          resolved_at: resolvedAt
        })
        .eq("id", report.id)
        .eq("reporter_id", currentUserId);

      if (error) {
        window.alert(
          error.message ||
          "The Home Again update could not be saved."
        );
        return;
      }

      cloudReports = cloudReports.map(item =>
        String(item.id) === String(report.id)
          ? {
              ...item,
              resolved: true,
              resolvedAt,
              homeAgain: true
            }
          : item
      );
    }

    saveOrUpdateReport(updatedReport);

    currentFilter = "resolved";
    filters.forEach(item =>
      item.classList.toggle(
        "is-active",
        item.dataset.lfFilter === "resolved"
      )
    );

    render();
    showHomeAgainToast(updatedReport);

    window.dispatchEvent(
      new CustomEvent("thepetgrid:home-again", {
        detail: {
          reportId: updatedReport.id,
          petId: updatedReport.petId || null,
          petName: updatedReport.name,
          resolvedAt
        }
      })
    );

    window.setTimeout(() => {
      document.querySelector("#reports")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 350);
  }

  function setMode(mode) {
    const status = mode === "found" ? "found" : "lost";
    statusInput.value = status;
    formTitle.textContent = status === "lost" ? "🆘 Report a Lost Pet" : "🐾 Report a Found Pet";
    document.querySelectorAll("[data-open-report]").forEach(button => button.classList.toggle("is-active", button.dataset.openReport === status));
  }

  function openForm(mode = "lost") {
    if (!currentUserId && !IS_LOCAL_DEVELOPMENT) {
      const returnTo = `${location.pathname}?mode=${encodeURIComponent(mode)}${params.get("petId") ? `&petId=${encodeURIComponent(params.get("petId"))}` : ""}`;
      sessionStorage.setItem("thepetgrid_after_login", returnTo);
      location.href = `login.html?returnTo=${encodeURIComponent(returnTo)}`;
      return;
    }

    setMode(mode);
    formSection.hidden = false;
    formSection.scrollIntoView({ behavior:"smooth", block:"start" });
    setTimeout(() => {
      ensurePickerMap();
      pickerMap?.resize();
      document.querySelector("#reportPetName")?.focus();
    }, 350);
  }

  async function prefillPet() {
    const pet = await findPet(params.get("petId"));
    if (!pet) {
      message.textContent = "The pet profile could not be loaded automatically. You can still complete the report manually.";
      message.hidden = false;
      return;
    }
    document.querySelector("#reportPetName").value = pet.name || "";
    const typeInput = document.querySelector("#reportPetType");
    const supportedTypes = [...typeInput.options].map(option => option.value);
    typeInput.value = supportedTypes.includes(pet.type) ? pet.type : "Other";
    document.querySelector("#reportBreed").value = pet.breed || "";
    document.querySelector("#reportAge").value = pet.age ?? "";
    document.querySelector("#reportGender").value = ["Male", "Female"].includes(pet.gender) ? pet.gender : "";
    document.querySelector("#reportCountry").value = pet.country || "";
    document.querySelector("#reportCity").value = pet.city || "";
    document.querySelector("#reportOwner").value = pet.owner || "";
    document.querySelector("#reportPetId").value = pet.id || "";
    imageData = pet.image || pet.image_url || "";
    imagePreview.src = imageData || PLACEHOLDER;
    imagePreview.hidden = false;
    message.textContent = `${pet.name || "Pet"} profile details were added automatically. Now select where and when the pet was lost.`;
    message.hidden = false;
  }

  document.querySelectorAll("[data-open-report]").forEach(button => button.addEventListener("click", event => {
    event.preventDefault();
    openForm(button.dataset.openReport);
  }));

  document.querySelector("#closeReportForm")?.addEventListener("click", () => { formSection.hidden = true; });

  locationSearch?.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => searchAddresses(locationSearch.value.trim()), 450);
  });

  suggestions?.addEventListener("click", event => {
    const button = event.target.closest("[data-location-index]");
    if (!button) return;
    const result = suggestionResults[Number(button.dataset.locationIndex)];
    if (result) applyAddress(result);
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".lf-location-search-wrap")) suggestions.hidden = true;
  });

  imageInput?.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please choose an image file."); imageInput.value = ""; return; }
    if (file.size > 4 * 1024 * 1024) { alert("The image must be smaller than 4 MB."); imageInput.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => { imageData = String(reader.result || ""); imagePreview.src = imageData; imagePreview.hidden = false; };
    reader.readAsDataURL(file);
  });

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const latitude = numberOrNull(latitudeInput.value);
    const longitude = numberOrNull(longitudeInput.value);
    if (latitude === null || longitude === null) {
      setLocationStatus("Choose an address from the list or click the exact point on the map.", "error");
      document.querySelector("#reportLocationMap")?.scrollIntoView({ behavior:"smooth", block:"center" });
      return;
    }
    const data = new FormData(form);
    const cityLabel = [data.get("area"), data.get("city"), data.get("country")].filter(Boolean).join(", ");
    let report = {
      id:`lf-${Date.now()}`, petId:data.get("petId") || null,
      status:data.get("status") === "found" ? "found" : "lost", name:data.get("petName").trim() || "Unknown pet",
      type:data.get("petType"), breed:data.get("breed").trim(), age:data.get("age").trim(), color:data.get("color").trim(), gender:data.get("gender"),
      date:data.get("date"), country:data.get("country").trim(), city:cityLabel, area:data.get("area").trim(), address:data.get("address").trim(),
      latitude, longitude, phone:data.get("phone").trim(), email:data.get("email").trim(), owner:data.get("owner").trim(),
      description:data.get("description").trim(), reward:data.get("reward").trim(), image:imageData || PLACEHOLDER,
      createdAt:new Date().toISOString(), resolved:false
    };
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
      report = await publishCloudReport(report);
      saveOrUpdateReport(report);

      message.textContent = report.status === "lost"
        ? "Lost pet alert published successfully. It is now visible across ThePetGrid."
        : "Found pet report published successfully. It is now visible across ThePetGrid.";
      message.hidden = false;

      currentFilter = report.status;
      filters.forEach(item => item.classList.toggle("is-active", item.dataset.lfFilter === currentFilter));

      form.reset();
      imageData = "";
      imagePreview.hidden = true;
      latitudeInput.value = "";
      longitudeInput.value = "";
      addressInput.value = "";
      if (pickerMarker) { pickerMarker.remove(); pickerMarker = null; }

      await loadCloudReports();
      render();
      setTimeout(() => document.querySelector("#reports")?.scrollIntoView({ behavior:"smooth" }), 500);
    } catch (error) {
      console.error("ThePetGrid Lost & Found publish:", error);

      if (error?.code === "AUTH_REQUIRED") {
        const returnTo = `${location.pathname}?mode=${encodeURIComponent(report.status)}${report.petId ? `&petId=${encodeURIComponent(report.petId)}` : ""}`;
        sessionStorage.setItem("thepetgrid_after_login", returnTo);
        location.href = `login.html?returnTo=${encodeURIComponent(returnTo)}`;
        return;
      }

      message.textContent = error?.message || "The alert could not be published. Please try again.";
      message.hidden = false;
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  filters.forEach(button => button.addEventListener("click", () => {
    currentFilter = button.dataset.lfFilter || "all";
    filters.forEach(item => item.classList.toggle("is-active", item === button));
    render();
  }));

  grid?.addEventListener("click", event => {
    const mapButton = event.target.closest("[data-view-report-map]");
    const resolveButton = event.target.closest("[data-resolve-report]");
    const sightingButton = event.target.closest("[data-report-sighting]");
    if (mapButton) focusReportOnMap(mapButton.dataset.viewReportMap);
    if (resolveButton) resolveReport(resolveButton.dataset.resolveReport);
    if (sightingButton) openSimpleSighting(sightingButton.dataset.reportSighting);
  });
  document.querySelectorAll("[data-close-simple-sighting]").forEach(button=>button.addEventListener("click",closeSimpleSighting));
  simpleSightingPhotoToggle?.addEventListener("click",()=>{simpleSightingPhotoField.hidden=!simpleSightingPhotoField.hidden;simpleSightingPhotoToggle.textContent=simpleSightingPhotoField.hidden?"+ Add photo":"− Remove photo";if(simpleSightingPhotoField.hidden)simpleSightingPhoto.value=""});
  document.querySelector("#lfSimpleUseLocation")?.addEventListener("click",()=>{if(!navigator.geolocation){setSimpleSightingMessage("Location is not available on this device.","error");return}setSimpleSightingMessage("Finding your location…");navigator.geolocation.getCurrentPosition(position=>{setSimpleSightingMessage("");setSimpleSightingPoint(position.coords.latitude,position.coords.longitude)},()=>setSimpleSightingMessage("We could not access your location. Tap the map instead.","error"),{enableHighAccuracy:true,timeout:10000,maximumAge:30000})});
  simpleSightingForm?.addEventListener("submit",async event=>{event.preventDefault();const latitude=numberOrNull(simpleSightingLatitude.value),longitude=numberOrNull(simpleSightingLongitude.value);if(latitude===null||longitude===null){setSimpleSightingMessage("Tap the map to choose where you saw the pet.","error");return}if(!simpleSightingTime.value){setSimpleSightingMessage("Choose when you saw the pet.","error");return}const submitButton=simpleSightingForm.querySelector('[type="submit"]');submitButton.disabled=true;try{const image=await fileToDataUrl(simpleSightingPhoto.files?.[0]);saveSighting({id:`sighting-${Date.now()}`,reportId:simpleSightingReportId.value,latitude,longitude,seenAt:new Date(simpleSightingTime.value).toISOString(),note:simpleSightingNote.value.trim(),image,createdAt:new Date().toISOString()});setSimpleSightingMessage("Sighting submitted. Thank you for helping.");render();setTimeout(closeSimpleSighting,900)}catch(error){setSimpleSightingMessage(error.message||"The sighting could not be saved.","error")}finally{submitButton.disabled=false}});
  window.addEventListener("thepetgrid:sightings-changed",render);
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!simpleSightingModal?.hidden)closeSimpleSighting()});

  async function initialize() {
    const client = window.ThePetGridSupabase?.client;
    if (client) {
      const { data } = await client.auth.getSession();
      currentUserId = data?.session?.user?.id || null;

      client.auth.onAuthStateChange((_event, session) => {
        currentUserId = session?.user?.id || null;
      });

      await loadCloudReports();
      subscribeCloudReports();
    }
    ensureReportsMap();
    const requestedMode = params.get("mode");
    if (requestedMode === "lost" || requestedMode === "found") {
      openForm(requestedMode);
      await prefillPet();
    }
    render();
    const requestedReportId = params.get("reportId");
    if (requestedReportId) setTimeout(() => focusReportOnMap(requestedReportId), 700);
  }

  initialize();
})();
