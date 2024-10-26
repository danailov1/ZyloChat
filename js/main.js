// main.js
import { initAuth } from './userInfo.js'; 
import { initSearch } from './search.js';
import { initChatListeners, loadRecentChats } from './chat.js';
import { openGroupChatUI } from './groupChat.js';

const initApp = async () => {
  await initAuth();
  initSearch();
  initChatListeners();
  await loadRecentChats();

  const groupChatBtn = document.getElementById('group-chat-btn');
  if (groupChatBtn) {
    groupChatBtn.addEventListener('click', openGroupChatUI);
  } else {
    console.warn('group-chat-btn not found.');
  }
};

document.addEventListener('DOMContentLoaded', initApp);