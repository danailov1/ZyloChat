import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, query, where, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

import {firebaseConfig} from "./config.js";
 


const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

function displayMessage(message) {
  const messageArea = document.getElementById('message-area');
  messageArea.innerText = message;
}

// Switch to sign-up screen
document.getElementById('go-to-signup').addEventListener('click', () => {
  document.getElementById('auth-title').innerText = 'Sign Up for Cipher';
  document.getElementById('signup-fields').style.display = 'block';
  document.getElementById('login-fields').style.display = 'none';
});

// Switch to login screen
document.getElementById('go-to-login').addEventListener('click', () => {
  document.getElementById('auth-title').innerText = 'Login to Cipher';
  document.getElementById('signup-fields').style.display = 'none';
  document.getElementById('login-fields').style.display = 'block';
});

// Sign-up function
document.getElementById('signup-btn').addEventListener('click', async () => {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const nickname = document.getElementById('signup-nickname').value;
  const profilePicInput = document.getElementById('signup-profile-pic');
  let profilePicBase64 = null;

  // Resize the profile picture if a file is selected
  if (profilePicInput.files.length > 0) {
    const file = profilePicInput.files[0];
    profilePicBase64 = await resizeAndConvertToBase64(file, 100, 100); // Resize to 100x100 pixels
  }

  if (email && password && nickname) {
    try {
      // Check if the nickname is already in use
      const nicknameQuery = query(collection(db, "users"), where("nickname", "==", nickname));
      const querySnapshot = await getDocs(nicknameQuery);

      if (!querySnapshot.empty) {
        displayMessage("This nickname is already in use. Please choose another one.");
        return;
      }

      // Create a new user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user data to Firestore
      const userData = {
        nickname: nickname,
        profilePicture: profilePicBase64
      };

      await setDoc(doc(db, "users", user.uid), userData);

      // Send a verification email
      await sendEmailVerification(user);
      displayMessage("Verification email sent! Please check your inbox.");

      // Sign out the user after registration
      await signOut(auth);
    } catch (error) {
      console.error("Error signing up:", error.message);
      displayMessage("Error signing up: " + error.message);
    }
  } else {
    displayMessage("Please fill out all fields.");
  }
});

// Login function
document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    // Log in the user
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if the email is verified
    if (!user.emailVerified) {
      displayMessage("Please verify your email address before logging in.");
      await signOut(auth); 
      return;
    }

    // Retrieve user data from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const nickname = userDoc.exists() ? userDoc.data().nickname : user.email;

    displayMessage(`Welcome back, ${nickname}!`);

    // Redirect to chat page after successful login
    window.location.href = "chat.html"; 
  } catch (error) {
    console.error("Error logging in:", error.message);
    displayMessage("Error logging in: " + error.message);
  }
});

// Helper function to resize and convert a file to base64
function resizeAndConvertToBase64(file, width, height) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg')); // Convert to base64 format
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
