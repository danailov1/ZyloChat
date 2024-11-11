// settings.js

import { auth, db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const openSettings = async () => {
    const chatSidebar = document.querySelector('.chat-sidebar');
    if (!chatSidebar) {
        console.error("Error: chat-sidebar element not found.");
        return;
    }
    chatSidebar.innerHTML = `
        <div class="settings-view">
            <div class="settings-header">
                <button class="back-button">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>Settings</h2>
                <i class="fas fa-pen"></i>
            </div>
            <div class="profile-section">
                <div class="profile-image">
                    <div class="profile-placeholder">
                        <span></span>
                    </div>
                </div>
                <div class="profile-info">
                    <h3 class="profile-name">Loading...</h3>
                    <p class="profile-status">Loading...</p>
                </div>
            </div>
            <div class="contact-info">
                <div class="info-item">
                    <i class="fas fa-envelope"></i>
                    <div class="info-content">
                        <p class="info-label">Email</p>
                        <p class="info-value">Loading...</p>
                    </div>
                </div>
            </div>
            <div class="settings-options">
                <div class="settings-group">
                    <div class="settings-item">
                        <i class="fas fa-cog"></i>
                        <span>General Settings</span>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                    <div class="settings-item">
                        <i class="fas fa-chart-line"></i>
                        <span>Animations and Performance</span>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                    <div class="settings-item">
                        <i class="fas fa-bell"></i>
                        <span>Notifications</span>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Back button functionality
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.reload(); // Reload to restore original sidebar
        });
    }

    // Load user data function
    await loadUserData();
};

const loadUserData = async () => {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            const profileImage = document.querySelector('.profile-image');

            if (userData.profilePicture) {
                profileImage.innerHTML = `<img src="${userData.profilePicture}" alt="Profile Picture">`;
            } else {
                const initials = (userData.nickname || user.email).substring(0, 2).toUpperCase();
                document.querySelector('.profile-placeholder span').textContent = initials;
            }

            document.querySelector('.profile-name').textContent = userData.nickname || user.email;
            document.querySelector('.profile-status').textContent = userData.status || 'online';
            document.querySelector('.info-item .info-value').textContent = userData.phone || 'No phone number';
            document.querySelector('.info-item:last-child .info-value').textContent = user.email;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
};

// Initialize event listeners only when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.querySelector('#settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettings);
    } else {
        console.error("Error: settings-btn element not found.");
    }
});
