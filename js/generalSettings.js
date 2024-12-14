import ChatWallpaperManager from './chatWallpaperSettings.js';

window.openGeneralSettings = () => {
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
                <h2>General</h2>
            </div>
            <div class="settings-content">
                <div class="settings-section">
                    <h3 class="settings-label">Settings</h3>
                    
                    <!-- Message Text Size -->
                    <div class="setting-item">
                        <div class="setting-item-header">
                            <span>Message Text Size</span>
                            <span class="size-value">15</span>
                        </div>
                        <input type="range" 
                               class="message-size-slider" 
                               min="10" 
                               max="20" 
                               value="15">
                    </div>

                    <div class="setting-item wallpaper-setting" id="chatWallpaperOption">
                        <div class="setting-item-content">
                            <i class="fa-regular fa-image"></i>
                            <span>Chat Wallpaper</span>
                        </div>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                    <div class="setting-item">
    <div class="setting-item-header">
        <span>Change Wallpaper Button</span>
        <label class="toggle-switch">
            <input type="checkbox" id="wallpaperButtonToggle" checked>
            <span class="slider round"></span>
        </label>
    </div>
</div>
                    <!-- Theme (UI preserved but functionality removed) -->
                    <h3 class="settings-label">Theme</h3>
                    <div class="theme-options">
                        <label class="theme-option">
                            <input type="radio" name="theme" value="light" checked>
                            <span>Light</span>
                        </label>
                        <label class="theme-option">
                            <input type="radio" name="theme" value="dark">
                            <span>Dark</span>
                        </label>
                        <label class="theme-option">
                            <input type="radio" name="theme" value="system">
                            <span>System</span>
                        </label>
                    </div>

                    <!-- Time Format -->
                    <h3 class="settings-label">Time Format</h3>
                    <div class="time-format-options">
                        <label class="time-option">
                            <input type="radio" name="timeFormat" value="12-hour">
                            <span>12-hour</span>
                        </label>
                        <label class="time-option">
                            <input type="radio" name="timeFormat" value="24-hour" checked>
                            <span>24-hour</span>
                        </label>
                    </div>

                    <!-- Keyboard Settings -->
                    <h3 class="settings-label">Keyboard</h3>
                    <div class="keyboard-options">
                        <label class="keyboard-option">
                            <input type="radio" name="sendOption" value="enter" checked>
                            <div class="option-content">
                                <span>Send with Enter</span>
                                <span class="subtitle">New line by Shift + Enter</span>
                            </div>
                        </label>
                        <label class="keyboard-option">
                            <input type="radio" name="sendOption" value="ctrlEnter">
                            <div class="option-content">
                                <span>Send with Ctrl+Enter</span>
                                <span class="subtitle">New line by Enter</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add the styles
    if (!document.querySelector('#general-settings-styles')) {
        const styleSheet = document.createElement("style");
        styleSheet.id = 'general-settings-styles';
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
            }

            .settings-header h2 {
                margin-left: 1rem;
                font-size: 1.2rem;
                font-weight: 500;
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

            .settings-content {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
            }

            .settings-label {
                color: #666;
                font-size: 0.9rem;
                margin: 1.5rem 0 0.75rem 0;
            }

            .setting-item {
                margin: 1rem 0;
            }

            .setting-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }

            .message-size-slider {
                width: 100%;
                height: 4px;
                background: #e0e0e0;
                border-radius: 2px;
                outline: none;
                -webkit-appearance: none;
            }

            .message-size-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                background: #2196f3;
                border-radius: 50%;
                cursor: pointer;
            }

            .wallpaper-setting {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 0;
                cursor: pointer;
                transition: background-color 0.2s ease;
            }

            .wallpaper-setting:hover {
                background-color: #f5f5f5;
                border-radius: 8px;
            }

            .setting-item-content {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .theme-options, .time-format-options, .keyboard-options {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .theme-option, .time-option, .keyboard-option {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 0.75rem;
                cursor: pointer;
                border-radius: 8px;
            }

            .theme-option:hover, .time-option:hover, .keyboard-option:hover {
                background-color: #f5f5f5;
            }

            .option-content {
                display: flex;
                flex-direction: column;
            }

            .subtitle {
                font-size: 0.8rem;
                color: #666;
            }

            input[type="radio"] {
                width: 18px;
                height: 18px;
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
                .settings-content {
                    padding: 0.75rem;
                }
            }
            .toggle-switch {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 24px;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
}

.slider:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: .4s;
}

input:checked + .slider {
    background-color: #2196F3;
}

input:checked + .slider:before {
    transform: translateX(24px);
}

.slider.round {
    border-radius: 24px;
}

.slider.round:before {
    border-radius: 50%;
}
        `;
        document.head.appendChild(styleSheet);
    }

    // Set up event listeners
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', async () => {
            try {
                await window.openSettings();
            } catch (error) {
                console.error("Error returning to main settings:", error);
            }
        });
    }

    // Chat Wallpaper option
    const chatWallpaperOption = document.getElementById('chatWallpaperOption');
    if (chatWallpaperOption) {
        chatWallpaperOption.addEventListener('click', () => {
            ChatWallpaperManager.openWallpaperDialog();
        });
    }

    // Message size slider
    const slider = document.querySelector('.message-size-slider');
    const sizeValue = document.querySelector('.size-value');
    if (slider && sizeValue) {
        slider.addEventListener('input', (e) => {
            sizeValue.textContent = e.target.value;
            const chatMessages = document.querySelector('.chat-messages');
            if (chatMessages) {
                chatMessages.style.fontSize = `${e.target.value}px`;
            }
        });
    }

    // Time format handling
    const timeFormatOptions = document.querySelectorAll('input[name="timeFormat"]');
    timeFormatOptions.forEach(option => {
        option.addEventListener('change', (e) => {
            const selectedFormat = e.target.value;
            localStorage.setItem('timeFormat', selectedFormat);
            updateTimeDisplays(selectedFormat);
        });
    });

    // Send option handling
    const sendOptions = document.querySelectorAll('input[name="sendOption"]');
    sendOptions.forEach(option => {
        option.addEventListener('change', (e) => {
            const selectedOption = e.target.value;
            localStorage.setItem('sendOption', selectedOption);
        });
    });
};

// Helper function to update time displays
function updateTimeDisplays(format) {
    const timeElements = document.querySelectorAll('.message-time');
    timeElements.forEach(element => {
        const timestamp = element.getAttribute('data-timestamp');
        if (timestamp) {
            const date = new Date(timestamp);
            element.textContent = format === '24-hour' 
                ? date.toLocaleTimeString('en-US', { hour12: false })
                : date.toLocaleTimeString('en-US', { hour12: true });
        }
    });
}

// In the event listeners section, add:
const wallpaperButtonToggle = document.getElementById('wallpaperButtonToggle');
const wallpaperSettingsButton = document.getElementById('wallpaper-settings-btn');
if (wallpaperButtonToggle && wallpaperSettingsButton) {
    wallpaperButtonToggle.addEventListener('change', (e) => {
        wallpaperSettingsButton.style.display = e.target.checked ? 'flex' : 'none';
        
        // Optional: Save preference to localStorage
        localStorage.setItem('wallpaperButtonVisible', e.target.checked);
    });

    // Load saved preference on startup
    const savedVisibility = localStorage.getItem('wallpaperButtonVisible');
    if (savedVisibility !== null) {
        wallpaperButtonToggle.checked = savedVisibility === 'true';
        wallpaperSettingsButton.style.display = savedVisibility === 'true' ? 'flex' : 'none';
    }
}

// Load saved preferences on startup
document.addEventListener('DOMContentLoaded', () => {
    // Load time format preference
    const savedTimeFormat = localStorage.getItem('timeFormat') || '24-hour';
    updateTimeDisplays(savedTimeFormat);

    // Load send option preference
    const savedSendOption = localStorage.getItem('sendOption') || 'enter';
});

export default window.openGeneralSettings;