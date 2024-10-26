// chatState.js
import { currentUser } from './userInfo.js';

export class ChatStateManager {
    constructor() {
        this.chatMessagesElement = document.getElementById('chat-messages');
        this.chatHeaderElement = document.querySelector('.chat-header');
        this.chatInputContainer = document.querySelector('.chat-input-container');
        this.chatTitle = document.getElementById('chat-title');
        
        // Store initial background style
        this.backgroundPattern = getComputedStyle(this.chatMessagesElement)
            .getPropertyValue('background-image');
        
        this.initializeState();
    }

    initializeState() {
        // Hide chat interface elements initially
        this.chatHeaderElement.style.visibility = 'hidden';
        this.chatInputContainer.style.visibility = 'hidden';
        
        // Clear any existing messages
        this.chatMessagesElement.innerHTML = '';
        
        // Reset chat title
        this.chatTitle.textContent = '';
        
        // Ensure the background pattern is visible
        this.chatMessagesElement.style.backgroundColor = 'transparent';
    }

    showChatInterface() {
        // Make chat interface elements visible
        this.chatHeaderElement.style.visibility = 'visible';
        this.chatInputContainer.style.visibility = 'visible';
    }

    hideChatInterface() {
        // Hide chat interface elements
        this.chatHeaderElement.style.visibility = 'hidden';
        this.chatInputContainer.style.visibility = 'hidden';
        
        // Clear messages
        this.chatMessagesElement.innerHTML = '';
        
        // Reset chat title
        this.chatTitle.textContent = '';
    }

    updateChatTitle(title) {
        this.chatTitle.textContent = title;
    }

    // Method to handle user/group selection
    handleChatSelection(isSelected) {
        if (isSelected) {
            this.showChatInterface();
        } else {
            this.hideChatInterface();
        }
    }
}

// Create and export a singleton instance
const chatStateManager = new ChatStateManager();
export default chatStateManager;