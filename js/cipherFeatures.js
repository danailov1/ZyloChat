//cipherFeatures.js
import chatStateManager from './chatState.js';

const features = [
    { title: "Feature 1", description: "Encryption" },
    { title: "Feature 2", description: "Voice Messaging" },
    { title: "Feature 3", description: "File Sharing" },
    { title: "Feature 4", description: "Group Chat" },
    { title: "Feature 5", description: "Ebane" }

];

const addFeatureMessage = (title, description) => {
    const chatMessagesElement = chatStateManager.chatMessagesElement;

    const featureMessage = document.createElement('div');
    featureMessage.classList.add('chat-message', 'incoming');

    featureMessage.innerHTML = `
        <strong>${title}:</strong> ${description}
    `;

    chatMessagesElement.appendChild(featureMessage);

    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
};

export const openCipherFeaturesWindow = () => {
    chatStateManager.updateChatTitle("Cipher Features");
        chatStateManager.handleChatSelection(true);

    const chatMessagesElement = chatStateManager.chatMessagesElement;
    chatMessagesElement.innerHTML = '';

    addFeatureMessage("Cipher Features", "Welcome to the Cipher Features chat window! Here are some of the features available:");

    features.forEach(feature => {
        addFeatureMessage(feature.title, feature.description);
    });

    chatStateManager.chatInputContainer.style.visibility = 'hidden';

    const profilePicElement = document.getElementById('profile-pic');
    const activityStatusElement = document.getElementById('activity-status'); 
    
    if (profilePicElement) {
        profilePicElement.style.display = 'none'; 
    }

    if (activityStatusElement) {
        activityStatusElement.style.display = 'none'; // Hides the activity status
    }
};
