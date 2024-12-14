// voiceCalls.js

import { currentUser, currentNickname } from './userInfo.js';
import { db } from './firebase.js';
import { doc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const APP_ID = "4ba30442b43b47ad8a18f6f9088380ec";
const TOKEN = null;

class VoiceCallManager {
    constructor() {
        this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        this.reset();
        this.setupAgoraEvents();
        this.setupFirestoreListener();
        this.setupUIEvents();
    }

    reset() {
        this.currentCall = null;
        this.localAudioTrack = null;
        this.localVideoTrack = null;
        this.remoteAudioTrack = null;
        this.remoteVideoTrack = null;
        this.isVideoEnabled = false;
        this.isMuted = false;
        this.channelName = null;
        this.targetUserId = null;
        this.callDocRef = null;
    }

    setupAgoraEvents() {
        this.client.on("user-published", async (user, mediaType) => {
            await this.client.subscribe(user, mediaType);

            if (mediaType === "audio") {
                this.remoteAudioTrack = user.audioTrack;
                this.remoteAudioTrack.play();
                this.updateCallStatus("Connected");
            }

            if (mediaType === "video") {
                this.remoteVideoTrack = user.videoTrack;
                const remoteVideoDiv = document.querySelector('.remote-video');
                if (remoteVideoDiv) {
                    this.remoteVideoTrack.play(remoteVideoDiv);
                }
            }
        });

        this.client.on("user-left", () => {
            this.updateCallStatus("User left the call");
            setTimeout(() => this.endCall(), 2000);
        });
    }

    setupFirestoreListener() {
        // Listen for incoming calls
        onSnapshot(doc(db, "users", currentUser?.uid || 'dummy'), (doc) => {
            const data = doc.data();
            if (data?.incomingCall) {
                this.handleIncomingCall(data.incomingCall);
            }
        });
    }

    setupUIEvents() {
        // Setup call button in chat header
        const phoneIcon = document.querySelector('.header-icons .fa-phone');
        if (phoneIcon) {
            phoneIcon.addEventListener('click', () => this.initiateCall());
        }
    }

    generateChannelName(user1Id, user2Id) {
        return `call_${Math.min(user1Id, user2Id)}_${Math.max(user1Id, user2Id)}`;
    }

    async initiateCall() {
        try {
            if (!currentUser) throw new Error("No user logged in");
            
            const chatTitle = document.getElementById('chat-title');
            if (!chatTitle) throw new Error("No chat selected");

            // Get target user ID from chat title's data attribute
            this.targetUserId = chatTitle.dataset.userId;
            if (!this.targetUserId) throw new Error("No target user selected");

            // Generate channel name
            this.channelName = this.generateChannelName(currentUser.uid, this.targetUserId);
            
            // Create call document in Firestore
            this.callDocRef = doc(db, "calls", this.channelName);
            await setDoc(this.callDocRef, {
                channelName: this.channelName,
                caller: {
                    id: currentUser.uid,
                    nickname: currentNickname
                },
                status: 'calling',
                timestamp: new Date()
            });

            // Notify target user
            const targetUserRef = doc(db, "users", this.targetUserId);
            await setDoc(targetUserRef, {
                incomingCall: {
                    channelName: this.channelName,
                    callerId: currentUser.uid,
                    callerName: currentNickname
                }
            }, { merge: true });

            // Show call UI
            const popup = this.createCallUI(chatTitle.textContent);
            document.body.appendChild(popup);
            this.currentCall = popup;
            
            // Join Agora channel
            await this.client.join(APP_ID, this.channelName, TOKEN);
            this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            await this.client.publish(this.localAudioTrack);
            
            this.updateCallStatus("Calling...");
        } catch (error) {
            console.error("Error initiating call:", error);
            this.updateCallStatus("Failed to start call");
            await this.cleanupCall();
        }
    }

    async handleIncomingCall(callData) {
        try {
            this.channelName = callData.channelName;
            this.targetUserId = callData.callerId;
            
            const popup = this.createIncomingCallUI(callData.callerName);
            document.body.appendChild(popup);
            this.currentCall = popup;
        } catch (error) {
            console.error("Error handling incoming call:", error);
            await this.cleanupCall();
        }
    }

    async acceptCall() {
        try {
            if (!this.currentCall) throw new Error("No active call");
            
            // Update call UI
            const callerName = this.currentCall.querySelector('h2').textContent;
            this.currentCall.remove();
            const popup = this.createCallUI(callerName);
            document.body.appendChild(popup);
            this.currentCall = popup;

            // Join Agora channel
            await this.client.join(APP_ID, this.channelName, TOKEN);
            this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            await this.client.publish(this.localAudioTrack);
            
            // Update call status in Firestore
            if (this.callDocRef) {
                await setDoc(this.callDocRef, { status: 'connected' }, { merge: true });
            }

            this.updateCallStatus("Connected");
        } catch (error) {
            console.error("Error accepting call:", error);
            this.updateCallStatus("Failed to accept call");
            await this.cleanupCall();
        }
    }

    async declineCall() {
        try {
            await this.cleanupCall();
        } catch (error) {
            console.error("Error declining call:", error);
        }
    }

    async endCall() {
        try {
            await this.client.leave();
            await this.cleanupCall();
        } catch (error) {
            console.error("Error ending call:", error);
        }
    }

    async cleanupCall() {
        // Cleanup Agora resources
        if (this.localAudioTrack) {
            this.localAudioTrack.stop();
            this.localAudioTrack.close();
        }
        if (this.localVideoTrack) {
            this.localVideoTrack.stop();
            this.localVideoTrack.close();
        }

        // Cleanup Firestore
        if (this.callDocRef) {
            await deleteDoc(this.callDocRef);
        }
        if (this.targetUserId) {
            const targetUserRef = doc(db, "users", this.targetUserId);
            await setDoc(targetUserRef, {
                incomingCall: null
            }, { merge: true });
        }

        // Cleanup UI
        if (this.currentCall) {
            this.currentCall.remove();
        }

        // Reset state
        this.reset();
    }

    // UI Methods
    createCallUI(userName) {
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';

        const popup = document.createElement('div');
        popup.className = 'voice-call-popup';

        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container';
        videoContainer.style.display = 'none';
        
        const localVideo = document.createElement('div');
        localVideo.className = 'local-video';
        
        const remoteVideo = document.createElement('div');
        remoteVideo.className = 'remote-video';
        
        videoContainer.append(localVideo, remoteVideo);

        const avatar = document.createElement('div');
        avatar.className = 'caller-avatar';
        avatar.textContent = userName[0].toUpperCase();

        const name = document.createElement('h2');
        name.textContent = userName;

        const status = document.createElement('div');
        status.className = 'voice-call-status';
        status.textContent = 'Connecting...';

        const controls = document.createElement('div');
        controls.className = 'call-controls';

        const muteButton = this.createButton('fa-microphone', () => this.toggleMute());
        const videoButton = this.createButton('fa-video', () => this.toggleVideo());
        const endButton = this.createButton('fa-phone', () => this.endCall(), true);

        controls.append(muteButton, videoButton, endButton);
        popup.append(videoContainer, avatar, name, status, controls);
        overlay.appendChild(popup);

        this.addStyles();
        return overlay;
    }

    createIncomingCallUI(callerName) {
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';

        const popup = document.createElement('div');
        popup.className = 'voice-call-popup incoming-call';

        const avatar = document.createElement('div');
        avatar.className = 'caller-avatar';
        avatar.textContent = callerName[0].toUpperCase();

        const name = document.createElement('h2');
        name.textContent = callerName;

        const status = document.createElement('div');
        status.className = 'voice-call-status';
        status.textContent = 'Incoming call...';

        const controls = document.createElement('div');
        controls.className = 'call-controls';

        const acceptButton = this.createButton('fa-phone', () => this.acceptCall());
        const declineButton = this.createButton('fa-phone-slash', () => this.declineCall(), true);

        controls.append(acceptButton, declineButton);
        popup.append(avatar, name, status, controls);
        overlay.appendChild(popup);

        return overlay;
    }

    createButton(iconClass, onClick, isEnd = false) {
        const button = document.createElement('button');
        button.className = `call-button ${isEnd ? 'end-call-button' : ''}`;
        
        const icon = document.createElement('i');
        icon.className = `fas ${iconClass}`;
        
        button.appendChild(icon);
        button.addEventListener('click', onClick);
        return button;
    }

    async toggleMute() {
        if (this.localAudioTrack) {
            this.isMuted = !this.isMuted;
            this.localAudioTrack.setEnabled(!this.isMuted);
            const button = this.currentCall.querySelector('.fa-microphone, .fa-microphone-slash').parentElement;
            button.classList.toggle('muted');
            button.querySelector('i').className = `fas fa-microphone${this.isMuted ? '-slash' : ''}`;
        }
    }

    async toggleVideo() {
        try {
            const button = this.currentCall.querySelector('.fa-video, .fa-video-slash').parentElement;
            
            if (!this.isVideoEnabled) {
                this.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
                await this.client.publish(this.localVideoTrack);
                const localVideoDiv = this.currentCall.querySelector('.local-video');
                if (localVideoDiv) {
                    this.localVideoTrack.play(localVideoDiv);
                }
                this.currentCall.querySelector('.video-container').style.display = 'flex';
                button.classList.add('active');
                button.querySelector('i').className = 'fas fa-video';
            } else {
                if (this.localVideoTrack) {
                    await this.client.unpublish(this.localVideoTrack);
                    this.localVideoTrack.stop();
                    this.localVideoTrack.close();
                }
                this.currentCall.querySelector('.video-container').style.display = 'none';
                button.classList.remove('active');
                button.querySelector('i').className = 'fas fa-video-slash';
            }
            this.isVideoEnabled = !this.isVideoEnabled;
        } catch (error) {
            console.error("Error toggling video:", error);
        }
    }

    updateCallStatus(status) {
        const statusElement = this.currentCall?.querySelector('.voice-call-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    addStyles() {
        if (!document.getElementById('voice-call-styles')) {
            const style = document.createElement('style');
            style.id = 'voice-call-styles';
            style.textContent = `
                .popup-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }

                .voice-call-popup {
                    background-color: #2c3e50;
                    padding: 20px;
                    border-radius: 10px;
                    min-width: 300px;
                    text-align: center;
                    color: white;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }

                .video-container {
                    position: relative;
                    width: 640px;
                    height: 480px;
                    margin-bottom: 20px;
                    background-color: #1a1a1a;
                    border-radius: 8px;
                }

                .local-video {
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    width: 160px;
                    height: 120px;
                    background-color: #000;
                    border-radius: 8px;
                    z-index: 1;
                }

                .remote-video {
                    width: 100%;
                    height: 100%;
                    border-radius: 8px;
                }

                .caller-avatar {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background-color: #3498db;
                    color: white;
                    font-size: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 15px;
                }

                .call-controls {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    margin-top: 20px;
                }

               .call-button {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: #34495e;
                    color: white;
                    transition: all 0.3s ease;
                }

                .call-button:hover {
                    transform: scale(1.1);
                    background-color: #2c3e50;
                }

                .call-button.active {
                    background-color: #27ae60;
                }

                .call-button.muted {
                    background-color: #e67e22;
                }

                .call-button.end-call-button {
                    background-color: #e74c3c;
                }

                .call-button.end-call-button:hover {
                    background-color: #c0392b;
                }

                .voice-call-status {
                    margin: 15px 0;
                    font-size: 14px;
                    color: #bdc3c7;
                }

                .incoming-call .call-button:first-child {
                    background-color: #27ae60;
                }

                .incoming-call .call-button:first-child:hover {
                    background-color: #219a52;
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Initialize and export the voice call manager
const voiceCallManager = new VoiceCallManager();
export default voiceCallManager;
