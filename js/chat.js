// chat.js
import { collection, query, getDocs, addDoc, onSnapshot, doc, getDoc, orderBy, serverTimestamp, setDoc, limit, startAfter, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { db } from './firebase.js';
import { getConversationId } from './utils.js';
import { currentUser, currentNickname } from './userInfo.js';

let selectedUserId = null;
let selectedUserNickname = null; 
let selectedConversationId = null;
let lastVisibleMessage = null;
const MESSAGES_PER_PAGE = 20;
let loadedMessages = []; 

export const initChat = async (userId, userNickname) => {
  selectedUserId = userId;
  selectedUserNickname = userNickname;

  document.getElementById('chat-title').innerText = `Chat with ${selectedUserNickname}`;

  selectedConversationId = getConversationId(currentUser.uid, selectedUserId);
  await ensureConversationExists(selectedConversationId);
  await loadInitialMessages(selectedConversationId);
  listenForNewMessages(selectedConversationId);

  await addRecentChat(selectedUserId, selectedUserNickname);
  await addRecentChatToOtherUser(currentUser.uid, currentNickname, selectedUserId);
  
  document.getElementById('search-results').innerHTML = '';
};


const loadInitialMessages = async (conversationId) => {
  if (!conversationId) return;

  const messagesCollection = collection(db, `conversations/${conversationId}/messages`);
  const messagesQuery = query(messagesCollection, orderBy("count", "desc"), limit(MESSAGES_PER_PAGE));

  const querySnapshot = await getDocs(messagesQuery);
  const messages = [];
  querySnapshot.forEach((doc) => {
    const messageData = doc.data();
    if (messageData && messageData.senderId) {
      messages.push({ id: doc.id, ...messageData }); 
    }
  });

  if (messages.length > 0) {
    lastVisibleMessage = querySnapshot.docs[querySnapshot.docs.length - 1];
    loadedMessages = messages.reverse(); 
    displayMessages(loadedMessages);
  } else {
    displayMessages([]);
  }

  setupInfiniteScroll();
};



const listenForNewMessages = (conversationId) => {
  const messagesCollection = collection(db, `conversations/${conversationId}/messages`);
  const newMessagesQuery = query(messagesCollection, orderBy("count", "desc"), limit(1));

  onSnapshot(newMessagesQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const newMessageData = change.doc.data();
        if (newMessageData && newMessageData.senderId) {
          const newMessage = { id: change.doc.id, ...newMessageData };
          displayNewMessage(newMessage);
        }
      }
    });
  });
};


const setupInfiniteScroll = () => {
  const chatMessagesDiv = document.getElementById('chat-messages');
  chatMessagesDiv.addEventListener('scroll', () => {
    if (chatMessagesDiv.scrollTop === 0) {
      loadMoreMessages();
    }
  });
};

const loadMoreMessages = async () => {
  if (!selectedConversationId || !lastVisibleMessage) return;

  const chatMessagesDiv = document.getElementById('chat-messages');

  const previousScrollHeight = chatMessagesDiv.scrollHeight;
  const previousScrollTop = chatMessagesDiv.scrollTop;

  const messagesCollection = collection(db, `conversations/${selectedConversationId}/messages`);
  const messagesQuery = query(
    messagesCollection, 
    orderBy("count", "desc"), 
    startAfter(lastVisibleMessage),
    limit(MESSAGES_PER_PAGE)
  );

  const querySnapshot = await getDocs(messagesQuery);
  const newMessages = [];
  querySnapshot.forEach((doc) => {
    const messageData = doc.data();
    if (messageData && messageData.senderId) {
      const messageWithId = { id: doc.id, ...messageData };
      if (!loadedMessages.find(msg => msg.id === messageWithId.id)) {
        newMessages.push(messageWithId);
      }
    } else {
      console.warn('Invalid message data:', messageData);
    }
  });

  if (newMessages.length > 0) {
    lastVisibleMessage = querySnapshot.docs[querySnapshot.docs.length - 1];
    loadedMessages = [...newMessages.reverse(), ...loadedMessages];
    displayMessages(loadedMessages);

    const newScrollHeight = chatMessagesDiv.scrollHeight;
    chatMessagesDiv.scrollTop = newScrollHeight - previousScrollHeight + previousScrollTop;
  }
};



