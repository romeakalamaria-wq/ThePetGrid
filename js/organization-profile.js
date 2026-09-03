(() => {
  "use strict";
  const client=window.ThePetGridSupabase?.client||null;
  const params=new URLSearchParams(location.search);
  const id=params.get("id");
  const status=document.getElementById("orgProfileStatus");
  const root=document.getElementById("orgProfile");
  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
  function label(v){return String(v||"other").replaceAll("_"," ");}
  const demo={id:"demo-1",name:"Happy Paws Rescue",type:"rescue",country:"Greece",city:"Thessaloniki",description:"Rescue and rehabilitation for abandoned dogs and cats. This is a demo organization profile — real organizations will be loaded from Supabase.",verified:true,website:""};

  async function load(){
    if(!id){status.textContent="Organization not specified.";return;}
    let org=null;
    if(client && !id.startsWith("demo-")){
      const {data,error}=await client.from("organizations").select("*").eq("id",id).single();
      if(!error) org=data;
    }
    if(!org && id==="demo-1") org=demo;
    if(!org){status.textContent="Organization not found.";return;}
    document.title=`${org.name} — ThePetGrid`;
    status.remove(); root.hidden=false;
    const cover=org.cover_url?`style="background-image:url('${esc(org.cover_url)}')"`:"";
    const logo=org.logo_url?`<img class="org-profile__logo" src="${esc(org.logo_url)}" alt="">`:`<div class="org-profile__logo" style="display:grid;place-items:center;font-size:3rem">🐾</div>`;
    root.innerHTML=`<div class="org-profile">
      <div class="org-profile__cover" ${cover}></div>
      <div class="org-profile__header">
        ${logo}
        <div class="org-profile__name"><h1>${esc(org.name)}</h1><p>${org.verified?'<span class="org-profile__verified">✓ Verified</span> · ':''}${esc(label(org.type))} · ${esc(org.city||"")}${org.city&&org.country?", ":""}${esc(org.country||"")}</p></div>
        <div class="org-profile__actions"><button class="org-follow" type="button" disabled title="Following will be connected in the next step">Follow</button>${org.website?`<a href="${esc(org.website)}" target="_blank" rel="noopener">Website ↗</a>`:""}</div>
      </div>
      <div class="org-profile__content">
        <section class="org-panel"><h2>About</h2><p>${esc(org.description||"This organization has not added an introduction yet.")}</p><h2 style="margin-top:30px">Pets &amp; adoption</h2><div class="org-pets-placeholder">Organization pets and adoption listings will appear here once we connect the organization to its pets.</div></section>
        <aside class="org-panel"><h2>Organization</h2><div class="org-info">
          <div>🏷️ <strong>Type:</strong> ${esc(label(org.type))}</div>
          <div>📍 <strong>Location:</strong> ${esc(org.city||"")} ${org.city&&org.country?"· ":""}${esc(org.country||"")}</div>
          <div>🛡️ <strong>Status:</strong> ${org.verified?"Verified":"Unverified"}</div>
        </div></aside>
      </div>
    </div>`;
  }
  load();
})();
