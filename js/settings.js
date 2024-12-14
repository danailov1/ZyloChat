// settings.js

import { auth, db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Make openSettings available globally
window.openSettings = async () => {
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
                    <div class="settings-item" onclick="openGeneralSettings()">
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

    // Add the styles if they don't exist
    if (!document.querySelector('#settings-styles')) {
        const styleSheet = document.createElement("style");
        styleSheet.id = 'settings-styles';
        styleSheet.textContent = `
            .settings-view {
                height: 100%;
                background-color: #fff;
                display: flex;
                flex-direction: column;
                animation: slideIn 0.3s ease-out;
            }

            .settings-header {
                display: flex;
                align-items: center;
                padding: 1rem;
                border-bottom: 1px solid #e0e0e0;
                position: relative;
            }

            .settings-header h2 {
                margin-left: 1rem;
                font-size: 1.2rem;
                font-weight: 500;
            }

            .settings-header .fa-pen {
                position: absolute;
                right: 1rem;
                cursor: pointer;
                color: #666;
            }

            .back-button {
                background: none;
                border: none;
                padding: 0.5rem;
                cursor: pointer;
            }

            .back-button:hover {
                background-color: #f5f5f5;
                border-radius: 50%;
            }

            .profile-section {
                padding: 1.5rem;
                display: flex;
                align-items: center;
                gap: 1rem;
                border-bottom: 1px solid #e0e0e0;
            }

            .profile-image {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                overflow: hidden;
            }

            .profile-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .profile-placeholder {
                width: 100%;
                height: 100%;
                background-color: #e0e0e0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                color: #666;
            }

            .profile-info h3 {
                margin: 0;
                font-size: 1.1rem;
                font-weight: 500;
            }

            .profile-status {
                margin: 0.5rem 0 0;
                color: #666;
                font-size: 0.9rem;
            }

            .contact-info {
                padding: 1rem;
                border-bottom: 1px solid #e0e0e0;
            }

            .info-item {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 0.5rem 0;
            }

            .info-item i {
                color: #666;
            }

            .info-content {
                flex: 1;
            }

            .info-label {
                margin: 0;
                font-size: 0.8rem;
                color: #666;
            }

            .info-value {
                margin: 0;
                font-size: 0.9rem;
            }

            .settings-options {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
            }

            .settings-group {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .settings-item {
                display: flex;
                align-items: center;
                padding: 0.75rem;
                gap: 1rem;
                cursor: pointer;
                border-radius: 8px;
            }

            .settings-item:hover {
                background-color: #f5f5f5;
            }

            .settings-item i:first-child {
                width: 24px;
                text-align: center;
            }

            .settings-item span {
                flex: 1;
            }

            .settings-item .fa-chevron-right {
                color: #666;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @media (max-width: 768px) {
                .settings-options {
                    padding: 0.75rem;
                }
            }
        `;
        document.head.appendChild(styleSheet);
    }

    // Back button functionality
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.reload(); // Reload to restore original sidebar
        });
    }

    // Load user data
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
            document.querySelector('.info-item .info-value').textContent = user.email;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
};

// Initialize event listeners only when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.querySelector('#settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', window.openSettings);
    } else {
        console.error("Error: settings-btn element not found.");
    }
});