export function createId(prefix="id") { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,9)}`; }
export function escapeHTML(value="") { return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
export function normalize(value="") { return String(value).toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim(); }
export function formatTime(ts) { try { return new Intl.DateTimeFormat("el-GR",{hour:"2-digit",minute:"2-digit"}).format(new Date(ts)); } catch { return ""; } }
export function formatConversationTime(ts) { const d=new Date(ts), n=new Date(); return d.toDateString()===n.toDateString()?formatTime(ts):new Intl.DateTimeFormat("el-GR",{day:"2-digit",month:"2-digit"}).format(d); }
export function formatDateSeparator(ts) { const d=new Date(ts), today=new Date(), y=new Date(); y.setDate(today.getDate()-1); if(d.toDateString()===today.toDateString()) return "Today"; if(d.toDateString()===y.toDateString()) return "Yesterday"; return new Intl.DateTimeFormat("el-GR",{day:"numeric",month:"long",year:"numeric"}).format(d); }
export function formatFileSize(bytes=0){ if(bytes<1024)return `${bytes} B`; if(bytes<1048576)return `${(bytes/1024).toFixed(1)} KB`; return `${(bytes/1048576).toFixed(1)} MB`; }
