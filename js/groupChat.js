// groupChat.js
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, onSnapshot, orderBy, limit, startAfter, addDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { db } from './firebase.js';
import { debounce } from './utils.js';
import { currentUser, currentNickname } from './userInfo.js';
import { initChat, displayMessages, scrollToBottom } from './chat.js';

let selectedUsers = [];
let isCreatingGroup = false;
let lastVisibleMessage = null;
const MESSAGES_PER_PAGE = 20;
let loadedMessages = [];
let selectedConversationId = null;

export const openGroupChatUI = () => {z
    const chatSidebar = document.querySelector('.chat-sidebar');
    chatSidebar.innerHTML = `
        <div class="sidebar-header">
            <button id="back-to-chats" class="menu-toggle">←</button>
            <input type="text" id="group-search-bar" placeholder="Search for users">
        </div>
        <div id="search-results" class="search-results-dropdown"></div>
        <ul id="selected-users-list"></ul>
        <div class="group-name-container">
            <input type="text" id="group-name-input" placeholder="Enter group name">
        </div>
        <button id="create-group-btn" class="create-group-btn">Create Group</button>
    `;

    // Add event listeners
    document.getElementById('group-search-bar').addEventListener('keyup', debounce(performGroupSearch, 300));
    document.getElementById('create-group-btn').addEventListener('click', createGroupChat);
    document.getElementById('back-to-chats').addEventListener('click', backToMainChatList);
};

export const performGroupSearch = async () => {
    const searchTerm = document.getElementById('group-search-bar').value.trim();
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';

    if (searchTerm === "") {
        return;
    }

    const q = query(
        collection(db, "users"),
        where('nickname', '>=', searchTerm),
        where('nickname', '<=', searchTerm + '\uf8ff')
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        resultsContainer.innerHTML = '<div>No user found</div>';
        return;
    }

    querySnapshot.forEach(docSnap => {
        const userId = docSnap.id;
        const userNickname = docSnap.data().nickname;

        if (!selectedUsers.includes(userId) && userId !== currentUser.uid) {
            const resultItem = document.createElement('div');
            resultItem.classList.add('search-result-item');
            resultItem.innerText = userNickname;

            resultItem.addEventListener('click', () => addUserToGroup(userId, userNickname));
            resultsContainer.appendChild(resultItem);
        }
    });
};

export const addUserToGroup = (userId, userNickname) => {
    if (!selectedUsers.includes(userId)) {
        selectedUsers.push(userId);
        const selectedUsersList = document.getElementById('selected-users-list');
        const userItem = document.createElement('li');
        userItem.textContent = userNickname;
        userItem.setAttribute('data-user-id', userId);
        userItem.addEventListener('click', () => removeUserFromGroup(userId));
        selectedUsersList.appendChild(userItem);
    }
};

export const createGroupChat = async () => {
    const groupNameInput = document.getElementById('group-name-input');
    const groupName = groupNameInput.value.trim();

    if (isCreatingGroup) {
        alert("Group creation is already in progress. Please wait.");
        return;
    }

    if (selectedUsers.length < 2) {
        alert("Please select at least two users for the group chat.");
        return;
    }

    if (groupName === "") {
        alert("Please enter a group name.");
        return;
    }

    isCreatingGroup = true;
    const groupId = `group_${Date.now()}`;
    const groupRef = doc(db, "groups", groupId);

    try {
        const allMembers = [...new Set([...selectedUsers, currentUser.uid])];

        await setDoc(groupRef, {
            groupName: groupName,
            createdAt: serverTimestamp(),
            members: allMembers,
            messageCount: 0
        });

        const promises = allMembers.map(userId => {
            const recentChatRef = doc(db, `users/${userId}/recentChats`, groupId);
            return setDoc(recentChatRef, {
                userId: groupId,
                nickname: groupName,
                lastMessage: "",
                timestamp: serverTimestamp()
            }, { merge: true });
        });

        await Promise.all(promises);

        selectedUsers = [];
        document.getElementById('selected-users-list').innerHTML = '';
        groupNameInput.value = '';

        alert("Group chat created successfully!");
        initChat(groupId, groupName);
    } catch (error) {
        console.error("Error creating group chat:", error);
        alert("Failed to create group chat. Please try again.");
    } finally {
        isCreatingGroup = false;
    }
};

export const initGroupChat = async (groupId, groupName) => {
    selectedConversationId = groupId;
    document.getElementById('chat-title').innerText = groupName;

    await loadInitialGroupMessages(groupId);
    listenForNewGroupMessages(groupId);
    setupInfiniteGroupScroll();

    scrollToBottom();
};

