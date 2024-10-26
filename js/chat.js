// chat.js
import { collection, query, getDocs, addDoc, onSnapshot, doc, getDoc, orderBy, serverTimestamp, setDoc, limit, startAfter, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { db } from './firebase.js';
import { getConversationId } from './utils.js';
import { currentUser, currentNickname } from './userInfo.js';
import { initGroupChat, sendGroupMessage } from './groupChat.js';
import chatStateManager from './chatState.js';


let selectedUserId = null;
let selectedUserNickname = null; 
let selectedConversationId = null;
let lastVisibleMessage = null;
const MESSAGES_PER_PAGE = 20;
let loadedMessages = []; 
const MESSAGE_STATUS = {
    SENT: 'sent',
    SEEN: 'seen'
  };
  

export const scrollToBottom = () => {
  const chatMessagesDiv = document.getElementById('chat-messages');
  chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
};

export const initChat = async (conversationId, name) => {
    // Show the chat interface when a conversation is selected
    chatStateManager.handleChatSelection(true);
    chatStateManager.updateChatTitle(name);

    selectedConversationId = conversationId;

    if (conversationId.startsWith('group_')) {
        await initGroupChat(conversationId, name);
    } else {
        selectedUserId = conversationId;
        selectedUserNickname = name;
        selectedConversationId = getConversationId(currentUser.uid, selectedUserId);
        await ensureConversationExists(selectedConversationId);
        await loadInitialMessages(selectedConversationId);
        listenForNewMessages(selectedConversationId);
    }

    await addRecentChat(conversationId, name);
    document.getElementById('search-results').innerHTML = '';

    if (!conversationId.startsWith('group_')) {
        await updateLastSeenStatus(selectedUserId);
    }

    scrollToBottom();
    setupMessageObserver();

};

const updateLastSeenStatus = async (userId) => {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const lastSeen = userDoc.data().lastSeen;
        const lastSeenElement = document.querySelector('.chat-last-seen-status');

        if (lastSeen) {
            const lastSeenDate = lastSeen.toDate();
            const now = new Date();
            const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));

            if (diffInMinutes < 1) {
                lastSeenElement.textContent = 'Online';
            } else if (diffInMinutes < 60) {
                lastSeenElement.textContent = `Last seen ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
            } else if (diffInMinutes < 1440) {
                const hours = Math.floor(diffInMinutes / 60);
                lastSeenElement.textContent = `Last seen ${hours} hour${hours > 1 ? 's' : ''} ago`;
            } else {
                const days = Math.floor(diffInMinutes / 1440);
                lastSeenElement.textContent = `Last seen ${days} day${days > 1 ? 's' : ''} ago`;
            }
        } else {
            lastSeenElement.textContent = 'Last seen status not available';
        }
    }
};

const loadInitialMessages = async (conversationId) => {
    if (!conversationId) return;

    const messagesCollection = collection(db, `conversations/${conversationId}/messages`);
    const messagesQuery = query(messagesCollection, orderBy("timestamp", "desc"), limit(MESSAGES_PER_PAGE));

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
  const newMessagesQuery = query(messagesCollection, orderBy("timestamp", "desc"), limit(1));
  
  onSnapshot(newMessagesQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
          if (change.type === "added" || change.type === "modified") {
              const messageData = change.doc.data();
              const messageId = change.doc.id;
              const existingMessageIndex = loadedMessages.findIndex(m => m.id === messageId);
              
              if (existingMessageIndex >= 0) {
                  // Update the existing message status in the chat UI
                  loadedMessages[existingMessageIndex] = { id: messageId, ...messageData };
                  updateMessageStatus(messageId, messageData.status);
              } else {
                  // Add the new message to the chat UI
                  const newMessage = { id: messageId, ...messageData };
                  displayNewMessage(newMessage);
              }

              // Re-apply observer on each new message
              if (messageData.senderId !== currentUser.uid && messageData.status !== MESSAGE_STATUS.SEEN) {
                  markMessageAsSeen(messageId);
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
      orderBy("timestamp", "desc"), 
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

// Modify the displayMessages function to show status
export const displayMessages = (messages) => {
    const chatMessagesDiv = document.getElementById('chat-messages');
    chatMessagesDiv.innerHTML = '';
  
    messages.forEach((message) => {
      if (!message || !message.senderId) return;
  
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('chat-message');
      messageDiv.classList.add(message.senderId === currentUser.uid ? 'outgoing' : 'incoming');
      messageDiv.setAttribute('data-message-id', message.id);
  
      const contentDiv = document.createElement('div');
      contentDiv.classList.add('message-content');
  
      if (message.file) {
        const fileElement = document.createElement('img');
        fileElement.src = message.file;
        fileElement.alt = "Attached file";
        fileElement.style.maxWidth = "200px";
        contentDiv.appendChild(fileElement);
      } else if (message.text) {
        const textSpan = document.createElement('span');
        textSpan.innerHTML = `<strong>${message.senderNickname || 'Unknown'}:</strong> ${message.text}`;
        contentDiv.appendChild(textSpan);
      }
  
      // Add status element for outgoing messages
      if (message.senderId === currentUser.uid) {
        const statusSpan = document.createElement('span');
        statusSpan.classList.add('message-status');
        statusSpan.textContent = message.status || MESSAGE_STATUS.SENT;
        contentDiv.appendChild(statusSpan);
      }
  
      messageDiv.appendChild(contentDiv);
      chatMessagesDiv.appendChild(messageDiv);
    });
  
    if (messages.length > 0) {
      scrollToBottom();
    }
  };


  const markMessageAsSeen = async (messageId) => {
    if (!selectedConversationId || !messageId) return;

    const messageRef = doc(db, `conversations/${selectedConversationId}/messages`, messageId);
    
    // Only update if the current status is not already 'seen'
    const messageSnapshot = await getDoc(messageRef);
    if (messageSnapshot.exists() && messageSnapshot.data().status !== MESSAGE_STATUS.SEEN) {
        await updateDoc(messageRef, {
            status: MESSAGE_STATUS.SEEN
        });
    }
};

  
const setupMessageObserver = () => {
  const observer = new IntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
          if (entry.isIntersecting) {
              const messageDiv = entry.target;
              const messageId = messageDiv.getAttribute('data-message-id');
              const message = loadedMessages.find(m => m.id === messageId);

              // Only mark as seen if it's an incoming message and not already seen
              if (message && message.senderId !== currentUser.uid && message.status !== MESSAGE_STATUS.SEEN) {
                  await markMessageAsSeen(messageId);
              }
          }
      });
  }, { threshold: 1.0 });

  // Observe each incoming message element
  document.querySelectorAll('.chat-message.incoming').forEach(messageDiv => {
      observer.observe(messageDiv);
  });
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
  messageDiv.setAttribute('data-message-id', message.id);

  const contentDiv = document.createElement('div');
  contentDiv.classList.add('message-content');

  if (message.file) {
      const fileElement = document.createElement('img');
      fileElement.src = message.file;
      fileElement.alt = "Attached file";
      fileElement.style.maxWidth = "200px";
      contentDiv.appendChild(fileElement);
  } else if (message.text) {
      const textSpan = document.createElement('span');
      textSpan.innerHTML = `<strong>${message.senderNickname || 'Unknown'}:</strong> ${message.text}`;
      contentDiv.appendChild(textSpan);
  }

  // Add status element for outgoing messages
  if (message.senderId === currentUser.uid) {
    const statusSpan = document.createElement('span');
    statusSpan.classList.add('message-status');
    statusSpan.textContent = message.status || MESSAGE_STATUS.SENT;
    contentDiv.appendChild(statusSpan);
  }

  messageDiv.appendChild(contentDiv);
  chatMessagesDiv.appendChild(messageDiv);
  chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;

  // Observe the new incoming message for seen status
  if (message.senderId !== currentUser.uid) {
      setupMessageObserver();
  }
};

// Add function to update message status in UI
const updateMessageStatus = (messageId, status) => {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageDiv) {
      const statusSpan = messageDiv.querySelector('.message-status');
      if (statusSpan) {
        statusSpan.textContent = status;
      }
    }
  };

export const loadRecentChats = async () => {
    if (!currentUser) {
        console.warn('currentUser is not set. Skipping loadRecentChats.');
        return;
      }
    
  const recentChatsCollection = collection(db, `users/${currentUser.uid}/recentChats`);
  const querySnapshot = await getDocs(recentChatsCollection);

  const recentChatsList = document.getElementById('recent-chats-list');
  recentChatsList.innerHTML = '';

  for (const recentChatDoc of querySnapshot.docs) {
      const recentChat = recentChatDoc.data();
      const chatId = recentChatDoc.id;

      if (chatId.startsWith('group_')) {
          const groupDocRef = doc(db, "groups", chatId);
          const groupDoc = await getDoc(groupDocRef);

          if (groupDoc.exists()) {
              const groupName = groupDoc.data().groupName;
              const recentChatItem = document.createElement('li');
              recentChatItem.textContent = groupName;
              recentChatItem.setAttribute('data-chat-id', chatId);
              recentChatItem.addEventListener('click', () => initChat(chatId, groupName));
              recentChatsList.appendChild(recentChatItem);
          }
      } else {
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

const addRecentChat = async (chatId, chatName) => {
  const recentChatRef = doc(db, `users/${currentUser.uid}/recentChats`, chatId);
  await setDoc(recentChatRef, { userId: chatId, nickname: chatName });
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
    if (selectedConversationId.startsWith('group_')) {
      await sendGroupMessage(messageText);
    } else {
      const conversationRef = doc(db, "conversations", selectedConversationId);
      const conversationDoc = await getDoc(conversationRef);
      const currentCount = conversationDoc.data().messageCount || 0;

      const messagesCollection = collection(db, `conversations/${selectedConversationId}/messages`);
      const newMessageRef = await addDoc(messagesCollection, {
        senderId: currentUser.uid,
        senderNickname: currentNickname,
        text: messageText,
        timestamp: serverTimestamp(),
        count: currentCount + 1,
        status: MESSAGE_STATUS.SENT
      });

      // Create a temporary message object for immediate display
      const tempMessage = {
        id: newMessageRef.id,
        senderId: currentUser.uid,
        senderNickname: currentNickname,
        text: messageText,
        timestamp: new Date(),
        count: currentCount + 1,
        status: MESSAGE_STATUS.SENT
      };

      // Display the message immediately
      displayNewMessage(tempMessage);

      await updateDoc(conversationRef, {
        messageCount: increment(1)
      });
    }

    messageInput.value = '';
    adjustTextareaHeight(messageInput);
    messageInput.style.height = '20px';
    messageInput.style.overflowY = 'hidden';
    document.querySelector('.chat-input-container').style.height = '36px';
    document.querySelector('.chat-messages').style.paddingBottom = '60px';

    const inputEvent = new Event('input', {
        bubbles: true,
        cancelable: true,
    });
    messageInput.dispatchEvent(inputEvent);
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

          if (selectedConversationId.startsWith('group_')) {
              await sendGroupMessage(null, base64String);
          } else {
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
          }

          event.target.value = '';
      };

      reader.readAsDataURL(file);
  } else {
      alert("Please select a user to chat with before sending a file.");
  }
};

function adjustTextareaHeight(textarea) {
  textarea.style.height = 'auto';
  const newHeight = Math.min(textarea.scrollHeight, 100);
  textarea.style.height = newHeight + 'px';
  
  textarea.style.overflowY = textarea.scrollHeight > 100 ? 'auto' : 'hidden';
  
  const container = document.querySelector('.chat-input-container');
  container.style.height = (newHeight + 16) + 'px';
  
  const chatMessages = document.querySelector('.chat-messages');
  chatMessages.style.paddingBottom = (newHeight + 26) + 'px';
}

function initExpandableInput() {
  const textarea = document.getElementById('message-input');
  
  adjustTextareaHeight(textarea);

  textarea.addEventListener('input', function() {
      adjustTextareaHeight(this);
  });

  textarea.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
          this.style.height = 'auto';
          this.style.overflowY = 'hidden';
          adjustTextareaHeight(this);
      }
  });

  textarea.addEventListener('focus', function() {
      adjustTextareaHeight(this);
  });

  textarea.addEventListener('blur', function() {
      if (this.value === '') {
          this.style.height = '20px';
          this.style.overflowY = 'hidden';
          document.querySelector('.chat-input-container').style.height = '36px';
          document.querySelector('.chat-messages').style.paddingBottom = '60px';
      }
  });
}

document.addEventListener('DOMContentLoaded', initExpandableInput);


const styles = `
.message-content {
  position: relative;
  display: flex;
  flex-direction: column;
}

.message-status {
  font-size: 0.7em;
  color: #666;
  margin-top: 2px;
  align-self: flex-end;
}

.chat-message.outgoing .message-status {
  margin-right: 5px;
}
`;

// Add styles to document
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);




