(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const els = { gate:$("#moderationGate"), app:$("#moderationApp"), list:$("#reportsList"), empty:$("#reportsEmpty"), summary:$("#resultsSummary"), status:$("#moderationStatus"), refresh:$("#refreshReportsButton"), search:$("#reportSearch"), statusFilter:$("#statusFilter"), typeFilter:$("#typeFilter"), reasonFilter:$("#reasonFilter"), sort:$("#sortFilter"), clear:$("#clearFiltersButton"), modal:$("#reportModal"), modalDetails:$("#reportModalDetails"), modalTitle:$("#reportModalTitle"), form:$("#reportDecisionForm"), reportId:$("#decisionReportId"), decision:$("#decisionStatus"), notes:$("#moderatorNotes"), notesCounter:$("#notesCounter"), save:$("#saveDecisionButton"), counts:{open:$("#openCount"),reviewing:$("#reviewingCount"),resolved:$("#resolvedCount"),dismissed:$("#dismissedCount"),total:$("#totalCount")} };
  const state={client:null,user:null,reports:[],filtered:[],current:null,loading:false};
  const safe=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;");
  const fmt=value=>new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
  const labelProfile=profile=>profile?.display_name||profile?.username||"Unknown member";
  const priority=report=>["unsafe","scam","harassment"].includes(report.reason)?"high":report.reason==="spam"?"medium":"normal";
  function setStatus(message,type=""){els.status.textContent=message;els.status.dataset.type=type;}
  function deny(title,message){els.gate.classList.add("access-denied");els.gate.innerHTML=`<h1>${safe(title)}</h1><p>${safe(message)}</p><p><a href="../index.html">Return to ThePetGrid</a></p>`;}
  async function requireAdmin(){
    if(!state.client){deny("Supabase is not configured","Add the project URL and publishable key before opening the Moderation Center.");return false;}
    if(window.ThePetGridAuth?.ready) await window.ThePetGridAuth.ready;
    const {data:{user},error}=await state.client.auth.getUser();
    if(error||!user){location.href=`login.html?returnTo=${encodeURIComponent("admin-moderation.html")}`;return false;}
    state.user=user;
    const {data,error:adminError}=await state.client.rpc("is_admin");
    if(adminError||data!==true){deny("Access denied","This page is available only to approved ThePetGrid administrators.");return false;}
    els.gate.hidden=true;els.app.hidden=false;return true;
  }
  async function loadReports(){
    if(state.loading)return;state.loading=true;els.refresh.disabled=true;setStatus("Loading moderation queue…");
    try{
      const {data,error}=await state.client.from("content_reports").select(`id,reporter_id,reported_user_id,content_type,content_id,reason,details,status,moderator_notes,reviewed_by,reviewed_at,created_at,reporter:profiles!content_reports_reporter_id_fkey(id,username,display_name,avatar_url),reported:profiles!content_reports_reported_user_id_fkey(id,username,display_name,avatar_url),reviewer:profiles!content_reports_reviewed_by_fkey(id,username,display_name)`).order("created_at",{ascending:false}).limit(500);
      if(error)throw error;state.reports=data||[];renderCounts();applyFilters();setStatus(`Queue updated ${new Intl.DateTimeFormat("en-GB",{timeStyle:"short"}).format(new Date())}.`);
    }catch(error){console.error(error);setStatus(error.message||"Reports could not be loaded.","error");els.list.innerHTML=`<div class="reports-empty"><h2>Could not load reports</h2><p>${safe(error.message||"Check the Moderation Center SQL and RLS policies.")}</p></div>`;}
    finally{state.loading=false;els.refresh.disabled=false;}
  }
  function renderCounts(){const count=s=>state.reports.filter(r=>r.status===s).length;els.counts.open.textContent=count("open");els.counts.reviewing.textContent=count("reviewing");els.counts.resolved.textContent=count("resolved");els.counts.dismissed.textContent=count("dismissed");els.counts.total.textContent=state.reports.length;}
  function applyFilters(){
    const q=els.search.value.trim().toLowerCase(),status=els.statusFilter.value,type=els.typeFilter.value,reason=els.reasonFilter.value;
    state.filtered=state.reports.filter(r=>{const hay=[r.content_id,r.details,r.reason,r.content_type,r.status,r.reporter?.username,r.reporter?.display_name,r.reported?.username,r.reported?.display_name].join(" ").toLowerCase();return(!q||hay.includes(q))&&(status==="all"||r.status===status)&&(type==="all"||r.content_type===type)&&(reason==="all"||r.reason===reason);});
    const weight={unsafe:0,scam:1,harassment:2,spam:3,other:4};
    state.filtered.sort((a,b)=>els.sort.value==="oldest"?new Date(a.created_at)-new Date(b.created_at):els.sort.value==="priority"?(weight[a.reason]-weight[b.reason]||new Date(b.created_at)-new Date(a.created_at)):new Date(b.created_at)-new Date(a.created_at));renderReports();
  }
  function renderReports(){els.summary.textContent=`Showing ${state.filtered.length} of ${state.reports.length} reports`;els.empty.hidden=state.filtered.length>0;els.list.innerHTML=state.filtered.map(r=>`<article class="report-card" data-report-id="${safe(r.id)}" data-priority="${priority(r)}"><div><div class="report-card__top"><span class="status-badge status-${safe(r.status)}">${safe(r.status)}</span><span class="type-badge">${safe(r.content_type)}</span><span class="reason-badge">${safe(r.reason)}</span></div><h2>${safe(labelProfile(r.reporter))} reported ${safe(labelProfile(r.reported)||r.content_type)}</h2><p><strong>Content ID:</strong> ${safe(r.content_id)}</p><p class="report-card__details">${safe(r.details||"No additional details supplied.")}</p><div class="report-card__meta"><span>Submitted ${fmt(r.created_at)}</span>${r.reviewed_at?`<span>Reviewed ${fmt(r.reviewed_at)}</span>`:""}${r.reviewer?`<span>By ${safe(labelProfile(r.reviewer))}</span>`:""}</div></div><button class="review-button" type="button" data-review-report="${safe(r.id)}">Review</button></article>`).join("");}
  function openModal(id){const r=state.reports.find(x=>x.id===id);if(!r)return;state.current=r;els.reportId.value=r.id;els.decision.value=r.status;els.notes.value=r.moderator_notes||"";els.notesCounter.textContent=els.notes.value.length;els.modalTitle.textContent=`Review ${r.content_type} report`;els.modalDetails.innerHTML=`<div><strong>Reporter:</strong> ${safe(labelProfile(r.reporter))}${r.reporter?.username?` (@${safe(r.reporter.username)})`:""}</div><div><strong>Reported member:</strong> ${safe(labelProfile(r.reported))}${r.reported?.username?` (@${safe(r.reported.username)})`:""}</div><div><strong>Reason:</strong> ${safe(r.reason)}</div><div><strong>Content ID:</strong> ${safe(r.content_id)}</div><div><strong>Submitted:</strong> ${fmt(r.created_at)}</div><div><strong>Details:</strong> ${safe(r.details||"No details")}</div>`;els.modal.hidden=false;document.body.style.overflow="hidden";els.decision.focus();}
  function closeModal(){els.modal.hidden=true;document.body.style.overflow="";state.current=null;}
  async function saveDecision(event){event.preventDefault();if(!state.current)return;const next=els.decision.value,notes=els.notes.value.trim();if(["resolved","dismissed"].includes(next)&&notes.length<5){setStatus("Add a short moderator note before closing a report.","error");els.notes.focus();return;}els.save.disabled=true;
    try{const payload={status:next,moderator_notes:notes,reviewed_by:state.user.id,reviewed_at:new Date().toISOString()};const {error}=await state.client.from("content_reports").update(payload).eq("id",state.current.id);if(error)throw error;closeModal();await loadReports();setStatus(`Report marked as ${next}.`);}
    catch(error){console.error(error);setStatus(error.message||"Decision could not be saved.","error");}
    finally{els.save.disabled=false;}
  }
  function bind(){[els.search,els.statusFilter,els.typeFilter,els.reasonFilter,els.sort].forEach(el=>el.addEventListener(el===els.search?"input":"change",applyFilters));els.clear.addEventListener("click",()=>{els.search.value="";els.statusFilter.value=els.typeFilter.value=els.reasonFilter.value="all";els.sort.value="newest";applyFilters();});els.refresh.addEventListener("click",loadReports);els.list.addEventListener("click",e=>{const button=e.target.closest("[data-review-report]");if(button)openModal(button.dataset.reviewReport);});document.querySelectorAll("[data-close-report-modal]").forEach(el=>el.addEventListener("click",closeModal));document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!els.modal.hidden)closeModal();});els.notes.addEventListener("input",()=>els.notesCounter.textContent=els.notes.value.length);els.form.addEventListener("submit",saveDecision);}
  async function init(){state.client=window.ThePetGridSupabase?.client||null;bind();if(await requireAdmin())await loadReports();}
  init().catch(error=>{console.error(error);deny("Moderation Center unavailable",error.message||"An unexpected error occurred.");});
})();
