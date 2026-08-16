(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const els = { gate:$("#moderationGate"), app:$("#moderationApp"), list:$("#reportsList"), empty:$("#reportsEmpty"), summary:$("#resultsSummary"), status:$("#moderationStatus"), refresh:$("#refreshReportsButton"), search:$("#reportSearch"), statusFilter:$("#statusFilter"), typeFilter:$("#typeFilter"), reasonFilter:$("#reasonFilter"), sort:$("#sortFilter"), clear:$("#clearFiltersButton"), modal:$("#reportModal"), modalDetails:$("#reportModalDetails"), modalTitle:$("#reportModalTitle"), form:$("#reportDecisionForm"), reportId:$("#decisionReportId"), decision:$("#decisionStatus"), notes:$("#moderatorNotes"), notesCounter:$("#notesCounter"), save:$("#saveDecisionButton"), counts:{open:$("#openCount"),reviewing:$("#reviewingCount"),resolved:$("#resolvedCount"),dismissed:$("#dismissedCount"),total:$("#totalCount")} };
  const state={client:null,user:null,reports:[],filtered:[],current:null,loading:false,betaFeedback:[],betaLoading:false};
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

  function ensureBetaFeedbackPanel(){
    if(document.getElementById("betaFeedbackAdminPanel")) return;

    const style=document.createElement("style");
    style.textContent=`
      .beta-admin-panel{margin-top:34px;padding:24px;border:1px solid #e7e5e4;border-radius:22px;background:#fff;box-shadow:0 16px 42px rgba(15,23,42,.07)}
      .beta-admin-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}
      .beta-admin-head h2{margin:5px 0 4px;font-size:1.55rem}
      .beta-admin-head p{margin:0;color:#64748b}
      .beta-admin-kicker{font-size:.72rem;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:#d97706}
      .beta-admin-refresh{min-height:40px;padding:0 14px;border:1px solid #fed7aa;border-radius:11px;background:#fff7ed;color:#c2410c;font-weight:800}
      .beta-admin-counts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
      .beta-admin-count{padding:14px;border:1px solid #e5e7eb;border-radius:14px;background:#fafafa}
      .beta-admin-count strong{display:block;font-size:1.35rem}
      .beta-admin-count span{color:#64748b;font-size:.78rem}
      .beta-admin-list{display:grid;gap:12px}
      .beta-feedback-admin-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;padding:17px;border:1px solid #e5e7eb;border-radius:16px;background:#fff}
      .beta-feedback-admin-card[data-type="bug"]{border-left:4px solid #e11d48}
      .beta-feedback-admin-card[data-type="suggestion"]{border-left:4px solid #f59e0b}
      .beta-feedback-admin-card[data-type="unclear"]{border-left:4px solid #3b82f6}
      .beta-feedback-admin-top{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:8px}
      .beta-feedback-admin-badge{padding:4px 8px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:.68rem;font-weight:900;text-transform:uppercase}
      .beta-feedback-admin-card h3{margin:0 0 6px;font-size:1rem}
      .beta-feedback-admin-card p{margin:0;color:#475569;line-height:1.5;white-space:pre-wrap}
      .beta-feedback-admin-meta{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;color:#94a3b8;font-size:.72rem}
      .beta-feedback-admin-actions{display:flex;flex-direction:column;gap:7px;min-width:126px}
      .beta-feedback-admin-actions select,.beta-feedback-admin-actions button{min-height:36px;border-radius:10px;font:inherit;font-size:.76rem;font-weight:800}
      .beta-feedback-admin-actions select{border:1px solid #dbe2ea;background:#fff;padding:0 8px}
      .beta-feedback-admin-actions button{border:0;background:#0f172a;color:#fff;padding:0 10px}
      .beta-admin-empty{padding:28px;text-align:center;color:#64748b;border:1px dashed #cbd5e1;border-radius:14px}
      .beta-admin-status{min-height:20px;margin:8px 0;color:#64748b;font-size:.82rem}
      @media(max-width:760px){
        .beta-admin-panel{padding:17px}
        .beta-admin-head{flex-direction:column}
        .beta-admin-counts{grid-template-columns:repeat(2,1fr)}
        .beta-feedback-admin-card{grid-template-columns:1fr}
        .beta-feedback-admin-actions{flex-direction:row;min-width:0}
        .beta-feedback-admin-actions select{flex:1}
      }
    `;
    document.head.appendChild(style);

    const panel=document.createElement("section");
    panel.id="betaFeedbackAdminPanel";
    panel.className="beta-admin-panel";
    panel.innerHTML=`
      <div class="beta-admin-head">
        <div>
          <span class="beta-admin-kicker">🧪 Beta</span>
          <h2>Beta Feedback Inbox</h2>
          <p>Bug reports, suggestions and unclear moments sent by testers.</p>
        </div>
        <button id="refreshBetaFeedbackButton" class="beta-admin-refresh" type="button">Refresh feedback</button>
      </div>

      <div class="beta-admin-counts">
        <div class="beta-admin-count"><strong id="betaNewCount">0</strong><span>New</span></div>
        <div class="beta-admin-count"><strong id="betaReviewingCount">0</strong><span>Reviewing</span></div>
        <div class="beta-admin-count"><strong id="betaResolvedCount">0</strong><span>Resolved</span></div>
        <div class="beta-admin-count"><strong id="betaTotalCount">0</strong><span>Total</span></div>
      </div>

      <p id="betaFeedbackAdminStatus" class="beta-admin-status"></p>
      <div id="betaFeedbackAdminList" class="beta-admin-list"></div>
    `;

    els.app.appendChild(panel);

    panel.querySelector("#refreshBetaFeedbackButton")
      .addEventListener("click",loadBetaFeedback);

    panel.querySelector("#betaFeedbackAdminList")
      .addEventListener("click",async event=>{
        const button=event.target.closest("[data-save-beta-feedback]");
        if(!button)return;
        const card=button.closest("[data-beta-feedback-id]");
        if(!card)return;
        const select=card.querySelector("[data-beta-status]");
        await updateBetaFeedbackStatus(card.dataset.betaFeedbackId,select.value,button);
      });
  }

  function betaFeedbackLabel(type){
    return type==="bug"?"🐛 Bug":type==="suggestion"?"💡 Suggestion":"❓ Something unclear";
  }

  function renderBetaFeedback(){
    const list=document.getElementById("betaFeedbackAdminList");
    if(!list)return;

    const count=status=>state.betaFeedback.filter(item=>item.status===status).length;
    document.getElementById("betaNewCount").textContent=count("new");
    document.getElementById("betaReviewingCount").textContent=count("reviewing");
    document.getElementById("betaResolvedCount").textContent=count("resolved");
    document.getElementById("betaTotalCount").textContent=state.betaFeedback.length;

    if(!state.betaFeedback.length){
      list.innerHTML='<div class="beta-admin-empty">No beta feedback yet.</div>';
      return;
    }

    list.innerHTML=state.betaFeedback.map(item=>`
      <article class="beta-feedback-admin-card" data-beta-feedback-id="${safe(item.id)}" data-type="${safe(item.feedback_type)}">
        <div>
          <div class="beta-feedback-admin-top">
            <span class="beta-feedback-admin-badge">${safe(betaFeedbackLabel(item.feedback_type))}</span>
            <span class="beta-feedback-admin-badge">${safe(item.status)}</span>
            <span class="beta-feedback-admin-badge">${safe(item.page_name)}</span>
          </div>
          <h3>${safe(item.username?`@${item.username}`:"Anonymous tester")}</h3>
          <p>${safe(item.description)}</p>
          <div class="beta-feedback-admin-meta">
            <span>${safe(fmt(item.created_at))}</span>
            ${item.device_info?`<span>${safe(item.device_info)}</span>`:""}
          </div>
        </div>
        <div class="beta-feedback-admin-actions">
          <select data-beta-status aria-label="Feedback status">
            ${["new","reviewing","resolved","dismissed"].map(status=>`<option value="${status}"${item.status===status?" selected":""}>${status}</option>`).join("")}
          </select>
          <button type="button" data-save-beta-feedback>Save</button>
        </div>
      </article>
    `).join("");
  }

  async function loadBetaFeedback(){
    if(state.betaLoading)return;
    const status=document.getElementById("betaFeedbackAdminStatus");
    const refresh=document.getElementById("refreshBetaFeedbackButton");
    state.betaLoading=true;
    if(refresh)refresh.disabled=true;
    if(status)status.textContent="Loading beta feedback…";

    try{
      const {data,error}=await state.client
        .from("beta_feedback")
        .select("id,user_id,username,feedback_type,page_name,description,device_info,page_url,user_agent,status,created_at,reviewed_at,reviewed_by,admin_notes")
        .order("created_at",{ascending:false})
        .limit(500);

      if(error)throw error;
      state.betaFeedback=data||[];
      renderBetaFeedback();
      if(status)status.textContent=`Feedback updated ${new Intl.DateTimeFormat("en-GB",{timeStyle:"short"}).format(new Date())}.`;
    }catch(error){
      console.error(error);
      if(status)status.textContent=error.message||"Beta feedback could not be loaded.";
    }finally{
      state.betaLoading=false;
      if(refresh)refresh.disabled=false;
    }
  }

  async function updateBetaFeedbackStatus(id,nextStatus,button){
    if(!id||!["new","reviewing","resolved","dismissed"].includes(nextStatus))return;
    button.disabled=true;
    try{
      const payload={
        status:nextStatus,
        reviewed_at:["resolved","dismissed"].includes(nextStatus)?new Date().toISOString():null,
        reviewed_by:["resolved","dismissed"].includes(nextStatus)?state.user.id:null
      };
      const {error}=await state.client.from("beta_feedback").update(payload).eq("id",id);
      if(error)throw error;
      const item=state.betaFeedback.find(entry=>String(entry.id)===String(id));
      if(item)Object.assign(item,payload);
      renderBetaFeedback();
      const status=document.getElementById("betaFeedbackAdminStatus");
      if(status)status.textContent=`Feedback marked as ${nextStatus}.`;
    }catch(error){
      console.error(error);
      const status=document.getElementById("betaFeedbackAdminStatus");
      if(status)status.textContent=error.message||"Feedback status could not be updated.";
    }finally{
      button.disabled=false;
    }
  }

  function bind(){[els.search,els.statusFilter,els.typeFilter,els.reasonFilter,els.sort].forEach(el=>el.addEventListener(el===els.search?"input":"change",applyFilters));els.clear.addEventListener("click",()=>{els.search.value="";els.statusFilter.value=els.typeFilter.value=els.reasonFilter.value="all";els.sort.value="newest";applyFilters();});els.refresh.addEventListener("click",loadReports);els.list.addEventListener("click",e=>{const button=e.target.closest("[data-review-report]");if(button)openModal(button.dataset.reviewReport);});document.querySelectorAll("[data-close-report-modal]").forEach(el=>el.addEventListener("click",closeModal));document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!els.modal.hidden)closeModal();});els.notes.addEventListener("input",()=>els.notesCounter.textContent=els.notes.value.length);els.form.addEventListener("submit",saveDecision);}
  async function init(){state.client=window.ThePetGridSupabase?.client||null;bind();if(await requireAdmin()){ensureBetaFeedbackPanel();await Promise.all([loadReports(),loadBetaFeedback()]);}}
  init().catch(error=>{console.error(error);deny("Moderation Center unavailable",error.message||"An unexpected error occurred.");});
})();
