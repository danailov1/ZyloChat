document.addEventListener('DOMContentLoaded', function() {
    // Add Font Awesome script dynamically
    const fontAwesomeScript = document.createElement('script');
    fontAwesomeScript.src = "https://kit.fontawesome.com/ad31800fcc.js";
    fontAwesomeScript.crossOrigin = "anonymous";
    document.head.appendChild(fontAwesomeScript);

    const emojiIcon = document.getElementById("emoji");
    const messageInput = document.getElementById("message-input");

    // Create emoji picker element if it doesn't exist
    let emojiPicker = document.getElementById("emoji-picker");
    if (!emojiPicker) {
        emojiPicker = document.createElement("div");
        emojiPicker.id = "emoji-picker";
        document.body.appendChild(emojiPicker);

        // Create internal structure
        emojiPicker.innerHTML = `
            <div class="emoji-nav"></div>
            <div class="emoji-sections"></div>
        `;
    }

    let emojiData = null;

    const categoryIcons = {
        'smileys-emotion': '<i class="fa-solid fa-face-smile-wink"></i>',
        'people-body': '<i class="fa-solid fa-hands"></i>',
        'animals-nature': '<i class="fa-solid fa-paw"></i>',
        'food-drink': '<i class="fa-solid fa-apple-whole"></i>',
        'travel-places': '<i class="fa-solid fa-plane"></i>',
        'objects': '<i class="fa-solid fa-lightbulb"></i>'
    };
    
    

    // Show/hide emoji picker
    emojiIcon.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (emojiPicker.style.display === "none" || !emojiPicker.style.display) {
            emojiPicker.style.display = "block";
            if (!emojiData) {
                await initializeEmojiPicker();
            }
        } else {
            emojiPicker.style.display = "none";
        }
    });

    async function fetchEmojis() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/danailov1/Json-Emoji/refs/heads/main/openmoji.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching emojis:", error);
            return [];
        }
    }

    function organizeEmojisByCategory(data) {
        const categories = {};

        // Each item in the data array represents a category
        data.forEach(categoryData => {
            const categoryName = categoryData.category;
            categories[categoryName] = categoryData.emojis.map(emoji => ({
                character: emoji.emoji,
                name: emoji.annotation
            }));
        });

        return categories;
    }

    async function initializeEmojiPicker() {
        const emojiSections = emojiPicker.querySelector('.emoji-sections');
        const navBar = emojiPicker.querySelector('.emoji-nav');

        try {
            // Show loading message
            emojiSections.innerHTML = '<div class="loading-message">Loading emojis...</div>';

            // Fetch and organize emojis
            const rawData = await fetchEmojis();
            const categorizedEmojis = organizeEmojisByCategory(rawData);
            const categories = Object.keys(categoryIcons);

            // Clear loading message
            emojiSections.innerHTML = '';

            // Create navigation and sections
            createNavigation(categories, navBar);
            loadAllCategories(categories, categorizedEmojis, emojiSections);

            // Highlight first category
            const firstNavButton = navBar.firstElementChild;
            if (firstNavButton) {
                firstNavButton.classList.add('active');
            }
        } catch (error) {
            emojiSections.innerHTML = '<div class="error-message">Error loading emojis. Please try again.</div>';
            console.error("Error initializing emoji picker:", error);
        }
    }

    function createNavigation(categories, navBar) {
        navBar.innerHTML = '';
        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'nav-button';
            button.innerHTML = categoryIcons[category] || '📋';
            button.title = category.replace(/-/g, ' ');

            button.addEventListener('click', () => {
                const categorySection = document.getElementById(`category-${category}`);
                if (categorySection) {
                    const emojiSections = emojiPicker.querySelector('.emoji-sections');
                    emojiSections.scrollTop = categorySection.offsetTop - emojiSections.offsetTop;

                    // Update active state
                    navBar.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                }
            });

            navBar.appendChild(button);
        });
    }

    function loadAllCategories(categories, categorizedEmojis, emojiSections) {
        categories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'emoji-category';
            categoryDiv.id = `category-${category}`;

            const header = document.createElement('h3');
            header.className = 'category-header';
            header.textContent = category.replace(/-/g, ' ');
            categoryDiv.appendChild(header);

            const emojisContainer = document.createElement('div');
            emojisContainer.className = 'emojis-container';

            if (categorizedEmojis[category] && categorizedEmojis[category].length > 0) {
                categorizedEmojis[category].forEach(emoji => {
                    const button = document.createElement('button');
                    button.className = 'emoji';
                    button.textContent = emoji.character;
                    button.title = emoji.name;
                    button.addEventListener('click', () => {
                        messageInput.value += emoji.character;
                        messageInput.focus();
                    });
                    emojisContainer.appendChild(button);
                });
            }

            categoryDiv.appendChild(emojisContainer);
            emojiSections.appendChild(categoryDiv);
        });
    }

    // Close picker when clicking outside
    document.addEventListener("click", (e) => {
        if (!emojiPicker.contains(e.target) && e.target !== emojiIcon) {
            emojiPicker.style.display = "none";
        }
    });

    // Handle scrolling to update active navigation button
    emojiPicker.querySelector('.emoji-sections').addEventListener('scroll', () => {
        const categories = emojiPicker.querySelectorAll('.emoji-category');
        const navButtons = emojiPicker.querySelectorAll('.nav-button');
        const scrollTop = emojiPicker.querySelector('.emoji-sections').scrollTop;

        let activeCategory = null;
        categories.forEach((category) => {
            if (category.offsetTop <= scrollTop + 50) {
                activeCategory = category.id;
            }
        });

        if (activeCategory) {
            navButtons.forEach((btn) => {
                const categoryId = `category-${btn.title.toLowerCase().replace(/\s+/g, '-')}`;
                btn.classList.toggle('active', categoryId === activeCategory);
            });
        }
    });
});
