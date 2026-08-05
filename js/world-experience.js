(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const ui = {
    boot: $("#worldBoot"), bootProgress: $("#bootProgress"), bootStatus: $("#bootStatus"), app: $("#worldExperience"),
    stage: $("#globeStage"), starCanvas: $("#starCanvas"), fallback: $("#globeFallback"), petCount: $("#worldPetCount"),
    countryCount: $("#worldCountryCount"), cityCount: $("#worldCityCount"), activePlace: $("#activePlace"), explore: $("#exploreWorld"),
    reset: $("#returnHome"), motion: $("#toggleMotion"), lite: $("#toggleLite"), toast: $("#worldToast"), modes: [...document.querySelectorAll("[data-world-mode]")]
  };

  const DEMO_PETS = [
    {name:"Luna",city:"Athens",country:"Greece",latitude:37.9838,longitude:23.7275,type:"Dog"},{name:"Milo",city:"Rome",country:"Italy",latitude:41.9028,longitude:12.4964,type:"Cat"},
    {name:"Yuki",city:"Tokyo",country:"Japan",latitude:35.6762,longitude:139.6503,type:"Dog"},{name:"Coco",city:"Sydney",country:"Australia",latitude:-33.8688,longitude:151.2093,type:"Bird"},
    {name:"Bella",city:"New York",country:"USA",latitude:40.7128,longitude:-74.006,type:"Cat"},{name:"Max",city:"London",country:"United Kingdom",latitude:51.5072,longitude:-.1276,type:"Dog"},
    {name:"Nala",city:"Cape Town",country:"South Africa",latitude:-33.9249,longitude:18.4241,type:"Cat"},{name:"Rio",city:"São Paulo",country:"Brazil",latitude:-23.5505,longitude:-46.6333,type:"Dog"},
    {name:"Kiko",city:"Manila",country:"Philippines",latitude:14.5995,longitude:120.9842,type:"Dog"},{name:"Leo",city:"Paris",country:"France",latitude:48.8566,longitude:2.3522,type:"Cat"},
    {name:"Olive",city:"Toronto",country:"Canada",latitude:43.6532,longitude:-79.3832,type:"Rabbit"},{name:"Simba",city:"Dubai",country:"UAE",latitude:25.2048,longitude:55.2708,type:"Cat"}
  ];
  const state = { globe:null, pets:[], rotating:true, lite:false, starFrame:0, stars:[], mode:"all" };
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const setBoot = (percent, text) => { ui.bootProgress.style.width = `${percent}%`; ui.bootStatus.textContent = text; };
  const countUp = (element, target) => { const start=performance.now(), duration=1100; const tick=now=>{const p=Math.min(1,(now-start)/duration);element.textContent=Math.round(target*(1-Math.pow(1-p,3))).toLocaleString("en-GB");if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick); };
  function toast(message){ui.toast.textContent=message;ui.toast.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>ui.toast.hidden=true,2400)}

  function initStars(){
    const canvas=ui.starCanvas,ctx=canvas.getContext("2d",{alpha:true}); if(!ctx)return;
    const resize=()=>{const dpr=Math.min(devicePixelRatio||1,state.lite?1:1.5);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;canvas.style.width=`${innerWidth}px`;canvas.style.height=`${innerHeight}px`;ctx.setTransform(dpr,0,0,dpr,0,0);const n=state.lite?80:Math.min(280,Math.round(innerWidth*innerHeight/5500));state.stars=Array.from({length:n},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.25+.15,a:Math.random()*.65+.18,s:Math.random()*.08+.015}))};
    const draw=()=>{ctx.clearRect(0,0,innerWidth,innerHeight);for(const s of state.stars){s.a+=s.s*(Math.random()>.5?1:-1);s.a=Math.max(.12,Math.min(.9,s.a));ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(190,218,255,${s.a})`;ctx.fill()}state.starFrame=requestAnimationFrame(draw)};
    resize();addEventListener("resize",resize,{passive:true});draw();
  }

  async function loadPets(){
    const client=window.ThePetGridSupabase?.client;
    if(!client)return DEMO_PETS;
    try{
      const {data,error}=await client.from("pets").select("id,name,type,city,country,latitude,longitude,image_url,is_lost,is_memorial,created_at").not("latitude","is",null).not("longitude","is",null).order("created_at",{ascending:false}).limit(2000);
      if(error)throw error;
      return data?.length?data:DEMO_PETS;
    }catch(error){console.warn("World Experience: using demonstration points.",error);return DEMO_PETS;}
  }

  function pointColor(point){if(state.mode==="lost")return point.is_lost?"#ff526e":"rgba(255,82,110,.08)";if(state.mode==="memorial")return point.is_memorial?"#e7e8ff":"rgba(231,232,255,.06)";const palette={Dog:"#68e8ff",Cat:"#a77cff",Bird:"#ffc85d",Rabbit:"#72ffb0"};return palette[point.type]||"#ffffff"}
  function pointAltitude(point){return point.is_lost?.18:point.is_memorial?.14:.09}
  function applyMode(mode){
    state.mode=mode;ui.modes.forEach(button=>button.classList.toggle("is-active",button.dataset.worldMode===mode));
    if(!state.globe)return;
    state.globe.pointColor(pointColor).pointAltitude(pointAltitude).pointsTransitionDuration(850);
    const labels={all:"The whole living world",pets:"Every light is a pet",lost:"Lost Pet Signal mode",memorial:"Memorial starlight mode"};toast(labels[mode]);
  }

  function makeGlobe(){
    if(typeof window.Globe!=="function"||!supportsWebGL())throw new Error("WebGL globe unavailable");
    const world=window.Globe()(ui.stage)
      .width(innerWidth).height(innerHeight).backgroundColor("rgba(0,0,0,0)")
      .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-night.jpg")
      .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
      .showAtmosphere(true).atmosphereColor("#5bc8ff").atmosphereAltitude(.19)
      .pointsData(state.pets).pointLat("latitude").pointLng("longitude").pointColor(pointColor)
      .pointAltitude(pointAltitude).pointRadius(state.lite?.22:.34).pointsMerge(false).pointsTransitionDuration(900)
      .pointLabel(point=>`<div style="padding:8px 10px;background:rgba(3,9,24,.92);border:1px solid rgba(255,255,255,.2);border-radius:12px;font-family:system-ui"><b>${escapeHtml(point.name||"Pet")}</b><br><span style="color:#9fb3d8">${escapeHtml([point.city,point.country].filter(Boolean).join(", "))}</span></div>`)
      .onPointClick(point=>{world.pointOfView({lat:Number(point.latitude),lng:Number(point.longitude),altitude:.75},1200);toast(`${point.name||"A pet"} · ${point.city||point.country||"ThePetGrid"}`)})
      .onGlobeClick(({lat,lng})=>world.pointOfView({lat,lng,altitude:1.45},900));
    world.controls().autoRotate=true;world.controls().autoRotateSpeed=.34;world.controls().enableDamping=true;world.controls().dampingFactor=.08;world.controls().minDistance=120;world.controls().maxDistance=420;
    world.pointOfView({lat:18,lng:18,altitude:2.25},0);
    addEventListener("resize",()=>world.width(innerWidth).height(innerHeight),{passive:true});
    state.globe=world;
  }

  function supportsWebGL(){try{const c=document.createElement("canvas");return !!(window.WebGLRenderingContext&&(c.getContext("webgl")||c.getContext("experimental-webgl")))}catch{return false}}
  function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function updateStats(){const countries=new Set(state.pets.map(p=>p.country).filter(Boolean));const cities=new Set(state.pets.map(p=>`${p.city}|${p.country}`).filter(v=>!v.startsWith("|")));countUp(ui.petCount,state.pets.length);countUp(ui.countryCount,countries.size);countUp(ui.cityCount,cities.size);const active=[...cities].slice(0,3).map(v=>v.split("|")[0]).filter(Boolean);if(active.length)ui.activePlace.textContent=active.join(" · ")}
  function bind(){
    ui.explore.addEventListener("click",()=>state.globe?.pointOfView({lat:20,lng:12,altitude:1.25},1600));ui.reset.addEventListener("click",()=>state.globe?.pointOfView({lat:18,lng:18,altitude:2.25},1300));
    ui.motion.addEventListener("click",()=>{state.rotating=!state.rotating;if(state.globe)state.globe.controls().autoRotate=state.rotating;ui.motion.setAttribute("aria-pressed",String(!state.rotating));ui.motion.textContent=state.rotating?"Pause motion":"Resume motion"});
    ui.lite.addEventListener("click",()=>{state.lite=!state.lite;ui.app.classList.toggle("is-lite",state.lite);ui.lite.setAttribute("aria-pressed",String(state.lite));ui.lite.textContent=state.lite?"Full effects":"Lite mode";if(state.globe){state.globe.pointRadius(state.lite?.2:.34);state.globe.showAtmosphere(!state.lite)}toast(state.lite?"Lite mode enabled":"Full effects enabled")});
    ui.modes.forEach(button=>button.addEventListener("click",()=>applyMode(button.dataset.worldMode)));
  }

  async function init(){
    try{
      setBoot(18,"Mapping the stars…");initStars();await sleep(350);setBoot(42,"Finding living stories…");state.pets=await loadPets();await sleep(250);setBoot(68,"Building the planet…");makeGlobe();updateStats();bind();await sleep(550);setBoot(100,"The world is alive.");ui.app.hidden=false;await sleep(550);ui.boot.classList.add("is-leaving");setTimeout(()=>ui.boot.remove(),1100);
    }catch(error){console.error("ThePetGrid World Experience:",error);ui.app.hidden=false;ui.fallback.hidden=false;ui.boot.classList.add("is-leaving");}
  }
  init();
})();
