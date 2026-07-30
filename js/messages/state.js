export const state = {
  currentUser:null, users:[], conversations:[], activeConversationId:null,
  conversationFilter:"all", conversationSearch:"", pendingAttachment:null,
  typingTimer:null
};
export function currentUserId(){ return String(state.currentUser?.id ?? state.currentUser?.userId ?? state.currentUser?.username ?? "current_user"); }
export function activeConversation(){ return state.conversations.find(c=>String(c.id)===String(state.activeConversationId)) ?? null; }
export function userById(id){ return state.users.find(u=>String(u.id)===String(id)) ?? null; }
export function otherUser(conversation){ if(!conversation)return null; const id=(Array.isArray(conversation.participants)?conversation.participants:[]).find(x=>String(x)!==currentUserId()); return userById(id); }
