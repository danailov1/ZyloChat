//chatWallpaperSettings.js

//chatWallpaperSettings.js

import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { db } from './firebase.js';
import { currentUser } from './userInfo.js';

const ChatWallpaperManager = {
    defaultWallpapers: [
        '/assets/dark F.jpg',
        '/assets/pink.jpg',
        '/assets/yellow.jpg',
        '/assets/purple.jpg',
        '/assets/beige.jpg',
        '/assets/pink lighter.jpg',
        '/assets/light L.jpg',
        '/assets/telegram ori.jpg'
    ],

    defaultWallpaperUrl: '/assets/dark F.jpg',
    currentWallpaper: null,

    init() {
        // Ensure DOM is fully loaded and user is authenticated
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.loadWallpaper.bind(this));
        } else {
            this.loadWallpaper();
        }
        this.setupEventListeners();
    },

    async loadWallpaper() {
        // Wait for potential auth initialization
        await new Promise(resolve => setTimeout(resolve, 500));

        if (!currentUser) {
            this.applyDefaultWallpaper();
            return;
        }

        try {
            const userDocRef = doc(db, "users", currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const wallpaperData = userDoc.data().wallpaper || {};
                const savedWallpaper = wallpaperData.url || this.defaultWallpaperUrl;
                const savedBlur = wallpaperData.blur || false;

                // Validate wallpaper
                const validWallpaper = this.isValidWallpaper(savedWallpaper) 
                    ? savedWallpaper 
                    : this.defaultWallpaperUrl;

                this.currentWallpaper = validWallpaper;
                
                // Ensure wallpaper and blur are applied
                this.applyWallpaper(validWallpaper);
                this.applyBlurEffect(savedBlur);
            } else {
                this.applyDefaultWallpaper();
            }
        } catch (error) {
            console.error("Error loading saved wallpaper:", error);
            this.applyDefaultWallpaper();
        }
    },

    applyDefaultWallpaper() {
        this.currentWallpaper = this.defaultWallpaperUrl;
        this.applyWallpaper(this.defaultWallpaperUrl);
    },

    isValidWallpaper(wallpaper) {
        return wallpaper.startsWith('#') || 
               this.defaultWallpapers.includes(wallpaper) || 
               wallpaper.startsWith('data:image');
    },

    async applyWallpaper(wallpaperUrl) {
        const chatMessages = document.querySelector('.chat-messages');
        if (!chatMessages) {
            setTimeout(() => this.applyWallpaper(wallpaperUrl), 100);
            return;
        }

        this.currentWallpaper = wallpaperUrl;
        
        // Handle different types of wallpapers
        if (wallpaperUrl.startsWith('#')) {
            chatMessages.style.background = wallpaperUrl;
            chatMessages.style.backgroundSize = 'cover';
        } else {
            chatMessages.style.background = `url('${wallpaperUrl}') no-repeat center center`;
            chatMessages.style.backgroundSize = 'cover';
        }

        // Save to Firestore if user is authenticated
        if (currentUser) {
            try {
                const userDocRef = doc(db, "users", currentUser.uid);
                await updateDoc(userDocRef, {
                    wallpaper: {
                        url: wallpaperUrl,
                        blur: chatMessages.style.backdropFilter === 'blur(5px)'
                    }
                });
            } catch (error) {
                console.error("Error saving wallpaper to Firestore:", error);
            }
        }

        // Update selected state in UI if dialog is open
        const dialog = document.querySelector('.wallpaper-dialog');
        if (dialog) {
            this.updateSelectedWallpaper(dialog);
        }
    },

    async applyBlurEffect(isBlurred) {
        const chatMessages = document.querySelector('.chat-messages');
        if (!chatMessages) return;

        chatMessages.style.backdropFilter = isBlurred ? 'blur(5px)' : 'none';

        // Save blur effect to Firestore if user is authenticated
        if (currentUser) {
            try {
                const userDocRef = doc(db, "users", currentUser.uid);
                await updateDoc(userDocRef, {
                    "wallpaper.blur": isBlurred
                });
            } catch (error) {
                console.error("Error saving blur effect to Firestore:", error);
            }
        }
    },

    setupEventListeners() {
        this.createSettingsButton();
    },

    createSettingsButton() {
        const settingsButton = document.createElement('button');
        settingsButton.id = 'wallpaper-settings-btn';
        settingsButton.innerHTML = `
            <i class="fas fa-image"></i>
            <span>Change Wallpaper</span>
        `;
        settingsButton.onclick = () => this.openWallpaperDialog();

        // Add styles for wallpaper settings
        const style = document.createElement('style');
        style.textContent = `
            #wallpaper-settings-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 10px 20px;
                background: rgba(255, 255, 255, 0.9);
                border: none;
                border-radius: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                z-index: 1000;
                transition: all 0.3s ease;
            }

            #wallpaper-settings-btn:hover {
                background: rgba(255, 255, 255, 1);
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            }

            .wallpaper-dialog {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                z-index: 1001;
                max-width: 500px;
                width: 90%;
            }

            .wallpaper-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                gap: 10px;
                margin: 20px 0;
                max-height: 300px;
                overflow-y: auto;
                padding: 10px;
            }

            .wallpaper-item {
                aspect-ratio: 1;
                border-radius: 8px;
                overflow: hidden;
                cursor: pointer;
                border: 2px solid transparent;
                transition: transform 0.2s ease;
            }

            .wallpaper-item:hover {
                transform: scale(1.05);
            }

            .wallpaper-item.selected {
                border-color: #2196f3;
            }

            .wallpaper-item img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .wallpaper-controls {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                flex-wrap: wrap;
                align-items: center;
            }

            .wallpaper-controls input[type="color"] {
                width: 50px;
                height: 30px;
                padding: 0;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }

            .wallpaper-controls button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                background: #2196f3;
                color: white;
                cursor: pointer;
                transition: background 0.2s ease;
            }

            .wallpaper-controls button:hover {
                background: #1976d2;
            }

            .wallpaper-controls label {
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
            }

            #close-dialog {
                display: block;
                width: 100%;
                padding: 10px;
                margin-top: 10px;
                border: none;
                border-radius: 4px;
                background: #f0f0f0;
                cursor: pointer;
                transition: background 0.2s ease;
            }

            #close-dialog:hover {
                background: #e0e0e0;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(settingsButton);

          // Optional: Set initial display based on localStorage
    const savedVisibility = localStorage.getItem('wallpaperButtonVisible');
    settingsButton.style.display = savedVisibility === 'false' ? 'none' : 'flex';

    document.body.appendChild(settingsButton);
    },

    openWallpaperDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'wallpaper-dialog';

        dialog.innerHTML = `
            <div class="wallpaper-controls">
                <input type="color" id="color-picker" title="Choose color">
                <input type="file" id="wallpaper-upload" accept="image/*">
                <button id="reset-wallpaper">Reset to Default</button>
                <label>
                    <input type="checkbox" id="blur-toggle" ${document.querySelector('.chat-messages').style.backdropFilter === 'blur(5px)' ? 'checked' : ''}>
                    Blur Effect
                </label>
            </div>
            <div class="wallpaper-grid">
                ${this.defaultWallpapers.map(wallpaper => `
                    <div class="wallpaper-item ${wallpaper === this.currentWallpaper ? 'selected' : ''}" data-wallpaper="${wallpaper}">
                        <img src="${wallpaper}" alt="Wallpaper option">
                    </div>
                `).join('')}
            </div>
            <button id="close-dialog">Close</button>
        `;

        dialog.querySelector('#color-picker').addEventListener('change', (e) => {
            this.applyWallpaper(e.target.value);
        });

        dialog.querySelector('#wallpaper-upload').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.applyWallpaper(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });

        dialog.querySelector('#reset-wallpaper').addEventListener('click', () => {
            this.applyWallpaper(this.defaultWallpaperUrl);
        });

        dialog.querySelector('#blur-toggle').addEventListener('change', (e) => {
            this.applyBlurEffect(e.target.checked);
        });

        dialog.querySelectorAll('.wallpaper-item').forEach(item => {
            item.addEventListener('click', () => {
                const wallpaper = item.dataset.wallpaper;
                this.applyWallpaper(wallpaper);
            });
        });

        dialog.querySelector('#close-dialog').addEventListener('click', () => {
            dialog.remove();
        });

        document.body.appendChild(dialog);
    }
};

ChatWallpaperManager.init();

export default ChatWallpaperManager;