(() => {
  "use strict";
  const client = window.ThePetGridSupabase?.client || null;
  const grid = document.getElementById("orgGrid");
  const status = document.getElementById("orgStatus");
  const search = document.getElementById("orgSearch");
  const type = document.getElementById("orgType");
  const country = document.getElementById("orgCountry");
  const clear = document.getElementById("orgClearFilters");

  // Demo records make the module usable before Supabase is populated.
  const demoOrganizations = [
    {id:"demo-1",name:"Happy Paws Rescue",slug:"happy-paws-rescue",type:"rescue",country:"Greece",city:"Thessaloniki",description:"Rescue and rehabilitation for abandoned dogs and cats.",verified:true},
    {id:"demo-2",name:"Second Chance Shelter",slug:"second-chance-shelter",type:"shelter",country:"Greece",city:"Athens",description:"A community shelter helping animals find safe homes.",verified:true},
    {id:"demo-3",name:"Animal Hope Network",slug:"animal-hope-network",type:"animal_welfare",country:"Cyprus",city:"Nicosia",description:"Animal welfare education, rescue support and adoption.",verified:false}
  ];

  let organizations = [];

  function esc(v){return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
  function typeLabel(v){return String(v||"other").replaceAll("_"," ");}
  function render(list){
    if(!grid) return;
    if(!list.length){
      grid.innerHTML='<div class="org-empty"><strong>No organizations found.</strong><br>Try a different search or filter.</div>';
      return;
    }
    grid.innerHTML=list.map(org=>{
      const href=`organization.html?id=${encodeURIComponent(org.id)}`;
      const logo=org.logo_url ? `<img class="org-card__logo" src="${esc(org.logo_url)}" alt="">` : `<div class="org-card__logo" aria-hidden="true">🐾</div>`;
      return `<article class="org-card">
        <div class="org-card__cover" ${org.cover_url?`style="background-image:url('${esc(org.cover_url)}')"`:""}>${logo}</div>
        <div class="org-card__body">
          <h3>${esc(org.name)}</h3>
          ${org.verified?'<div class="org-card__verified">✓ Verified organization</div>':''}
          <div class="org-card__meta">📍 ${esc(org.city||"")} ${org.city&&org.country?"· ":""}${esc(org.country||"")}</div>
          <p class="org-card__desc">${esc(org.description||"Animal welfare organization on ThePetGrid.")}</p>
          <div class="org-card__footer"><span class="org-type">${esc(typeLabel(org.type))}</span><a class="org-view" href="${href}">View profile →</a></div>
        </div>
      </article>`;
    }).join("");
  }
  function apply(){
    const q=(search?.value||"").trim().toLowerCase(), t=type?.value||"", c=(country?.value||"").trim().toLowerCase();
    const list=organizations.filter(o=>
      (!q || [o.name,o.city,o.country,o.description].some(v=>String(v||"").toLowerCase().includes(q))) &&
      (!t || o.type===t) &&
      (!c || String(o.country||"").toLowerCase().includes(c))
    );
    if(status) status.textContent=`${list.length} organization${list.length===1?"":"s"} found`;
    render(list);
  }
  async function load(){
    if(client){
      const {data,error}=await client.from("organizations").select("id,name,slug,type,country,city,description,logo_url,cover_url,verified").order("verified",{ascending:false}).order("name");
      if(!error && Array.isArray(data)){organizations=data;}
      else organizations=demoOrganizations;
    } else organizations=demoOrganizations;
    apply();
  }
  [search,type,country].forEach(el=>el?.addEventListener("input",apply));
  clear?.addEventListener("click",()=>{search.value="";type.value="";country.value="";apply();});
  load();
})();
