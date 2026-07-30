import { DEFAULT_AVATAR, STORAGE_KEYS } from "./config.js";
import { readArray, readJSON, writeJSON } from "./storage.js";
import { state, currentUserId } from "./state.js";
import { createId } from "./utils.js";
export function loadData(){
 state.currentUser=readJSON(STORAGE_KEYS.currentUser,null)||{id:"current_user",username:"you",name:"You",avatar:DEFAULT_AVATAR};
 if(!state.currentUser.id) state.currentUser.id=state.currentUser.userId||state.currentUser.username||"current_user";
 const defaults=[
  {id:"user_anna",name:"Anna Petrou",username:"annapets",avatar:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",location:"Athens, Greece",online:true},
  {id:"user_nikos",name:"Nikos Georgiou",username:"nikosandmax",avatar:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",location:"Thessaloniki, Greece",online:false},
  {id:"user_maria",name:"Maria Costa",username:"mariacats",avatar:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",location:"Rome, Italy",online:true}
 ];
 const storedUsers=readArray(STORAGE_KEYS.users); state.users=storedUsers.length?storedUsers:defaults;
 const stored=readArray(STORAGE_KEYS.conversations);
 state.conversations=(stored.length?stored:defaultConversations()).map(c=>({pinned:false,archived:false,muted:false,blocked:false,...c,participants:Array.isArray(c.participants)?c.participants.map(String):[],messages:Array.isArray(c.messages)?c.messages:[]}));
 saveData();
}
function defaultConversations(){ const now=Date.now(); return [{id:"conversation_anna",participants:[currentUserId(),"user_anna"],updatedAt:now-180000,messages:[{id:createId("message"),senderId:"user_anna",text:"Hi! Your pet photos are amazing! 🐾",type:"text",createdAt:now-3600000,read:true}]},{id:"conversation_maria",participants:[currentUserId(),"user_maria"],updatedAt:now-7200000,messages:[{id:createId("message"),senderId:"user_maria",text:"Welcome to ThePetGrid! 😊",type:"text",createdAt:now-7200000,read:true}]}]; }
export function saveData(){ writeJSON(STORAGE_KEYS.users,state.users); writeJSON(STORAGE_KEYS.conversations,state.conversations); }
