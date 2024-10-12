document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menu-toggle');
    const sideMenu = document.querySelector('.side-menu');

    if (menuToggle && sideMenu) {
        menuToggle.addEventListener('click', function(event) {
            sideMenu.classList.toggle('open');
            event.stopPropagation(); // Prevent the click from bubbling up
            console.log('Menu toggled:', sideMenu.classList.contains('open') ? 'Opened' : 'Closed');
        });

        // Close the menu when clicking outside of it
        document.addEventListener('click', function(event) {
            if (!sideMenu.contains(event.target) && !menuToggle.contains(event.target)) {
                if (sideMenu.classList.contains('open')) {
                    sideMenu.classList.remove('open');
                    console.log('Menu closed by clicking outside');
                }
            }
        });

        // Prevent clicks inside the side menu from closing it
        sideMenu.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    } else {
        console.error('Menu toggle button or side menu not found');
    }
});