const loadInitialGroupMessages = async (groupId) => {
    const messagesCollection = collection(db, `groups/${groupId}/messages`);
    const messagesQuery = query(messagesCollection, orderBy("timestamp", "desc"), limit(MESSAGES_PER_PAGE));

    const querySnapshot = await getDocs(messagesQuery);
    const messages = [];
    querySnapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() });
    });

    if (messages.length > 0) {
        lastVisibleMessage = querySnapshot.docs[querySnapshot.docs.length - 1];
        loadedMessages = messages.reverse();
        displayMessages(loadedMessages);
    } else {
        displayMessages([]);
    }
};

const listenForNewGroupMessages = (groupId) => {
    const messagesCollection = collection(db, `groups/${groupId}/messages`);
    const newMessagesQuery = query(messagesCollection, orderBy("timestamp", "desc"), limit(1));

    onSnapshot(newMessagesQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const newMessage = { id: change.doc.id, ...change.doc.data() };
                displayNewGroupMessage(newMessage);
            }
        });
    });
};

const displayNewGroupMessage = (message) => {
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
        textSpan.innerHTML = `<strong>${message.senderNickname}:</strong> ${message.text}`;
        messageDiv.appendChild(textSpan);
    }

    chatMessagesDiv.appendChild(messageDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
};

const setupInfiniteGroupScroll = () => {
    const chatMessagesDiv = document.getElementById('chat-messages');
    chatMessagesDiv.addEventListener('scroll', () => {
        if (chatMessagesDiv.scrollTop === 0) {
            loadMoreGroupMessages();
        }
    });
};

const loadMoreGroupMessages = async () => {
    if (!selectedConversationId || !lastVisibleMessage) return;

    const chatMessagesDiv = document.getElementById('chat-messages');
    const previousScrollHeight = chatMessagesDiv.scrollHeight;
    const previousScrollTop = chatMessagesDiv.scrollTop;

    const messagesCollection = collection(db, `groups/${selectedConversationId}/messages`);
    const messagesQuery = query(
        messagesCollection, 
        orderBy("timestamp", "desc"), 
        startAfter(lastVisibleMessage),
        limit(MESSAGES_PER_PAGE)
    );

    const querySnapshot = await getDocs(messagesQuery);
    const newMessages = [];
    querySnapshot.forEach((doc) => {
        const messageWithId = { id: doc.id, ...doc.data() };
        if (!loadedMessages.find(msg => msg.id === messageWithId.id)) {
            newMessages.push(messageWithId);
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

export const sendGroupMessage = async (messageText, file) => {
    if (selectedConversationId) {
        const groupRef = doc(db, "groups", selectedConversationId);
        const newMessage = {
            senderId: currentUser.uid,
            senderNickname: currentNickname,
            timestamp: serverTimestamp(),
        };

        if (messageText) {
            newMessage.text = messageText;
        }

        if (file) {
            // Implement file upload logic here
            // For simplicity, we're assuming the file is already a base64 string
            newMessage.file = file;
        }

        const messagesCollection = collection(db, `groups/${selectedConversationId}/messages`);
        await addDoc(messagesCollection, newMessage);

        // Update last message in recent chats for all group members
        const groupDoc = await getDoc(groupRef);
        const members = groupDoc.data().members;

        const updatePromises = members.map(async (userId) => {
            const recentChatRef = doc(db, `users/${userId}/recentChats`, selectedConversationId);
            await setDoc(recentChatRef, {
                lastMessage: messageText || "File sent",
                timestamp: serverTimestamp()
            }, { merge: true });
        });

        await Promise.all(updatePromises);
    }
};




const removeUserFromGroup = (userId) => {
    selectedUsers = selectedUsers.filter(id => id !== userId);
    const userItem = document.querySelector(`#selected-users-list li[data-user-id="${userId}"]`);
    if (userItem) userItem.remove();
};


/*const backToMainChatList = () => {
    // Clear the selected users
    selectedUsers = [];

    // Restore the original sidebar content
    const chatSidebar = document.querySelector('.chat-sidebar');
    chatSidebar.innerHTML = `
        <div class="sidebar-header">
            <button id="menu-toggle" class="menu-toggle">☰</button>
            <input type="text" id="search-bar" placeholder="Search">
            <button id="group-chat-btn" class="group-chat-btn"><i class="fas fa-users"></i></button>
        </div>
        <div id="search-results" class="search-results-dropdown"></div>
        <ul id="recent-chats-list">
            <!-- List of recent chats will be dynamically populated here -->
        </ul>
    `;

    // Re-initialize event listeners for the main chat list
    document.getElementById('menu-toggle').addEventListener('click', toggleMenu);
    document.getElementById('search-bar').addEventListener('keyup', debounce(performSearch, 300));
    document.getElementById('group-chat-btn').addEventListener('click', openGroupChatUI);

    // Reload the recent chats list
    loadRecentChats();
};*/