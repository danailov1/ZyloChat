// menu.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAKq26PoR840Z2dUvjEh2elyZ9wqPfZg8U",
    authDomain: "cipher8818.firebaseapp.com",
    projectId: "cipher8818",
    storageBucket: "cipher8818.appspot.com",
    messagingSenderId: "978740122961",
    appId: "1:978740122961:web:e1c304074e4b2df4006f70",
    measurementId: "G-0XTDZQX0FS"
  };

  // Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menu-toggle');
    const sideMenu = document.querySelector('.side-menu');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Toggle side menu
    if (menuToggle && sideMenu) {
        menuToggle.addEventListener('click', function(event) {
            sideMenu.classList.toggle('open');
            event.stopPropagation(); 
            console.log('Menu toggled:', sideMenu.classList.contains('open') ? 'Opened' : 'Closed');
        });

        document.addEventListener('click', function(event) {
            if (!sideMenu.contains(event.target) && !menuToggle.contains(event.target)) {
                if (sideMenu.classList.contains('open')) {
                    sideMenu.classList.remove('open');
                    console.log('Menu closed by clicking outside');
                }
            }
        });

        sideMenu.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    } else {
        console.error('Menu toggle button or side menu not found');
    }

    // Logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            signOut(auth).then(() => {
                // Redirect to the login page
                window.location.href = '/index.html';  // Change this to your login page URL
            }).catch((error) => {
                console.error('Error signing out:', error);
                alert('Failed to log out. Please try again.');
            });
        });
    } else {
        console.error('Logout button not found');
    }
});