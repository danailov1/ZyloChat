import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to load the other user's profile picture based on chat selection
async function loadChatUserProfilePicture(selectedUserId) {
  try {
    // Fetch the chat user's data from Firestore
    const userDoc = await getDoc(doc(db, "users", selectedUserId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const profilePicture = userData.profilePicture;

      // Check if the profile picture exists
      if (profilePicture) {
        // Set the profile picture as the background image of the avatar div
        const avatarDiv = document.querySelector(".avatar");
        avatarDiv.style.backgroundImage = `url(${profilePicture})`;
        avatarDiv.style.backgroundSize = "cover";
        avatarDiv.style.backgroundPosition = "center";
        avatarDiv.style.borderRadius = "50%"; // Make the avatar circular
        avatarDiv.style.width = "50px"; // Set a fixed size for the avatar
        avatarDiv.style.height = "50px";
      }
    }
  } catch (error) {
    console.error("Error loading chat user's profile picture:", error);
  }
}

// Function to handle when a user is selected to chat with
function onChatUserSelected(selectedUserId) {
  // Load the selected chat user's profile picture
  loadChatUserProfilePicture(selectedUserId);

  // You can also load other user details such as their nickname, last seen, etc.
  // and update the UI accordingly.
}

// Example: Assuming you call this function when a user is selected from the search or recent chat list
document.getElementById("recent-chats-list").addEventListener("click", (event) => {
  const selectedUserId = event.target.getAttribute("data-user-id");
  if (selectedUserId) {
    onChatUserSelected(selectedUserId);
  }
});