const displayNewMessage = (message) => {
  if (loadedMessages.find(msg => msg.id === message.id)) {
    return; 
  }

  loadedMessages.push(message);
  const chatMessagesDiv = document.getElementById('chat-messages');

  const messageDiv = document.createElement('div');
  messageDiv.classList.add('chat-message');
  messageDiv.classList.add(message.senderId === currentUser.uid ? 'outgoing' : 'incoming');

  if (message.file) {
    const fileElement = document.createElement('img');
    fileElement.src = message.file;
    fileElement.alt = "Attached file";
    fileElement.style.maxWidth = "200px";
    messageDiv.appendChild(fileElement);
  } else if (message.text) {
    const textSpan = document.createElement('span');
    textSpan.innerHTML = `<strong>${message.senderNickname || 'Unknown'}:</strong> ${message.text}`;
    messageDiv.appendChild(textSpan);
  }

  chatMessagesDiv.appendChild(messageDiv);
  chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
};



const displayMessages = (messages) => {
  const chatMessagesDiv = document.getElementById('chat-messages');
  chatMessagesDiv.innerHTML = ''; 

  messages.forEach((message) => {
    if (!message || typeof message !== 'object') {
      console.warn('Invalid message object:', message);
      return;
    }

    if (!message.senderId) {
      console.warn('Message object missing senderId:', message);
      return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message');
    messageDiv.classList.add(message.senderId === currentUser.uid ? 'outgoing' : 'incoming');

    if (message.file) {
      const fileElement = document.createElement('img');
      fileElement.src = message.file; 
      fileElement.alt = "Attached file";
      fileElement.style.maxWidth = "200px"; 
      messageDiv.appendChild(fileElement);
    } else if (message.text) {
      const textSpan = document.createElement('span');
      textSpan.innerHTML = `<strong>${message.senderNickname || 'Unknown'}:</strong> ${message.text}`;
      messageDiv.appendChild(textSpan);
    } else {
      console.warn('Message has neither file nor text:', message);
      return;
    }

    chatMessagesDiv.appendChild(messageDiv);
  });

  if (messages.length > 0) {
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
  }
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
    await setDoc(conversationDocRef, { 
      createdAt: serverTimestamp(),
      messageCount: 0
    });
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
    const conversationRef = doc(db, "conversations", selectedConversationId);
    const conversationDoc = await getDoc(conversationRef);
    const currentCount = conversationDoc.data().messageCount || 0;

    const newMessage = {
      senderId: currentUser.uid,
      senderNickname: currentNickname,
      text: messageText,
      timestamp: serverTimestamp(),
      count: currentCount + 1
    };

    const messagesCollection = collection(db, `conversations/${selectedConversationId}/messages`);
    await addDoc(messagesCollection, newMessage);

    await updateDoc(conversationRef, {
      messageCount: increment(1)
    });

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

      const conversationRef = doc(db, "conversations", selectedConversationId);
      const conversationDoc = await getDoc(conversationRef);
      const currentCount = conversationDoc.data().messageCount || 0;

      const newMessage = {
        senderId: currentUser.uid,
        senderNickname: currentNickname,
        file: base64String,
        timestamp: serverTimestamp(),
        count: currentCount + 1
      };

      const messagesCollection = collection(db, `conversations/${selectedConversationId}/messages`);
      await addDoc(messagesCollection, newMessage);

      await updateDoc(conversationRef, {
        messageCount: increment(1)
      });

      event.target.value = '';
    };

    reader.readAsDataURL(file);
  } else {
    alert("Please select a user to chat with before sending a file.");
  }
};