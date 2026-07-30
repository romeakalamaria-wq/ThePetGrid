export function readJSON(key,fallback){ try { const raw=localStorage.getItem(key); if(raw===null)return fallback; const v=JSON.parse(raw); return v ?? fallback; } catch { return fallback; } }
export function readArray(key){ const v=readJSON(key,[]); return Array.isArray(v)?v:[]; }
export function writeJSON(key,value){ try { localStorage.setItem(key,JSON.stringify(value)); return true; } catch(err){ console.error("Storage write failed",err); return false; } }
