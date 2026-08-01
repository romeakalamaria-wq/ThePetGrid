(() => {
  "use strict";
  const client = window.ThePetGridSupabase?.client;
  if (!client) return;
  let user = null, dialogMap = null, dialogMarker = null, markers = [], channel = null;
  const safe = value => String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function ensureDialog() {
    let modal = document.getElementById("sightingModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "sightingModal"; modal.className = "sighting-modal"; modal.hidden = true;
    modal.innerHTML = `<div class="sighting-modal__backdrop" data-close-sighting></div><section class="sighting-modal__card" role="dialog" aria-modal="true"><button class="sighting-modal__close" type="button" data-close-sighting>×</button><span class="lf-eyebrow">Community sighting</span><h2>👁 I saw <span id="sightingPetName">this pet</span></h2><p>Place the point where you saw the pet. The owner will receive a permanent notification.</p><form id="sightingForm"><input type="hidden" name="reportId"><input type="hidden" name="latitude"><input type="hidden" name="longitude"><label>When did you see the pet?<input type="datetime-local" name="observedAt" required></label><label>Location / landmark<input name="address" maxlength="200" placeholder="Street, park or landmark"></label><div id="sightingMap" class="sighting-map"></div><button class="sighting-use-location" type="button" data-sighting-location>📍 Use my current location</button><label>What did you see?<textarea name="note" required minlength="3" maxlength="600" rows="4" placeholder="Direction, condition, collar or other useful details"></textarea></label><p id="sightingStatus" class="sighting-status">Click the exact point on the map.</p><button class="sighting-submit" type="submit">Send sighting to owner</button></form></section>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", event => { if (event.target.closest("[data-close-sighting]")) modal.hidden = true; });
    modal.querySelector("[data-sighting-location]").addEventListener("click", () => navigator.geolocation?.getCurrentPosition(position => setPoint(position.coords.latitude, position.coords.longitude), () => setStatus("Location permission was not granted.", true)));
    modal.querySelector("#sightingForm").addEventListener("submit", submitSighting);
    return modal;
  }
  function setStatus(text, error = false) { const el = document.querySelector("#sightingStatus"); el.textContent = text; el.classList.toggle("is-error", error); }
  function setPoint(lat, lng) {
    const form = document.querySelector("#sightingForm"); form.elements.latitude.value = Number(lat).toFixed(6); form.elements.longitude.value = Number(lng).toFixed(6);
    if (!dialogMarker) dialogMarker = new maplibregl.Marker({ color:"#7c3aed", draggable:true }).setLngLat([lng,lat]).addTo(dialogMap);
    else dialogMarker.setLngLat([lng,lat]);
    dialogMarker.on("dragend", () => { const p=dialogMarker.getLngLat(); form.elements.latitude.value=p.lat.toFixed(6); form.elements.longitude.value=p.lng.toFixed(6); });
    dialogMap.easeTo({ center:[lng,lat], zoom:15, duration:450 }); setStatus("✅ Sighting point selected.");
  }
  function openDialog(button) {
    if (!user) { location.href = `login.html?returnTo=${encodeURIComponent(location.pathname.split('/').pop()+location.search)}`; return; }
    const modal = ensureDialog(), form = modal.querySelector("#sightingForm");
    form.reset(); form.elements.reportId.value = button.dataset.reportSighting; modal.querySelector("#sightingPetName").textContent = button.dataset.petName || "this pet";
    const now = new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16); form.elements.observedAt.value = now; modal.hidden = false;
    setTimeout(() => {
      if (!dialogMap) { dialogMap = new maplibregl.Map({ container:"sightingMap", style:window.ThePetGridMapStyle?.create?.() || "https://demotiles.maplibre.org/style.json", center:[23.7275,37.9838], zoom:5 }); dialogMap.addControl(new maplibregl.NavigationControl(),"top-right"); dialogMap.on("click", event => setPoint(event.lngLat.lat,event.lngLat.lng)); }
      dialogMap.resize(); dialogMarker?.remove(); dialogMarker=null;
    },100);
  }
  async function submitSighting(event) {
    event.preventDefault(); const form=event.currentTarget; const button=form.querySelector(".sighting-submit");
    if (!form.elements.latitude.value || !form.elements.longitude.value) { setStatus("Choose the exact point on the map.",true); return; }
    button.disabled=true; setStatus("Sending sighting…");
    const { error } = await client.from("lost_pet_sightings").insert({ report_id:form.elements.reportId.value, reporter_id:user.id, latitude:Number(form.elements.latitude.value), longitude:Number(form.elements.longitude.value), address:form.elements.address.value.trim(), note:form.elements.note.value.trim(), observed_at:new Date(form.elements.observedAt.value).toISOString() });
    button.disabled=false;
    if (error) { setStatus(error.message.includes("invalid input syntax") ? "This demo report cannot receive sightings. Try a real community report." : error.message,true); return; }
    setStatus("✅ Sighting sent. The owner has been notified."); await loadSightings(); setTimeout(()=>{ document.getElementById("sightingModal").hidden=true; },1000);
  }
  async function loadSightings() {
    const { data, error } = await client.from("lost_pet_sightings").select("id,report_id,latitude,longitude,address,note,observed_at").order("observed_at",{ascending:false}).limit(300);
    if (error) { console.info("Run the Sprint 9.5 sightings SQL.",error.message); return; }
    renderMarkers(data || []);
  }
  function renderMarkers(items) {
    const map=window.ThePetGridLostFoundMap; if (!map || !map.loaded()) { setTimeout(()=>renderMarkers(items),500); return; }
    markers.forEach(marker=>marker.remove()); markers=[];
    document.querySelectorAll(".lf-sighting-count").forEach(item=>item.remove());
    const counts=new Map(); items.forEach(item=>counts.set(String(item.report_id),(counts.get(String(item.report_id))||0)+1));
    counts.forEach((count,reportId)=>{ const card=document.querySelector(`[data-report-id="${CSS.escape(reportId)}"] .lf-card__footer`); if(card) card.insertAdjacentHTML("beforeend",`<span class="lf-sighting-count">👁 ${count} possible sighting${count===1?"":"s"}</span>`); });
    items.forEach(item=>{ const el=document.createElement("div"); el.className="lf-sighting-marker"; el.textContent="👁"; const popup=new maplibregl.Popup({offset:18}).setHTML(`<div class="lf-map-popup"><strong>Possible sighting</strong><span>${safe(item.address||"Selected point")}</span><span>${safe(item.note)}</span><small>${new Date(item.observed_at).toLocaleString()}</small></div>`); markers.push(new maplibregl.Marker({element:el}).setLngLat([item.longitude,item.latitude]).setPopup(popup).addTo(map)); });
  }
  document.addEventListener("click", event => { const button=event.target.closest("[data-report-sighting]"); if (button) openDialog(button); });
  client.auth.getSession().then(({data})=>{ user=data.session?.user||null; loadSightings(); channel=client.channel("lost-pet-sightings-live").on("postgres_changes",{event:"*",schema:"public",table:"lost_pet_sightings"},loadSightings).subscribe(); });
})();
