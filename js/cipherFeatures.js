import chatStateManager from './chatState.js';

let styleElement = null;

const addFeatureMessage = (title, description, image = null) => {
    const chatMessagesElement = chatStateManager.chatMessagesElement;
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('chat-message', 'incoming');

    // Create a safe image URL or use placeholder if image path is invalid
    const imageUrl = image || null;

    let messageHTML = `
      <div class="cipher-message-item">
        ${imageUrl ? `
          <div class="cipher-image-container">
            <img 
              src="${imageUrl}" 
              alt="${title}" 
              class="cipher-feature-image"
              onerror="this.style.display='none'"
            />
          </div>
        ` : ''}
        <div class="cipher-message-content">
          <div class="cipher-message-title">${title}</div>
          <div class="cipher-message-description">${description}</div>
        </div>
      </div>
    `;

    messageContainer.innerHTML = messageHTML;
    chatMessagesElement.appendChild(messageContainer);
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
};

export const openCipherFeaturesWindow = async () => {
    chatStateManager.updateChatTitle("Cipher Features");
    chatStateManager.handleChatSelection(true);

    const chatMessagesElement = chatStateManager.chatMessagesElement;
    chatMessagesElement.innerHTML = '';

    addFeatureMessage("Cipher Features", "Welcome to the Cipher Features chat window! Here are some of the features available:");

    try {
        const apiUrl = 'https://api.github.com/repos/danailov1/Json-Emoji/contents/features.json?ref=main'; // GitHub API URL
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error('Failed to fetch features');
        }

        const data = await response.json();
        const decodedContent = atob(data.content); 
        const features = JSON.parse(decodedContent); 

        features.forEach(feature => {
            addFeatureMessage(feature.title, feature.description, feature.image);
        });
    } catch (error) {
        console.error(error);
        addFeatureMessage("Error", "Could not load features. Please try again later.");
    }

    chatStateManager.chatInputContainer.style.visibility = 'hidden';

    const profilePicElement = document.getElementById('profile-pic');
    const activityStatusElement = document.getElementById('activity-status'); 
    
    if (profilePicElement) {
        profilePicElement.style.display = 'none'; 
    }

    if (activityStatusElement) {
        activityStatusElement.style.display = 'none'; 
    }

    const styles = `
    .cipher-message-item {
      display: flex;
      flex-direction: column;
      width: 100%;
      margin-bottom: 16px;
    }

    .cipher-image-container {
      width: 100%;
      max-height: 300px;
      overflow: hidden;
      margin: 0;
      padding: 0;
      line-height: 0;
    }

    .cipher-feature-image {
      width: 100%;
      height: auto;
      object-fit: cover;
      display: block;
      margin: 0;
      padding: 0;
      border-radius: 12px 12px 0 0;
    }

    .cipher-message-content {
      padding: 12px 15px;
      background: white;
      border-radius: 0 0 12px 12px;
    }

    .chat-message.incoming {
      margin-bottom: 16px;
    }
    `;

    styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
};

// Remove styles when the Cipher features content is closed
export const closeCipherFeaturesWindow = () => {
    if (styleElement) {
        styleElement.remove();
        styleElement = null;
    }
};