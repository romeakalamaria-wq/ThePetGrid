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
    realtime:null,lostRealtime:null,lastFrame:performance.now(),frameSamples:[],pulseTimer:null,clockTimer:null,audio:null,rings:[],selectedPet:null,storyHistory:[],exploredPets:new Set(),exploredCountries:new Set(),exploredCities:new Set(),events:[],eventsCollapsed:false,dayNightShader:null,nightTexture:null,manualQuality:false,clusterTimer:null,lastClusterBand:null,visualSignalTimer:null,localRefreshTimer:null
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
    if(state.globe){state.globe.pointRadius(state.lite?.2:level==="ultra"?.38:.32).showAtmosphere(!state.lite);if(state.clouds)state.clouds.visible=!state.lite;if(state.dayNightShader?.uniforms?.atlasNightStrength)state.dayNightShader.uniforms.atlasNightStrength.value=state.lite?.72:1.18}
    if(announce)toast(`${level[0].toUpperCase()+level.slice(1)} rendering enabled`);
  }

  function initStars(){
    const canvas=ui.starCanvas,ctx=canvas.getContext("2d",{alpha:true});if(!ctx)return;
    const resize=()=>{const dpr=Math.min(devicePixelRatio||1,state.lite?1:1.6);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;canvas.style.width=`${innerWidth}px`;canvas.style.height=`${innerHeight}px`;ctx.setTransform(dpr,0,0,dpr,0,0);const base=state.lite?70:state.quality==="ultra"?360:240;const n=Math.min(base,Math.round(innerWidth*innerHeight/4700));state.stars=Array.from({length:n},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.35+.12,a:Math.random()*.65+.18,s:Math.random()*.045+.008,phase:Math.random()*Math.PI*2}))};
    const draw=(t=0)=>{ctx.clearRect(0,0,innerWidth,innerHeight);for(const s of state.stars){const alpha=Math.max(.08,Math.min(.95,s.a+Math.sin(t*.001*s.s*60+s.phase)*.2));ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(190,218,255,${alpha})`;ctx.fill()}state.starFrame=requestAnimationFrame(draw)};
    resize();addEventListener("resize",resize,{passive:true});draw();
  }

  async function loadPets(){
    const client=window.ThePetGridSupabase?.client;

    const localLostReports=()=>{
      try{
        const reports=JSON.parse(localStorage.getItem("thepetgrid_lost_found_reports")||"[]");
        return Array.isArray(reports)
          ? reports.filter(report=>report?.status==="lost"&&!report?.resolved)
          : [];
      }catch(_){
        return [];
      }
    };

    const reportToPet=report=>normalizePet({
      id:report.petId||`lost-report-${report.id}`,
      lost_report_id:report.id,
      name:report.name||report.pet_name||"Lost pet",
      type:report.type||report.pet_type||"Pet",
      city:report.city||report.area||"",
      country:report.country||"",
      latitude:report.latitude,
      longitude:report.longitude,
      image_url:report.image||report.image_url||"",
      created_at:report.createdAt||report.created_at||report.date||"",
      is_lost:true,
      is_memorial:false
    });

    if(!client){
      const localLost=localLostReports()
        .map(reportToPet)
        .filter(pet=>Number.isFinite(pet.latitude)&&Number.isFinite(pet.longitude));

      return [
        ...DEMO_PETS.map(normalizePet),
        ...localLost
      ];
    }

    try{
      const [{data:petRows,error:petError},{data:reportRows,error:reportError}]=await Promise.all([
        client
          .from("pets")
          .select("id,name,type,city,country,latitude,longitude,image_url,created_at,is_memorial")
          .not("latitude","is",null)
          .not("longitude","is",null)
          .order("created_at",{ascending:false})
          .limit(2500),

        client
          .from("public_lost_pet_reports")
          .select("*")
          .eq("status","lost")
          .eq("resolved",false)
          .order("created_at",{ascending:false})
          .limit(500)
      ]);

      if(petError)throw petError;

      const cloudReports=reportError?[]:(reportRows||[]);
      const reports=[...cloudReports,...localLostReports()];
      const lostPetIds=new Set(
        reports
          .map(report=>String(report.pet_id||report.petId||""))
          .filter(Boolean)
      );

      const pets=(petRows||[])
        .map(pet=>normalizePet({
          ...pet,
          is_lost:lostPetIds.has(String(pet.id))
        }))
        .filter(pet=>Number.isFinite(pet.latitude)&&Number.isFinite(pet.longitude));

      const knownPetIds=new Set(pets.map(pet=>String(pet.id)));
      const reportOnlyPets=reports
        .filter(report=>{
          const petId=String(report.pet_id||report.petId||"");
          return !petId||!knownPetIds.has(petId);
        })
        .map(reportToPet)
        .filter(pet=>Number.isFinite(pet.latitude)&&Number.isFinite(pet.longitude));

      const merged=[...pets,...reportOnlyPets];
      return merged.length?merged:DEMO_PETS.map(normalizePet);
    }catch(error){
      console.warn("World Experience: using demonstration points and local Lost reports.",error);

      const localLost=localLostReports()
        .map(reportToPet)
        .filter(pet=>Number.isFinite(pet.latitude)&&Number.isFinite(pet.longitude));

      return [
        ...DEMO_PETS.map(normalizePet),
        ...localLost
      ];
    }
  }

  function normalizePet(pet){return {...pet,latitude:Number(pet.latitude),longitude:Number(pet.longitude),is_lost:Boolean(pet.is_lost),is_memorial:Boolean(pet.is_memorial)}}
  function profileHref(pet){
    if(pet?.lost_report_id){
      return `lost-found.html?reportId=${encodeURIComponent(pet.lost_report_id)}#reports`;
    }
    return pet?.id?`pet.html?id=${encodeURIComponent(pet.id)}`:"pets.html";
  }
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
      state.globe?.pointOfView({lat:Number(pet.latitude),lng:Number(pet.longitude),altitude:.68},1450);showPetFocus(pet);refreshLivingCells();triggerAtlasVisualSignal(pet);
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
  function refreshLivingCells(){
    const ringSource=visiblePetsForMode().filter(pet=>!pet.is_memorial);
    state.rings=makeRings(ringSource);

    if(state.globe){
      state.globe
        .ringsData(state.rings)
        .ringColor(ringColor)
        .ringMaxRadius("ringMax")
        .ringPropagationSpeed("ringSpeed")
        .ringRepeatPeriod("ringPeriod");
    }
  }
  function showPetFocus(pet,{animate=true}={}){
    state.selectedPet=pet;if(!ui.focusCard)return;rememberStory(pet);
    ui.focusImage.src=petImage(pet);ui.focusImage.alt=pet.name||"Pet";ui.focusType.textContent=String(pet.type||"Pet").toUpperCase();ui.focusName.textContent=pet.name||"Pet story";ui.focusLocation.textContent=[pet.city,pet.country].filter(Boolean).join(", ")||"Somewhere in the world";ui.focusSignal.textContent=pet.is_lost?"Lost signal — priority":pet.is_memorial?"Memorial light":"Living signal active";ui.focusLink.href=profileHref(pet);
    if(ui.focusFlag)ui.focusFlag.textContent=countryFlag(pet.country);if(ui.focusTime)ui.focusTime.textContent=relativeTime(pet.created_at);if(ui.focusStory)ui.focusStory.textContent=storyText(pet);
    ui.focusCard.hidden=false;if(animate){ui.focusCard.classList.remove("is-transitioning");void ui.focusCard.offsetWidth;ui.focusCard.classList.add("is-transitioning");}
    if(state.globe)state.globe.pointRadius(atlasPointRadius);
  }
  function exploreNextStory(){
    const next=nextStoryPet();if(!next)return;state.globe?.pointOfView({lat:Number(next.latitude),lng:Number(next.longitude),altitude:.62},1550);showPetFocus(next);toast(`Next story · ${next.name||"A pet"}`);playTone(560,.09);
  }
  function hidePetFocus(){state.selectedPet=null;if(ui.focusCard)ui.focusCard.hidden=true;if(state.globe)state.globe.pointRadius(atlasPointRadius)}

  function memorialPets(){
    return state.pets.filter(pet=>pet.is_memorial);
  }

  function visiblePetsForMode(){
    if(state.mode==="lost")return state.pets.filter(pet=>pet.is_lost);
    if(state.mode==="memorial")return memorialPets();
    if(state.mode==="pets")return state.pets.filter(pet=>!pet.is_lost&&!pet.is_memorial);
    return state.pets;
  }

  function pulseMemorialMarker(marker){
    if(!marker)return;

    marker.style.position="relative";
    marker.style.overflow="visible";
    marker.style.isolation="isolate";

    marker.querySelectorAll(".atlas-memorial-click-pulse").forEach(node=>node.remove());

    [0,180,360].forEach((delay,index)=>{
      const pulse=document.createElement("span");
      pulse.className="atlas-memorial-click-pulse";
      Object.assign(pulse.style,{
        position:"absolute",
        left:"50%",
        top:"50%",
        width:index===0?"30px":"34px",
        height:index===0?"30px":"34px",
        border:"2px solid rgba(231,232,255,.95)",
        borderRadius:"999px",
        boxShadow:"0 0 18px rgba(231,232,255,.72), inset 0 0 12px rgba(167,124,255,.18)",
        transform:"translate(-50%,-50%) scale(.35)",
        transformOrigin:"center",
        opacity:"0",
        pointerEvents:"none",
        zIndex:"-1"
      });
      marker.appendChild(pulse);

      const animation=pulse.animate(
        [
          {transform:"translate(-50%,-50%) scale(.35)",opacity:0},
          {transform:"translate(-50%,-50%) scale(.65)",opacity:.95,offset:.12},
          {transform:"translate(-50%,-50%) scale(3.6)",opacity:0}
        ],
        {
          duration:1850,
          delay,
          easing:"cubic-bezier(.16,.8,.25,1)",
          fill:"forwards"
        }
      );

      animation.onfinish=()=>pulse.remove();
    });

    marker.animate(
      [
        {filter:"drop-shadow(0 0 0 rgba(231,232,255,0))",transform:"scale(1)"},
        {filter:"drop-shadow(0 0 18px rgba(231,232,255,.95))",transform:"scale(1.13)",offset:.28},
        {filter:"drop-shadow(0 0 8px rgba(167,124,255,.55))",transform:"scale(1)"}
      ],
      {duration:1200,easing:"ease-out"}
    );
  }

  function makeMemorialMarker(pet){
    const marker=document.createElement("button");
    marker.type="button";
    marker.className="atlas-memorial-marker";
    marker.setAttribute("aria-label",`Open memorial for ${pet.name||"pet"}`);
    marker.innerHTML='<span aria-hidden="true">🕊️</span>';
    marker.style.position="relative";
    marker.style.overflow="visible";
    marker.style.isolation="isolate";

    // Gentle continuous breathing halo while this individual Memorial marker is visible.
    const breath=document.createElement("span");
    breath.className="atlas-memorial-breath";
    Object.assign(breath.style,{
      position:"absolute",left:"50%",top:"50%",width:"34px",height:"34px",
      border:"1.5px solid rgba(231,232,255,.72)",borderRadius:"999px",
      boxShadow:"0 0 16px rgba(231,232,255,.38), inset 0 0 10px rgba(167,124,255,.12)",
      transform:"translate(-50%,-50%) scale(.72)",transformOrigin:"center",
      opacity:".24",pointerEvents:"none",zIndex:"-1"
    });
    marker.appendChild(breath);
    if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      breath.animate([
        {transform:"translate(-50%,-50%) scale(.72)",opacity:.22},
        {transform:"translate(-50%,-50%) scale(1.55)",opacity:.62},
        {transform:"translate(-50%,-50%) scale(.72)",opacity:.22}
      ],{duration:2600,iterations:Infinity,easing:"ease-in-out"});
    }

    marker.addEventListener("click",event=>{
      event.stopPropagation();
      state.globe?.pointOfView({
        lat:Number(pet.latitude),
        lng:Number(pet.longitude),
        altitude:.62
      },1250);
      showPetFocus(pet);
      pulseMemorialMarker(marker);
      triggerAtlasVisualSignal(pet,{duration:4200});
    });

    return marker;
  }

  function refreshMemorialMarkers(){
    // Memorials are rendered as native soft-violet Globe points.
    // Keeping the HTML layer empty preserves drag/rotation performance.
    if(state.globe?.htmlElementsData)state.globe.htmlElementsData([]);
  }


  // =====================================================
  // ATLAS SMART CLUSTERS — keeps the globe usable at scale
  // =====================================================
  function clusterPriority(pet){
    if(pet?.is_lost)return 4;
    if(pet?.is_home_again||pet?.resolved)return 3;
    if(pet?.is_memorial)return 2;
    return 1;
  }

  function clusterBand(){
    const altitude=Number(state.globe?.pointOfView?.()?.altitude||2.25);
    if(altitude<=.92)return {name:"individual",cell:0};
    if(altitude<=1.45)return {name:"near",cell:5};
    if(altitude<=2.15)return {name:"mid",cell:11};
    return {name:"far",cell:20};
  }

  function clusterPets(pets){
    const band=clusterBand();
    if(!band.cell)return pets;
    const buckets=new Map();
    for(const pet of pets){
      const lat=Number(pet.latitude),lng=Number(pet.longitude);
      if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
      const key=`${Math.floor((lat+90)/band.cell)}:${Math.floor((lng+180)/band.cell)}`;
      if(!buckets.has(key))buckets.set(key,[]);
      buckets.get(key).push(pet);
    }
    return [...buckets.values()].map(group=>{
      if(group.length===1)return group[0];
      const priority=[...group].sort((a,b)=>clusterPriority(b)-clusterPriority(a))[0];
      return {
        _isCluster:true,
        _clusterMembers:group,
        latitude:group.reduce((n,p)=>n+Number(p.latitude),0)/group.length,
        longitude:group.reduce((n,p)=>n+Number(p.longitude),0)/group.length,
        name:`${group.length} stories`,
        type:"Cluster",
        is_lost:Boolean(priority?.is_lost),
        is_memorial:!priority?.is_lost&&Boolean(priority?.is_memorial),
        _priority:clusterPriority(priority),
        _count:group.length
      };
    });
  }

  function atlasPointData(){return clusterPets(visiblePetsForMode())}
  function atlasPointRadius(point){
    if(point?._isCluster)return Math.min(1.15,.46+Math.log2(point._count+1)*.12);
    if(point===state.selectedPet)return state.lite?.42:.62;
    return state.lite?.24:state.quality==="ultra"?.42:.36;
  }
  function atlasPointAltitude(point){
    if(point?._isCluster)return .16+Math.min(.08,Math.log10(point._count+1)*.035);
    return pointAltitude(point);
  }
  function atlasPointLabel(point){
    if(point?._isCluster){
      const lost=point._clusterMembers.filter(p=>p.is_lost).length;
      const memorial=point._clusterMembers.filter(p=>p.is_memorial).length;
      return `<div class="living-cell-tooltip atlas-cluster-tooltip"><div class="atlas-cluster-count">${point._count}</div><div><b>${point._count} stories here</b><span>${lost?`${lost} lost · `:""}${memorial?`${memorial} memorial · `:""}Click to explore</span></div></div>`;
    }
    return `<div class="living-cell-tooltip"><img src="${escapeHtml(petImage(point))}" alt=""><div><b>${escapeHtml(point.name||"Pet")}</b><span>${escapeHtml([point.type,point.city,point.country].filter(Boolean).join(" · "))}</span></div></div>`;
  }
  function refreshAtlasClusters(force=false){
    if(!state.globe)return;
    const band=clusterBand().name;
    if(!force&&band===state.lastClusterBand)return;
    state.lastClusterBand=band;
    state.globe.pointsData(atlasPointData()).pointRadius(atlasPointRadius).pointAltitude(atlasPointAltitude);
    refreshAtlasDashboard();
  }
  function bindClusterCamera(){
    const controls=state.globe?.controls?.();
    if(!controls?.addEventListener)return;
    controls.addEventListener("change",()=>{
      clearTimeout(state.clusterTimer);
      state.clusterTimer=setTimeout(()=>refreshAtlasClusters(false),90);
    });
  }

  // =====================================================
  // ATLAS WORLD EVENTS — VISUAL SIGNALS
  // Lost = radar, Memorial = starlight, New pet = cyan birth pulse
  // =====================================================
  function atlasSignalKind(pet){
    if(pet?.is_lost)return "lost";
    if(pet?.is_memorial)return "memorial";
    return "new_pet";
  }
  function triggerAtlasVisualSignal(pet,{duration=3200}={}){
    if(!pet||pet._isCluster||!state.globe)return;
    const lat=Number(pet.latitude),lng=Number(pet.longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
    const kind=atlasSignalKind(pet);
    const signal={...pet,_atlasSignal:true,_signalKind:kind,
      ringMax:kind==="lost"?4.6:kind==="memorial"?2.7:2.15,
      ringSpeed:kind==="lost"?.95:kind==="memorial"?.34:.62,
      ringPeriod:kind==="lost"?430:kind==="memorial"?1180:720};
    const base=makeRings(visiblePetsForMode().filter(item=>!item.is_memorial));
    state.rings=[signal,...base.filter(item=>petKey(item)!==petKey(pet))];
    state.globe.ringsData(state.rings)
      .ringColor(item=>{
        if(item?._atlasSignal){
          return t=>{
            const a=Math.max(0,1-t);
            if(item._signalKind==="lost")return `rgba(255,82,110,${a*.92})`;
            if(item._signalKind==="memorial")return `rgba(231,232,255,${a*.72})`;
            return `rgba(105,232,255,${a*.86})`;
          };
        }
        return ringColor(item);
      })
      .ringMaxRadius("ringMax").ringPropagationSpeed("ringSpeed").ringRepeatPeriod("ringPeriod");
    ui.app.dataset.atlasSignal=kind;
    clearTimeout(state.visualSignalTimer);
    state.visualSignalTimer=setTimeout(()=>{delete ui.app.dataset.atlasSignal;refreshLivingCells()},duration);
  }

  function refreshAtlasDashboard(){
    const list=document.getElementById("atlasTopCountries");
    if(!list)return;
    const counts=new Map();
    state.pets.forEach(pet=>{
      const country=String(pet?.country||"").trim();
      if(country)counts.set(country,(counts.get(country)||0)+1);
    });
    const rows=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);
    list.innerHTML=rows.length
      ? rows.map(([country,count],i)=>`<li><span class="atlas-rank">${i+1}</span><span class="atlas-country-name">${escapeHtml(country)}</span><strong>${count.toLocaleString()}</strong></li>`).join("")
      : '<li class="atlas-country-empty">Country activity will appear here.</li>';
  }

  function pointColor(point){
    if(point.is_lost)return "#ff526e";
    if(point.is_memorial)return "#d8c8ff";
    const palette={Dog:"#68e8ff",Cat:"#a77cff",Bird:"#ffc85d",Rabbit:"#72ffb0"};
    return palette[point.type]||"#ffffff";
  }

  function pointAltitude(point){
    return point.is_lost?.2:point.is_memorial?.15:.095;
  }

  function updateModeAtmosphere(mode){
    ui.app.classList.toggle("is-lost",mode==="lost");
    ui.app.classList.toggle("is-memorial",mode==="memorial");

    if(state.globe){
      state.globe.atmosphereColor(
        mode==="lost"
          ? "#ff526e"
          : mode==="memorial"
            ? "#aeb5c5"
            : "#5bc8ff"
      );
    }
  }

  function applyMode(mode){
    state.mode=mode;

    ui.modes.forEach(button=>
      button.classList.toggle(
        "is-active",
        button.dataset.worldMode===mode
      )
    );

    updateModeAtmosphere(mode);

    if(state.globe){
      state.globe
        .pointsData(atlasPointData())
        .pointColor(pointColor)
        .pointAltitude(atlasPointAltitude)
        .pointRadius(atlasPointRadius)
        .pointsTransitionDuration(650);

      refreshMemorialMarkers();
      refreshLivingCells();
    }

    const labels={
      all:"The whole living world",
      pets:"Living pets",
      lost:"Lost Pet Signal mode",
      memorial:"Memorial starlight mode"
    };

    toast(labels[mode]);
  }

  function buildCloudLayer(world){
    if(!window.THREE||state.lite)return;
    const texture=new THREE.TextureLoader().load("https://unpkg.com/three-globe/example/img/earth-clouds.png");
    const geometry=new THREE.SphereGeometry(100.55,state.quality==="ultra"?96:64,state.quality==="ultra"?96:64);
    const material=new THREE.MeshPhongMaterial({map:texture,transparent:true,opacity:.42,depthWrite:false,blending:THREE.AdditiveBlending});
    const clouds=new THREE.Mesh(geometry,material);clouds.renderOrder=2;world.scene().add(clouds);state.clouds=clouds;
  }
  function buildLighting(world){
    if(!window.THREE)return;
    const material=world.globeMaterial();material.bumpScale=10;material.shininess=12;material.specular=new THREE.Color("#6aa8ff");
    world.scene().children.filter(o=>o.isLight).forEach(light=>{if(light.type==="AmbientLight")light.intensity=.62});
    const sun=new THREE.DirectionalLight(0xffffff,2.15);
    sun.target.position.set(0,0,0);
    world.scene().add(sun);
    world.scene().add(sun.target);
    state.sun=sun;
    updateSunLight(true);
    const rim=new THREE.DirectionalLight(0x5bc8ff,.72);rim.position.set(140,-40,-120);world.scene().add(rim);
  }



  // =====================================================
  // LIVE EARTH DAY / NIGHT MATERIAL
  // =====================================================
  function buildDayNightMaterial(world){
    if(!window.THREE)return;
    const material=world.globeMaterial();
    const loader=new THREE.TextureLoader();
    const nightTexture=loader.load(
      "https://unpkg.com/three-globe/example/img/earth-night.jpg",
      texture=>{
        if("colorSpace" in texture&&THREE.SRGBColorSpace)texture.colorSpace=THREE.SRGBColorSpace;
        else if("encoding" in texture&&THREE.sRGBEncoding)texture.encoding=THREE.sRGBEncoding;
        texture.needsUpdate=true;
      },
      undefined,
      error=>console.warn("Atlas Live Earth: night texture could not load.",error)
    );
    nightTexture.wrapS=THREE.RepeatWrapping;
    nightTexture.wrapT=THREE.ClampToEdgeWrapping;
    state.nightTexture=nightTexture;

    material.onBeforeCompile=shader=>{
      shader.uniforms.atlasNightTexture={value:nightTexture};
      shader.uniforms.atlasSunDirection={value:new THREE.Vector3(1,0,0)};
      shader.uniforms.atlasTwilightWidth={value:.12};
      shader.uniforms.atlasNightStrength={value:state.lite?.72:1.18};

      shader.vertexShader=shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec3 vAtlasWorldNormal;
          varying vec2 vAtlasUv;`
        )
        .replace(
          "#include <defaultnormal_vertex>",
          `#include <defaultnormal_vertex>
          vAtlasWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
          vAtlasUv = uv;`
        );

      shader.fragmentShader=shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform sampler2D atlasNightTexture;
          uniform vec3 atlasSunDirection;
          uniform float atlasTwilightWidth;
          uniform float atlasNightStrength;
          varying vec3 vAtlasWorldNormal;
          varying vec2 vAtlasUv;`
        )
        .replace(
          "#include <dithering_fragment>",
          `vec3 atlasNormal = normalize(vAtlasWorldNormal);
          float atlasSolarDot = dot(atlasNormal, normalize(atlasSunDirection));
          float atlasDay = smoothstep(-atlasTwilightWidth, atlasTwilightWidth * 1.55, atlasSolarDot);
          float atlasNight = 1.0 - smoothstep(-atlasTwilightWidth * 1.35, atlasTwilightWidth * .25, atlasSolarDot);
          float atlasTwilight = 1.0 - smoothstep(0.0, atlasTwilightWidth * 1.8, abs(atlasSolarDot));
          vec3 atlasNightColor = texture2D(atlasNightTexture, vAtlasUv).rgb;
          vec3 atlasBaseColor = gl_FragColor.rgb * mix(.13, 1.0, atlasDay);
          vec3 atlasCityLights = atlasNightColor * atlasNight * atlasNightStrength;
          vec3 atlasSunsetGlow = vec3(1.0, .24, .045) * atlasTwilight * .07;
          gl_FragColor.rgb = atlasBaseColor + atlasCityLights + atlasSunsetGlow;
          #include <dithering_fragment>`
        );

      state.dayNightShader=shader;
      updateSunLight(true);
    };

    material.customProgramCacheKey=()=>"thepetgrid-live-earth-v1";
    material.needsUpdate=true;
  }

  // =====================================================
  // REAL SOLAR POSITION
  // =====================================================
  function getSolarPosition(date=new Date()){
    const utcHours=date.getUTCHours()+date.getUTCMinutes()/60+date.getUTCSeconds()/3600;
    const subsolarLongitude=180-utcHours*15;
    const startOfYear=Date.UTC(date.getUTCFullYear(),0,0);
    const dayOfYear=(date.getTime()-startOfYear)/86400000;
    const solarDeclination=-23.44*Math.cos((2*Math.PI/365)*(dayOfYear+10));
    return {latitude:solarDeclination,longitude:subsolarLongitude};
  }

  function updateSunLight(force=false){
    if(!state.sun||!window.THREE)return;
    const now=Date.now();
    if(!force&&now-(updateSunLight.lastUpdate||0)<60000)return;
    updateSunLight.lastUpdate=now;

    const solarPosition=getSolarPosition(new Date(now));
    const latitude=THREE.MathUtils.degToRad(solarPosition.latitude);
    const longitude=THREE.MathUtils.degToRad(solarPosition.longitude);
    const distance=240;

    state.sun.position.set(
      Math.cos(latitude)*Math.sin(longitude)*distance,
      Math.sin(latitude)*distance,
      Math.cos(latitude)*Math.cos(longitude)*distance
    );
    state.sun.target.position.set(0,0,0);
    state.sun.target.updateMatrixWorld();

    if(state.dayNightShader?.uniforms?.atlasSunDirection){
      state.dayNightShader.uniforms.atlasSunDirection.value
        .copy(state.sun.position)
        .normalize();
      state.dayNightShader.uniforms.atlasNightStrength.value=state.lite?.72:1.18;
    }
  }

  function animatePlanet(){
    const tick=()=>{
      if(state.clouds&&state.rotating&&!state.lite)state.clouds.rotation.y+=.00030;
      updateSunLight();
      requestAnimationFrame(tick);
    };
    tick();
  }

  function makeGlobe(){
    if(typeof window.Globe!=="function"||!supportsWebGL())throw new Error("WebGL globe unavailable");
    const world=window.Globe()(ui.stage).width(innerWidth).height(innerHeight).backgroundColor("rgba(0,0,0,0)")
      .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg").bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
       .showAtmosphere(true).atmosphereColor("#7fe8ff").atmosphereAltitude(.27).pointsData(atlasPointData()).pointLat("latitude").pointLng("longitude").pointColor(pointColor)
      .pointAltitude(atlasPointAltitude).pointRadius(atlasPointRadius).pointsMerge(false).pointsTransitionDuration(650)
      .ringsData(state.rings).ringLat("latitude").ringLng("longitude").ringColor(ringColor).ringMaxRadius("ringMax").ringPropagationSpeed("ringSpeed").ringRepeatPeriod("ringPeriod")
      .htmlElementsData([]).htmlLat("latitude").htmlLng("longitude").htmlAltitude(.14).htmlElement(makeMemorialMarker)
      .pointLabel(atlasPointLabel)
      .onPointClick(point=>{
        if(point?._isCluster){
          const current=Number(world.pointOfView()?.altitude||2);
          const next=Math.max(.72,current*.58);
          world.pointOfView({lat:Number(point.latitude),lng:Number(point.longitude),altitude:next},900);
          toast(`${point._count} stories · zooming closer`);
          setTimeout(()=>refreshAtlasClusters(true),950);
          playTone(470,.07);
          return;
        }
        world.pointOfView({lat:Number(point.latitude),lng:Number(point.longitude),altitude:.62},1050);showPetFocus(point);triggerAtlasVisualSignal(point);toast(`${point.name||"A pet"} · ${point.city||point.country||"ThePetGrid"}`);playTone(520,.08)
      })
      .onGlobeClick(({lat,lng})=>world.pointOfView({lat,lng,altitude:1.38},1050));
    world.controls().autoRotate=true;world.controls().autoRotateSpeed=.29;world.controls().enableDamping=true;world.controls().dampingFactor=.075;world.controls().minDistance=118;world.controls().maxDistance=430;
    world.pointOfView({lat:18,lng:18,altitude:2.25},0);state.globe=world;bindClusterCamera();refreshAtlasClusters(true);buildLighting(world);buildDayNightMaterial(world);buildCloudLayer(world);animatePlanet();addEventListener("resize",()=>{world.width(innerWidth).height(innerHeight);refreshAtlasClusters(true)},{passive:true});
  }

  function supportsWebGL(){try{const c=document.createElement("canvas");return !!(window.WebGLRenderingContext&&(c.getContext("webgl")||c.getContext("experimental-webgl")))}catch{return false}}
  function updateStats(){const countries=new Set(state.pets.map(p=>p.country).filter(Boolean));const cities=new Set(state.pets.map(p=>`${p.city}|${p.country}`).filter(v=>!v.startsWith("|")));countUp(ui.petCount,state.pets.length);countUp(ui.countryCount,countries.size);countUp(ui.cityCount,cities.size);const active=[...cities].slice(0,3).map(v=>v.split("|")[0]).filter(Boolean);if(active.length)ui.activePlace.textContent=active.join(" · ")}
  function updateClock(){ui.clock.textContent=new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"UTC",hour12:false}).format(new Date())+" UTC"}

  function pulseRandomPet(){clearInterval(state.pulseTimer);state.pulseTimer=setInterval(()=>{if(!state.pets.length||document.hidden)return;const pet=state.pets[Math.floor(Math.random()*state.pets.length)];ui.liveSignalText.textContent=`${pet.name||"A pet"} is glowing from ${pet.city||pet.country||"the world"}`;ui.liveSignal.hidden=false;clearTimeout(pulseRandomPet.hide);pulseRandomPet.hide=setTimeout(()=>ui.liveSignal.hidden=true,4200)},8500)}
  async function refreshAtlasPetsFromSources(){
    try{
      state.pets=(await loadPets()).map(normalizePet);
      refreshAtlasClusters(true);
      refreshMemorialMarkers();
      refreshLivingCells();
      updateStats();
    }catch(error){
      console.warn("ThePetGrid: Atlas could not refresh Lost/Home Again state.",error);
    }
  }

  function subscribeRealtime(){
    const client=window.ThePetGridSupabase?.client;
    if(!client?.channel)return;

    // Local Live Server is often unreliable with Supabase WebSockets.
    // Keep Atlas fully functional locally using periodic refresh instead
    // of opening reconnecting realtime sockets.
    const isLocal =
      location.hostname === "127.0.0.1" ||
      location.hostname === "localhost";

    if(isLocal){
      clearInterval(state.localRefreshTimer);
      state.localRefreshTimer=setInterval(
        refreshAtlasPetsFromSources,
        30000
      );
      console.info("Atlas: local mode — Supabase Realtime disabled; using 30s refresh.");
      return;
    }

    // Prevent duplicate channels if init/subscription is ever invoked again.
    try{
      if(state.realtime)client.removeChannel(state.realtime);
      if(state.lostRealtime)client.removeChannel(state.lostRealtime);
    }catch(_){}

    state.realtime=client
      .channel("atlas-living-world")
      .on("postgres_changes",{event:"*",schema:"public",table:"pets"},async payload=>{
        if(payload.eventType==="INSERT"){
          const pet=normalizePet(payload.new);

          if(
            Number.isFinite(pet.latitude) &&
            Number.isFinite(pet.longitude)
          ){
            state.pets.unshift(pet);

            pushWorldEvent(
              createWorldEvent(
                pet.is_memorial?"memorial":"new_pet",
                pet
              )
            );
          }
        }

        await refreshAtlasPetsFromSources();
      })
      .subscribe(status=>{
        if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"){
          console.warn("Atlas: pets realtime unavailable; live data will refresh normally on reload.");
        }
      });

    state.lostRealtime=client
      .channel("atlas-lost-home-again")
      .on("postgres_changes",{event:"*",schema:"public",table:"lost_pet_reports"},async payload=>{
        await refreshAtlasPetsFromSources();

        if(
          payload.eventType==="UPDATE" &&
          payload.new?.resolved
        ){
          toast(`${payload.new.pet_name||"A pet"} is Home Again 🏡`);
        }
      })
      .subscribe(status=>{
        if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"){
          console.warn("Atlas: Lost & Found realtime unavailable; page remains usable.");
        }
      });

    window.addEventListener("beforeunload",()=>{
      try{
        if(state.realtime)client.removeChannel(state.realtime);
        if(state.lostRealtime)client.removeChannel(state.lostRealtime);
      }catch(_){}
      clearInterval(state.localRefreshTimer);
    },{once:true});

    window.addEventListener(
      "thepetgrid:lost-reports-changed",
      refreshAtlasPetsFromSources
    );

    window.addEventListener(
      "thepetgrid:home-again",
      refreshAtlasPetsFromSources
    );
  }

  function monitorPerformance(){
    let frames=0;
    let last=performance.now();

    const loop=now=>{
      frames++;

      if(now-last>=1000){
        const fps=Math.round(frames*1000/(now-last));
        ui.fps.textContent=`${fps} FPS`;

        state.frameSamples.push(fps);
        if(state.frameSamples.length>8)state.frameSamples.shift();

        const avg=
          state.frameSamples.reduce((total,value)=>total+value,0)/
          state.frameSamples.length;

        if(!state.manualQuality){
          if(avg<32&&state.quality!=="lite"){
            setQuality("lite",true);
          }else if(avg<46&&state.quality==="ultra"){
            setQuality("high",true);
          }
        }

        frames=0;
        last=now;
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  function ensureAudio(){if(state.audio)return state.audio;const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return null;state.audio=new AudioCtx();return state.audio}
  function playTone(frequency=.2,duration=.1){if(!state.sound)return;const ctx=ensureAudio();if(!ctx)return;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type="sine";osc.frequency.value=frequency;gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.035,ctx.currentTime+.015);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration+.02)}

  function bind(){
    ui.focusLink?.addEventListener("click", () => {
      if (!state.selectedPet) return;

      try {
        const view = state.globe?.pointOfView?.() || {};

        sessionStorage.setItem(
          "thepetgrid_atlas_state",
          JSON.stringify({
            petId: state.selectedPet.id ?? null,
            latitude: Number(state.selectedPet.latitude),
            longitude: Number(state.selectedPet.longitude),
            camera: {
              lat: Number(view.lat),
              lng: Number(view.lng),
              altitude: Number(view.altitude)
            },
            timestamp: Date.now()
          })
        );
      } catch (error) {
        console.warn("Atlas state could not be saved.", error);
      }
    });

    ui.explore.addEventListener("click",()=>{state.globe?.pointOfView({lat:20,lng:12,altitude:1.22},1800);playTone(420,.16)});ui.reset.addEventListener("click",()=>{window.location.href="upload.html"});
    ui.motion.addEventListener("click",()=>{state.rotating=!state.rotating;if(state.globe)state.globe.controls().autoRotate=state.rotating;ui.motion.setAttribute("aria-pressed",String(!state.rotating));ui.motion.textContent=state.rotating?"Pause motion":"Resume motion"});
    ui.lite?.addEventListener("click",()=>{
      state.manualQuality=true;
      setQuality(state.lite?"high":"lite",true);
      ui.lite.setAttribute("aria-pressed",String(state.lite));
      ui.lite.textContent=state.lite?"Full effects":"Lite mode";
    });
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