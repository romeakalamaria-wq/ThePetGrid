(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const ui = {
    boot: $("#worldBoot"), bootProgress: $("#bootProgress"), bootStatus: $("#bootStatus"), app: $("#worldExperience"),
    stage: $("#globeStage"), starCanvas: $("#starCanvas"), fallback: $("#globeFallback"), petCount: $("#worldPetCount"),
    countryCount: $("#worldCountryCount"), cityCount: $("#worldCityCount"), activePlace: $("#activePlace"), explore: $("#exploreWorld"),
    reset: $("#returnHome"), motion: $("#toggleMotion"), lite: $("#toggleLite"), sound: $("#toggleSound"), toast: $("#worldToast"),
    quality: $("#qualityBadge"), fps: $("#fpsReadout"), clock: $("#worldClock"), liveSignal: $("#liveSignal"), liveSignalText: $("#liveSignalText"),
    modes: [...document.querySelectorAll("[data-world-mode]")], focusCard:$("#petFocusCard"), focusImage:$("#petFocusImage"), focusType:$("#petFocusType"), focusName:$("#petFocusName"), focusLocation:$("#petFocusLocation"), focusSignal:$("#petFocusSignal"), focusLink:$("#petFocusLink"), focusFlag:$("#petFocusFlag"), focusTime:$("#petFocusTime"), focusStory:$("#petFocusStory"), exploreNext:$("#exploreNextStory"), closeFocus:$("#closePetFocus"), eventsPanel:$("#worldEventsPanel"), eventsList:$("#worldEventsList"), eventsEmpty:$("#worldEventsEmpty"), eventsToggle:$("#toggleWorldEvents")
  };

  const DEMO_PETS = [
    {name:"Luna",city:"Athens",country:"Greece",latitude:37.9838,longitude:23.7275,type:"Dog"},{name:"Milo",city:"Rome",country:"Italy",latitude:41.9028,longitude:12.4964,type:"Cat"},
    {name:"Yuki",city:"Tokyo",country:"Japan",latitude:35.6762,longitude:139.6503,type:"Dog"},{name:"Coco",city:"Sydney",country:"Australia",latitude:-33.8688,longitude:151.2093,type:"Bird"},
    {name:"Bella",city:"New York",country:"USA",latitude:40.7128,longitude:-74.006,type:"Cat"},{name:"Max",city:"London",country:"United Kingdom",latitude:51.5072,longitude:-.1276,type:"Dog"},
    {name:"Nala",city:"Cape Town",country:"South Africa",latitude:-33.9249,longitude:18.4241,type:"Cat"},{name:"Rio",city:"São Paulo",country:"Brazil",latitude:-23.5505,longitude:-46.6333,type:"Dog"},
    {name:"Kiko",city:"Manila",country:"Philippines",latitude:14.5995,longitude:120.9842,type:"Dog"},{name:"Leo",city:"Paris",country:"France",latitude:48.8566,longitude:2.3522,type:"Cat"},
    {name:"Olive",city:"Toronto",country:"Canada",latitude:43.6532,longitude:-79.3832,type:"Rabbit"},{name:"Simba",city:"Dubai",country:"UAE",latitude:25.2048,longitude:55.2708,type:"Cat"}
  ];

  const state = {
    globe:null,pets:[],rotating:true,lite:false,sound:false,starFrame:0,stars:[],mode:"all",quality:"high",clouds:null,sun:null,
    realtime:null,lastFrame:performance.now(),frameSamples:[],pulseTimer:null,clockTimer:null,audio:null,rings:[],selectedPet:null,storyHistory:[],exploredPets:new Set(),exploredCountries:new Set(),exploredCities:new Set(),events:[],eventsCollapsed:false
  };
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const setBoot = (percent, text) => { ui.bootProgress.style.width = `${percent}%`; ui.bootStatus.textContent = text; };
  const escapeHtml = (value) => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function toast(message){ui.toast.textContent=message;ui.toast.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>ui.toast.hidden=true,2400)}
  function countUp(element,target){const start=Number(String(element.textContent).replace(/\D/g,""))||0,begin=performance.now(),duration=900;const tick=now=>{const p=Math.min(1,(now-begin)/duration);element.textContent=Math.round(start+(target-start)*(1-Math.pow(1-p,3))).toLocaleString("en-GB");if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)}

  function detectQuality(){
    const cores=navigator.hardwareConcurrency||4,memory=navigator.deviceMemory||4,pixels=innerWidth*innerHeight*(devicePixelRatio||1);
    if(cores<=2||memory<=2||pixels>7_000_000)return "lite";
    if(cores>=8&&memory>=8&&pixels<5_000_000)return "ultra";
    return "high";
  }
  function setQuality(level,announce=false){
    state.quality=level;state.lite=level==="lite";ui.app.dataset.quality=level;ui.app.classList.toggle("is-lite",state.lite);ui.quality.textContent=level.toUpperCase();
    if(state.globe){state.globe.pointRadius(state.lite?.2:level==="ultra"?.38:.32).showAtmosphere(!state.lite);if(state.clouds)state.clouds.visible=!state.lite}
    if(announce)toast(`${level[0].toUpperCase()+level.slice(1)} rendering enabled`);
  }

  function initStars(){
    const canvas=ui.starCanvas,ctx=canvas.getContext("2d",{alpha:true});if(!ctx)return;
    const resize=()=>{const dpr=Math.min(devicePixelRatio||1,state.lite?1:1.6);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;canvas.style.width=`${innerWidth}px`;canvas.style.height=`${innerHeight}px`;ctx.setTransform(dpr,0,0,dpr,0,0);const base=state.lite?70:state.quality==="ultra"?360:240;const n=Math.min(base,Math.round(innerWidth*innerHeight/4700));state.stars=Array.from({length:n},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.35+.12,a:Math.random()*.65+.18,s:Math.random()*.045+.008,phase:Math.random()*Math.PI*2}))};
    const draw=(t=0)=>{ctx.clearRect(0,0,innerWidth,innerHeight);for(const s of state.stars){const alpha=Math.max(.08,Math.min(.95,s.a+Math.sin(t*.001*s.s*60+s.phase)*.2));ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(190,218,255,${alpha})`;ctx.fill()}state.starFrame=requestAnimationFrame(draw)};
    resize();addEventListener("resize",resize,{passive:true});draw();
  }

  async function loadPets(){
    const client=window.ThePetGridSupabase?.client;if(!client)return DEMO_PETS;
    try{const {data,error}=await client.from("pets").select("id,name,type,city,country,latitude,longitude,image_url,created_at").not("latitude","is",null).not("longitude","is",null).order("created_at",{ascending:false}).limit(2500);if(error)throw error;const pets=(data||[]).map(pet=>normalizePet({...pet,is_lost:false,is_memorial:false})).filter(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude));return pets.length?pets:DEMO_PETS.map(normalizePet)}
    catch(error){console.warn("World Experience: using demonstration points.",error);return DEMO_PETS}
  }

  function normalizePet(pet){return {...pet,latitude:Number(pet.latitude),longitude:Number(pet.longitude),is_lost:Boolean(pet.is_lost),is_memorial:Boolean(pet.is_memorial)}}
  function profileHref(pet){return pet?.id?`pet.html?id=${encodeURIComponent(pet.id)}`:"pets.html"}
  function petImage(pet){return pet?.image_url||pet?.image||"../assets/avatar.png"}
  function petKey(pet){return String(pet?.id ?? ([pet?.name,pet?.city,pet?.country].filter(Boolean).join("|") || Math.random()))}
  function countryFlag(country){
    const codes={Greece:"GR",Italy:"IT",Japan:"JP",Australia:"AU",USA:"US","United States":"US","United Kingdom":"GB",Brazil:"BR",France:"FR",Canada:"CA",UAE:"AE","United Arab Emirates":"AE","South Africa":"ZA",Philippines:"PH",Germany:"DE",Spain:"ES",Portugal:"PT",Cyprus:"CY",Turkey:"TR",India:"IN",China:"CN",Mexico:"MX",Argentina:"AR",Netherlands:"NL",Belgium:"BE",Sweden:"SE",Norway:"NO",Finland:"FI",Denmark:"DK",Poland:"PL",Austria:"AT",Switzerland:"CH",Romania:"RO",Bulgaria:"BG",Serbia:"RS",Croatia:"HR",Albania:"AL",Egypt:"EG",Morocco:"MA",Ireland:"IE","New Zealand":"NZ",Singapore:"SG",Malaysia:"MY",Thailand:"TH",Vietnam:"VN","South Korea":"KR",Indonesia:"ID"};
    const code=codes[String(country||"").trim()];
    return code?[...code].map(letter=>String.fromCodePoint(127397+letter.charCodeAt(0))).join(""):"🌍";
  }
  function relativeTime(value){
    if(!value)return "A living story";
    const time=new Date(value).getTime();if(!Number.isFinite(time))return "A living story";
    const diff=Math.max(0,Date.now()-time),minutes=Math.floor(diff/60000),hours=Math.floor(diff/3600000),days=Math.floor(diff/86400000);
    if(minutes<1)return "Joined just now";if(minutes<60)return `Joined ${minutes} min ago`;if(hours<24)return `Joined ${hours} hr${hours===1?"":"s"} ago`;if(days===1)return "Joined yesterday";if(days<7)return `Joined ${days} days ago`;return `Joined ${new Intl.DateTimeFormat("en-GB",{dateStyle:"medium"}).format(new Date(time))}`;
  }
  function storyText(pet){
    const name=pet?.name||"This pet",place=pet?.city||pet?.country||"the world";
    if(pet?.is_lost)return `${name}'s signal is being shared from ${place}. Every extra pair of eyes can help this story find its way home.`;
    if(pet?.is_memorial)return `${name}'s light continues to glow from ${place}, keeping a loved story present in the living world.`;
    const lines=[`${name} is one of the living lights glowing from ${place}.`,`${name}'s story has found a place on the world grid in ${place}.`,`A new connection begins with ${name}, shining from ${place}.`];
    let hash=0;for(const char of petKey(pet))hash=((hash<<5)-hash)+char.charCodeAt(0)|0;return lines[Math.abs(hash)%lines.length];
  }
  const EVENT_META = Object.freeze({
    new_pet:{icon:"🌟",label:"New pet",tone:660,color:"#69e8ff"},
    adoption:{icon:"❤️",label:"Adoption",tone:520,color:"#72ffb0"},
    lost:{icon:"🆘",label:"Lost alert",tone:360,color:"#ff526e"},
    birthday:{icon:"🎂",label:"Birthday",tone:740,color:"#ffc65c"},
    memorial:{icon:"🕊️",label:"Memorial",tone:420,color:"#e7e8ff"},
    milestone:{icon:"🏆",label:"Milestone",tone:600,color:"#a77cff"}
  });
  function createWorldEvent(type,pet,options={}){
    const meta=EVENT_META[type]||EVENT_META.new_pet;
    return {
      id:options.id||`${type}-${petKey(pet)}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      type,pet:pet||null,city:options.city||pet?.city||"",country:options.country||pet?.country||"",
      createdAt:options.createdAt||pet?.created_at||new Date().toISOString(),priority:options.priority||((type==="lost"||type==="adoption")?"high":"normal"),
      message:options.message||eventMessage(type,pet),icon:meta.icon,label:meta.label,color:meta.color,tone:meta.tone
    };
  }
  function eventMessage(type,pet){
    const name=pet?.name||"A pet",place=pet?.city||pet?.country||"the world";
    if(type==="adoption")return `${name} found a new home in ${place}.`;
    if(type==="lost")return `${name} was reported missing in ${place}.`;
    if(type==="birthday")return `${name} is celebrating today in ${place}.`;
    if(type==="memorial")return `${name}'s light shines from ${place}.`;
    if(type==="milestone")return `${place} reached a new community milestone.`;
    return `${name} joined the living world from ${place}.`;
  }
  function seedWorldEvents(){
    const recent=state.pets.slice(0,6).map((pet,index)=>createWorldEvent(index===1&&pet.is_lost?"lost":index===2&&pet.is_memorial?"memorial":"new_pet",pet,{createdAt:pet.created_at||new Date(Date.now()-index*18*60000).toISOString()}));
    state.events=recent;
    renderWorldEvents();
  }
  function pushWorldEvent(event,{announce=true}={}){
    state.events=[event,...state.events.filter(item=>item.id!==event.id)].slice(0,10);
    renderWorldEvents();
    if(announce){
      ui.liveSignalText.textContent=event.message;ui.liveSignal.hidden=false;clearTimeout(pushWorldEvent.hide);pushWorldEvent.hide=setTimeout(()=>ui.liveSignal.hidden=true,5200);
      playTone(event.tone,.11);
    }
  }
  function eventAge(value){
    const time=new Date(value).getTime();if(!Number.isFinite(time))return "Now";
    const diff=Math.max(0,Date.now()-time),mins=Math.floor(diff/60000),hours=Math.floor(diff/3600000),days=Math.floor(diff/86400000);
    if(mins<1)return "Now";if(mins<60)return `${mins}m`;if(hours<24)return `${hours}h`;if(days<7)return `${days}d`;return new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short"}).format(new Date(time));
  }
  function renderWorldEvents(){
    if(!ui.eventsList)return;
    ui.eventsEmpty.hidden=state.events.length>0;
    ui.eventsList.innerHTML=state.events.map(event=>`<button class="world-event" type="button" data-world-event-id="${escapeHtml(event.id)}" data-priority="${escapeHtml(event.priority)}" style="--event-color:${escapeHtml(event.color)}"><span class="world-event__icon">${event.icon}</span><span class="world-event__content"><strong>${escapeHtml(event.label)}</strong><span>${escapeHtml(event.message)}</span></span><time>${escapeHtml(eventAge(event.createdAt))}</time></button>`).join("");
  }
  function focusWorldEvent(event){
    if(!event)return;
    const pet=event.pet;
    if(pet&&Number.isFinite(Number(pet.latitude))&&Number.isFinite(Number(pet.longitude))){
      state.globe?.pointOfView({lat:Number(pet.latitude),lng:Number(pet.longitude),altitude:.68},1450);showPetFocus(pet);refreshLivingCells();
    }
    toast(event.message);playTone(event.tone,.1);
  }
  function toggleWorldEvents(){
    state.eventsCollapsed=!state.eventsCollapsed;ui.eventsPanel?.classList.toggle("is-collapsed",state.eventsCollapsed);ui.eventsToggle?.setAttribute("aria-expanded",String(!state.eventsCollapsed));if(ui.eventsToggle)ui.eventsToggle.textContent=state.eventsCollapsed?"+":"−";
  }

  function rememberStory(pet){
    const key=petKey(pet);state.exploredPets.add(key);if(pet?.country)state.exploredCountries.add(pet.country);if(pet?.city)state.exploredCities.add(`${pet.city}|${pet.country||""}`);
    state.storyHistory=state.storyHistory.filter(item=>petKey(item)!==key);state.storyHistory.unshift(pet);if(state.storyHistory.length>20)state.storyHistory.length=20;
  }
  function nextStoryPet(){
    if(!state.pets.length)return null;const current=state.selectedPet;const candidates=state.pets.filter(pet=>pet!==current);if(!candidates.length)return current||state.pets[0];
    const ranked=candidates.map(pet=>{let score=Math.random()*2;if(current?.city&&pet.city===current.city)score+=8;if(current?.country&&pet.country===current.country)score+=5;if(current?.type&&pet.type===current.type)score+=3;if(!state.exploredPets.has(petKey(pet)))score+=4;return {pet,score}}).sort((a,b)=>b.score-a.score);
    return ranked[0].pet;
  }
  function ringColor(point){const color=pointColor(point);return t=>color.startsWith("rgba")?color:`${color}${Math.max(0,Math.round((1-t)*210)).toString(16).padStart(2,"0")}`}
  function makeRings(pets){const limit=state.lite?Math.min(28,pets.length):Math.min(state.quality==="ultra"?120:70,pets.length);return pets.slice(0,limit).map((pet,index)=>({...pet,ringMax:state.lite?1.2:1.8+(index%4)*.18,ringSpeed:.35+(index%5)*.06,ringPeriod:950+(index%7)*170}))}
  function refreshLivingCells(){state.rings=makeRings(state.pets);if(state.globe){state.globe.ringsData(state.rings).ringColor(ringColor).ringMaxRadius("ringMax").ringPropagationSpeed("ringSpeed").ringRepeatPeriod("ringPeriod")}}
  function showPetFocus(pet,{animate=true}={}){
    state.selectedPet=pet;if(!ui.focusCard)return;rememberStory(pet);
    ui.focusImage.src=petImage(pet);ui.focusImage.alt=pet.name||"Pet";ui.focusType.textContent=String(pet.type||"Pet").toUpperCase();ui.focusName.textContent=pet.name||"Pet story";ui.focusLocation.textContent=[pet.city,pet.country].filter(Boolean).join(", ")||"Somewhere in the world";ui.focusSignal.textContent=pet.is_lost?"Lost signal — priority":pet.is_memorial?"Memorial light":"Living signal active";ui.focusLink.href=profileHref(pet);
    if(ui.focusFlag)ui.focusFlag.textContent=countryFlag(pet.country);if(ui.focusTime)ui.focusTime.textContent=relativeTime(pet.created_at);if(ui.focusStory)ui.focusStory.textContent=storyText(pet);
    ui.focusCard.hidden=false;if(animate){ui.focusCard.classList.remove("is-transitioning");void ui.focusCard.offsetWidth;ui.focusCard.classList.add("is-transitioning");}
    if(state.globe)state.globe.pointRadius(p=>p===state.selectedPet?(state.lite?.42:.62):(state.lite?.2:state.quality==="ultra"?.38:.32));
  }
  function exploreNextStory(){
    const next=nextStoryPet();if(!next)return;state.globe?.pointOfView({lat:Number(next.latitude),lng:Number(next.longitude),altitude:.62},1550);showPetFocus(next);toast(`Next story · ${next.name||"A pet"}`);playTone(560,.09);
  }
  function hidePetFocus(){state.selectedPet=null;if(ui.focusCard)ui.focusCard.hidden=true;if(state.globe)state.globe.pointRadius(state.lite?.2:state.quality==="ultra"?.38:.32)}

  function pointColor(point){if(state.mode==="lost")return point.is_lost?"#ff526e":"rgba(255,82,110,.035)";if(state.mode==="memorial")return point.is_memorial?"#f1efff":"rgba(231,232,255,.035)";const palette={Dog:"#68e8ff",Cat:"#a77cff",Bird:"#ffc85d",Rabbit:"#72ffb0"};return palette[point.type]||"#ffffff"}
  function pointAltitude(point){return point.is_lost?.2:point.is_memorial?.16:.095}
  function updateModeAtmosphere(mode){ui.app.classList.toggle("is-lost",mode==="lost");ui.app.classList.toggle("is-memorial",mode==="memorial");if(state.globe){state.globe.atmosphereColor(mode==="lost"?"#ff526e":mode==="memorial"?"#b6b7ff":"#5bc8ff")}}
  function applyMode(mode){state.mode=mode;ui.modes.forEach(button=>button.classList.toggle("is-active",button.dataset.worldMode===mode));updateModeAtmosphere(mode);if(state.globe)state.globe.pointColor(pointColor).pointAltitude(pointAltitude).pointsTransitionDuration(850);const labels={all:"The whole living world",pets:"Every light is a pet",lost:"Lost Pet Signal mode",memorial:"Memorial starlight mode"};toast(labels[mode])}

  function buildCloudLayer(world){
    if(!window.THREE||state.lite)return;
    const texture=new THREE.TextureLoader().load("https://unpkg.com/three-globe/example/img/earth-clouds.png");
    const geometry=new THREE.SphereGeometry(100.55,state.quality==="ultra"?96:64,state.quality==="ultra"?96:64);
    const material=new THREE.MeshPhongMaterial({map:texture,transparent:true,opacity:.34,depthWrite:false,blending:THREE.AdditiveBlending});
    const clouds=new THREE.Mesh(geometry,material);clouds.renderOrder=2;world.scene().add(clouds);state.clouds=clouds;
  }
  function buildLighting(world){
    if(!window.THREE)return;
    const material=world.globeMaterial();material.bumpScale=8;material.shininess=4;material.specular=new THREE.Color("#2b4f75");
    world.scene().children.filter(o=>o.isLight).forEach(light=>{if(light.type==="AmbientLight")light.intensity=.62});
    const sun=new THREE.DirectionalLight(0xffffff,2.15);sun.position.set(-180,80,120);world.scene().add(sun);state.sun=sun;
    const rim=new THREE.DirectionalLight(0x5bc8ff,.72);rim.position.set(140,-40,-120);world.scene().add(rim);
  }
  function animatePlanet(){
    const tick=()=>{if(state.clouds&&state.rotating&&!state.lite)state.clouds.rotation.y+=.00023;if(state.sun){const day=Date.now()/86400000*Math.PI*2;state.sun.position.set(Math.cos(day)*220,60,Math.sin(day)*220)}requestAnimationFrame(tick)};tick();
  }

  function makeGlobe(){
    if(typeof window.Globe!=="function"||!supportsWebGL())throw new Error("WebGL globe unavailable");
    const world=window.Globe()(ui.stage).width(innerWidth).height(innerHeight).backgroundColor("rgba(0,0,0,0)")
      .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-night.jpg").bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
      .showAtmosphere(true).atmosphereColor("#5bc8ff").atmosphereAltitude(.21).pointsData(state.pets).pointLat("latitude").pointLng("longitude").pointColor(pointColor)
      .pointAltitude(pointAltitude).pointRadius(p=>p===state.selectedPet?(state.lite?.42:.62):(state.lite?.2:state.quality==="ultra"?.38:.32)).pointsMerge(false).pointsTransitionDuration(900)
      .ringsData(state.rings).ringLat("latitude").ringLng("longitude").ringColor(ringColor).ringMaxRadius("ringMax").ringPropagationSpeed("ringSpeed").ringRepeatPeriod("ringPeriod")
      .pointLabel(point=>`<div class="living-cell-tooltip"><img src="${escapeHtml(petImage(point))}" alt=""><div><b>${escapeHtml(point.name||"Pet")}</b><span>${escapeHtml([point.type,point.city,point.country].filter(Boolean).join(" · "))}</span></div></div>`)
      .onPointClick(point=>{world.pointOfView({lat:Number(point.latitude),lng:Number(point.longitude),altitude:.62},1450);showPetFocus(point);toast(`${point.name||"A pet"} · ${point.city||point.country||"ThePetGrid"}`);playTone(520,.08)})
      .onGlobeClick(({lat,lng})=>world.pointOfView({lat,lng,altitude:1.38},1050));
    world.controls().autoRotate=true;world.controls().autoRotateSpeed=.29;world.controls().enableDamping=true;world.controls().dampingFactor=.075;world.controls().minDistance=118;world.controls().maxDistance=430;
    world.pointOfView({lat:18,lng:18,altitude:2.25},0);buildLighting(world);buildCloudLayer(world);animatePlanet();addEventListener("resize",()=>world.width(innerWidth).height(innerHeight),{passive:true});state.globe=world;
  }

  function supportsWebGL(){try{const c=document.createElement("canvas");return !!(window.WebGLRenderingContext&&(c.getContext("webgl")||c.getContext("experimental-webgl")))}catch{return false}}
  function updateStats(){const countries=new Set(state.pets.map(p=>p.country).filter(Boolean));const cities=new Set(state.pets.map(p=>`${p.city}|${p.country}`).filter(v=>!v.startsWith("|")));countUp(ui.petCount,state.pets.length);countUp(ui.countryCount,countries.size);countUp(ui.cityCount,cities.size);const active=[...cities].slice(0,3).map(v=>v.split("|")[0]).filter(Boolean);if(active.length)ui.activePlace.textContent=active.join(" · ")}
  function updateClock(){ui.clock.textContent=new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"UTC",hour12:false}).format(new Date())+" UTC"}

  function pulseRandomPet(){clearInterval(state.pulseTimer);state.pulseTimer=setInterval(()=>{if(!state.pets.length||document.hidden)return;const pet=state.pets[Math.floor(Math.random()*state.pets.length)];ui.liveSignalText.textContent=`${pet.name||"A pet"} is glowing from ${pet.city||pet.country||"the world"}`;ui.liveSignal.hidden=false;clearTimeout(pulseRandomPet.hide);pulseRandomPet.hide=setTimeout(()=>ui.liveSignal.hidden=true,4200)},8500)}
  function subscribeRealtime(){
    const client=window.ThePetGridSupabase?.client;if(!client?.channel)return;
    state.realtime=client.channel("atlas-living-world").on("postgres_changes",{event:"INSERT",schema:"public",table:"pets"},payload=>{
      const pet=normalizePet(payload.new);if(!Number.isFinite(pet.latitude)||!Number.isFinite(pet.longitude))return;state.pets.unshift(pet);state.globe?.pointsData([...state.pets]);refreshLivingCells();updateStats();pushWorldEvent(createWorldEvent("new_pet",pet));
    }).subscribe();
  }

  function monitorPerformance(){
    let frames=0,last=performance.now();const loop=now=>{frames++;if(now-last>=1000){const fps=Math.round(frames*1000/(now-last));ui.fps.textContent=`${fps} FPS`;state.frameSamples.push(fps);if(state.frameSamples.length>8)state.frameSamples.shift();const avg=state.frameSamples.reduce((a,b)=>a+b,0)/state.frameSamples.length;if(avg<32&&state.quality!=="lite")setQuality("lite",true);else if(avg<46&&state.quality==="ultra")setQuality("high",true);frames=0;last=now}requestAnimationFrame(loop)};requestAnimationFrame(loop)
  }

  function ensureAudio(){if(state.audio)return state.audio;const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return null;state.audio=new AudioCtx();return state.audio}
  function playTone(frequency=.2,duration=.1){if(!state.sound)return;const ctx=ensureAudio();if(!ctx)return;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type="sine";osc.frequency.value=frequency;gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.035,ctx.currentTime+.015);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration+.02)}

  function bind(){
    ui.explore.addEventListener("click",()=>{state.globe?.pointOfView({lat:20,lng:12,altitude:1.22},1800);playTone(420,.16)});ui.reset.addEventListener("click",()=>{window.location.href="upload.html"});
    ui.motion.addEventListener("click",()=>{state.rotating=!state.rotating;if(state.globe)state.globe.controls().autoRotate=state.rotating;ui.motion.setAttribute("aria-pressed",String(!state.rotating));ui.motion.textContent=state.rotating?"Pause motion":"Resume motion"});
    ui.lite.addEventListener("click",()=>{setQuality(state.lite?"high":"lite",true);ui.lite.setAttribute("aria-pressed",String(state.lite));ui.lite.textContent=state.lite?"Full effects":"Lite mode"});
    ui.sound.addEventListener("click",()=>{state.sound=!state.sound;ui.sound.setAttribute("aria-pressed",String(state.sound));ui.sound.textContent=state.sound?"Sound on":"Sound off";if(state.sound){ensureAudio()?.resume();playTone(440,.12)}toast(state.sound?"Ambient interaction sound enabled":"Sound disabled")});
    ui.modes.forEach(button=>button.addEventListener("click",()=>applyMode(button.dataset.worldMode)));ui.closeFocus?.addEventListener("click",hidePetFocus);ui.exploreNext?.addEventListener("click",exploreNextStory);ui.eventsToggle?.addEventListener("click",toggleWorldEvents);ui.eventsList?.addEventListener("click",event=>{const button=event.target.closest("[data-world-event-id]");if(!button)return;focusWorldEvent(state.events.find(item=>item.id===button.dataset.worldEventId));});document.addEventListener("keydown",event=>{if(event.key==="Escape")hidePetFocus();if(event.key.toLowerCase()==="n"&&!ui.focusCard?.hidden)exploreNextStory()});
  }

  async function init(){
    try{
      setBoot(12,"Calibrating Atlas Engine…");state.quality=detectQuality();setQuality(state.quality);initStars();await sleep(300);setBoot(34,"Igniting the sun…");await sleep(250);setBoot(52,"Finding living stories…");state.pets=(await loadPets()).map(normalizePet);state.rings=makeRings(state.pets);await sleep(220);setBoot(72,"Forming clouds and atmosphere…");makeGlobe();updateStats();updateClock();seedWorldEvents();state.clockTimer=setInterval(()=>{updateClock();renderWorldEvents()},30000);bind();subscribeRealtime();pulseRandomPet();monitorPerformance();await sleep(650);setBoot(100,"The planet is alive.");ui.app.hidden=false;await sleep(650);ui.boot.classList.add("is-leaving");setTimeout(()=>ui.boot.remove(),1100)
    }catch(error){console.error("ThePetGrid World Experience:",error);ui.app.hidden=false;ui.fallback.hidden=false;ui.boot.classList.add("is-leaving")}
  }
  init();
})();
