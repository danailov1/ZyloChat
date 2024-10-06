// chat.js
import { collection, query, getDocs, addDoc, onSnapshot, doc, getDoc, orderBy, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { db } from './firebase.js';
import { getConversationId } from './utils.js';
import { currentUser, currentNickname } from './userInfo.js';

let selectedUserId = null;
let selectedUserNickname = null; 
let selectedConversationId = null;

export const initChat = async (userId, userNickname) => {
  selectedUserId = userId;
  selectedUserNickname = userNickname;

  document.getElementById('chat-title').innerText = `Chat with ${selectedUserNickname}`;

  selectedConversationId = getConversationId(currentUser.uid, selectedUserId);
  await ensureConversationExists(selectedConversationId);
  listenForMessages(selectedConversationId);

  await addRecentChat(selectedUserId, selectedUserNickname);
  await addRecentChatToOtherUser(currentUser.uid, currentNickname, selectedUserId);
  
  document.getElementById('search-results').innerHTML = '';
};

const listenForMessages = (conversationId) => {
  if (!conversationId) return;

  const messagesCollection = collection(db, `conversations/${conversationId}/messages`);
  const messagesQuery = query(messagesCollection, orderBy("timestamp", "asc"));

  onSnapshot(messagesQuery, (querySnapshot) => {
    const messages = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.timestamp) {
        data.timestamp = new Date().getTime();
      }
      messages.push(data);
    });

    displayMessages(messages);
  });
};

const displayMessages = (messages) => {
  const chatMessagesDiv = document.getElementById('chat-messages');
  chatMessagesDiv.innerHTML = ''; 

  messages.forEach((message) => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message');
    messageDiv.classList.add(message.senderId === currentUser.uid ? 'outgoing' : 'incoming');

    if (message.file) {
      const fileElement = document.createElement('img');
      fileElement.src = message.file; 
      fileElement.alt = "Attached file";
      fileElement.style.maxWidth = "200px"; 
      messageDiv.appendChild(fileElement);
    } else {
      const textSpan = document.createElement('span');
      textSpan.innerHTML = `<strong>${message.senderNickname}:</strong> ${message.text}`;
      messageDiv.appendChild(textSpan);
    }

    chatMessagesDiv.appendChild(messageDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; 
  });
};

export const loadRecentChats = async () => {
  const recentChatsCollection = collection(db, `users/${currentUser.uid}/recentChats`);
  const querySnapshot = await getDocs(recentChatsCollection);

  const recentChatsList = document.getElementById('recent-chats-list');
  recentChatsList.innerHTML = ''; 

  for (const recentChatDoc of querySnapshot.docs) {
    const recentChat = recentChatDoc.data();
    const userDocRef = doc(db, "users", recentChat.userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const nickname = userDoc.data().nickname;
      const recentChatItem = document.createElement('li');
      recentChatItem.textContent = nickname;
      recentChatItem.setAttribute('data-user-id', recentChat.userId);
      recentChatItem.addEventListener('click', () => initChat(recentChat.userId, nickname));
      recentChatsList.appendChild(recentChatItem);
    }
  }
};

const ensureConversationExists = async (conversationId) => {
  const conversationDocRef = doc(db, "conversations", conversationId);
  const conversationDoc = await getDoc(conversationDocRef);

  if (!conversationDoc.exists()) {
    await setDoc(conversationDocRef, { createdAt: serverTimestamp() });
  }
};

const addRecentChat = async (userId, userNickname) => {
  const recentChatRef = doc(db, `users/${currentUser.uid}/recentChats`, userId);
  await setDoc(recentChatRef, { userId: userId, nickname: userNickname });
};

const addRecentChatToOtherUser = async (currentUserId, currentNickname, otherUserId) => {
  const recentChatRef = doc(db, `users/${otherUserId}/recentChats`, currentUserId);
  await setDoc(recentChatRef, { userId: currentUserId, nickname: currentNickname });
};

export const initChatListeners = () => {
  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('attach-btn').addEventListener('click', () => {
    document.getElementById('file-input').click();
  });
  document.getElementById('file-input').addEventListener('change', handleFileUpload);
};

const sendMessage = async () => {
  const messageInput = document.getElementById('message-input');
  const messageText = messageInput.value.trim();

  if (messageText && selectedConversationId) {
    const newMessage = {
      senderId: currentUser.uid,
      senderNickname: currentNickname,
      text: messageText,
      timestamp: serverTimestamp()
    };

    const messagesCollection = collection(db, `conversations/${selectedConversationId}/messages`);
    await addDoc(messagesCollection, newMessage);

    messageInput.value = ''; 
  } else {
    alert("Please select a user to chat with or enter a message!");
  }
};

const handleFileUpload = async (event) => {
  const file = event.target.files[0];

  if (file && selectedConversationId) {
    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64String = reader.result;

      const newMessage = {
        senderId: currentUser.uid,
        senderNickname: currentNickname,
        file: base64String, 
        timestamp: serverTimestamp()
      };

      const messagesCollection = collection(db, `conversations/${selectedConversationId}/messages`);
      await addDoc(messagesCollection, newMessage);

      event.target.value = '';
    };

    reader.readAsDataURL(file);
  } else {
    alert("Please select a user to chat with before sending a file.");
  }
};
