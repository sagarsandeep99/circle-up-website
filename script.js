// We wrap all our code in a DOMContentLoaded listener.
// This is the safest way to ensure that all HTML elements
// (like the canvas and buttons) exist before we try to use them.
document.addEventListener('DOMContentLoaded', () => {

    // START: New Theme Toggle Logic
    const themeToggleBtnDesktop = document.getElementById('theme-toggle-btn-desktop');
    const themeToggleBtnMobile = document.getElementById('theme-toggle-btn-mobile');

    // Get all icons
    const sunIcons = [
        document.getElementById('theme-icon-sun-desktop'),
        document.getElementById('theme-icon-sun-mobile')
    ].filter(Boolean); // Filter out nulls if one element doesn't exist

    const moonIcons = [
        document.getElementById('theme-icon-moon-desktop'),
        document.getElementById('theme-icon-moon-mobile')
    ].filter(Boolean);

    const enableLightMode = () => {
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
        sunIcons.forEach(icon => icon.classList.add('hidden')); // HIDE Sun
        moonIcons.forEach(icon => icon.classList.remove('hidden')); // SHOW Moon
    };

    const enableDarkMode = () => {
        document.body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
        sunIcons.forEach(icon => icon.classList.remove('hidden')); // SHOW Sun
        moonIcons.forEach(icon => icon.classList.add('hidden')); // HIDE Moon
    };

    const toggleTheme = (e) => {
        // Prevent default if it's an anchor tag (like the mobile button)
        if (e && e.preventDefault) e.preventDefault();

        if (document.body.classList.contains('light-theme')) {
            enableDarkMode();
        } else {
            enableLightMode();
        }
    };

    // Add Listeners
    if (themeToggleBtnDesktop) {
        themeToggleBtnDesktop.addEventListener('click', toggleTheme);
    }
    if (themeToggleBtnMobile) {
        themeToggleBtnMobile.addEventListener('click', toggleTheme);
    }

    // Check for saved theme on page load
    if (localStorage.getItem('theme') === 'light') {
        enableLightMode();
    } else {
        enableDarkMode(); // Default
    }
    // END: New Theme Toggle Logic


    // --- 3D Background Setup ---
    // 'THREE' is available globally from the script tag in the <head>
    let scene, camera, renderer, shapes;
    let targetMouse = new THREE.Vector2(); // This will be controlled by EITHER mouse or gyro


    // --- 2D Chaser Game Variables ---
    let chaserContainer, chaserSmiley, chaserTextElement;
    const taunts = [
        "Almost!",
        "Try again!",
        "Too slow!",
        "Don't leave me!",
        "Haha!",
        "Catch me!",
        "Wanna give up?"
    ];
    let lastTauntIndex = -1; // To track the last used taunt

    // Get the chaser 2D elements
    chaserContainer = document.getElementById('chaser-container');
    chaserSmiley = document.getElementById('chaser-smiley');
    chaserTextElement = document.getElementById('chaser-text');


    function init3D() {
        // Scene
        scene = new THREE.Scene();

        // Camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;

        // Renderer
        const canvas = document.getElementById('bg-canvas');
        if (!canvas) {
            console.error("Canvas element not found!");
            return;
        }
        renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        // Shapes (Background)
        shapes = [];
        const geometries = [
            new THREE.IcosahedronGeometry(0.5, 0),      // Diamond
            new THREE.SphereGeometry(0.4, 16, 16),      // Ball
            new THREE.TorusGeometry(0.4, 0.15, 16, 40) // Donut
        ];
        const material = new THREE.MeshNormalMaterial();

        for (let i = 0; i < 80; i++) { // Set to 80 shapes
            const geometry = geometries[Math.floor(Math.random() * geometries.length)];
            const mesh = new THREE.Mesh(geometry, material);

            // Random positions
            mesh.position.x = (Math.random() - 0.5) * 25;
            mesh.position.y = (Math.random() - 0.5) * 25;
            mesh.position.z = (Math.random() - 0.5) * 25;

            // Random scales
            const scale = 0.5 + Math.random() * 1.5;
            mesh.scale.set(scale, scale, scale);

            // Store speed
            mesh.userData.speed = {
                x: (Math.random() - 0.5) * 0.005,
                y: (Math.random() - 0.5) * 0.005
            };

            shapes.push(mesh);
            scene.add(mesh);
        }

        // --- Event Listeners ---
        window.addEventListener('resize', onWindowResize, false);

        // Mouse listener (fallback for desktops)
        document.addEventListener('mousemove', onDocumentMouseMove, false);

        // --- 2D Smiley Click Listener (MODIFIED) ---
        if (chaserSmiley) {

            // This handler will only run ONCE for the *first* click
            const onSmileyFirstClick = () => {
                moveChaser();
                tauntUser();

                // Stop repositioning it next to the tagline on resize
                window.removeEventListener('resize', positionChaserInitially);

                // Now, add the "normal" click listener for all future clicks
                chaserSmiley.addEventListener('click', () => {
                    moveChaser();
                    tauntUser();
                });
            };

            // Add the "first click" listener, which runs only once
            chaserSmiley.addEventListener('click', onSmileyFirstClick, { once: true });

            // Position it for the first time
            positionChaserInitially();

            // Add a resize listener to keep it in place (until it's clicked)
            window.addEventListener('resize', positionChaserInitially);

            // Make it visible once JS is loaded and positioned
            chaserContainer.style.visibility = 'visible';
        }

        // Attempt motion controls on first interaction
        document.body.addEventListener('click', attemptMotionControl, { once: true });
        document.body.addEventListener('touchstart', attemptMotionControl, { once: true });

        // Start animation
        animate();
    }


    // --- Motion Control Logic ---

    function attemptMotionControl() {
        // Check if the API is available
        if (window.DeviceOrientationEvent) {

            // iOS 13+ permission request
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            // Permission granted: add device orientation listener
                            window.addEventListener('deviceorientation', onDeviceOrientation);
                            // Remove the mouse listener to prevent conflicts
                            document.removeEventListener('mousemove', onDocumentMouseMove, false);
                        }
                    })
                    .catch(console.error); // Handle errors
            } else {
                // Android or other browsers that don't need explicit permission
                window.addEventListener('deviceorientation', onDeviceOrientation);
                document.removeEventListener('mousemove', onDocumentMouseMove, false);
            }
        }
    }

    // Handles device tilt
    function onDeviceOrientation(event) {
        // event.gamma: left-to-right tilt (-90 to 90)
        let x = (event.gamma || 0);
        x = Math.max(-90, Math.min(90, x)) / 90; // Clamp and normalize

        // event.beta: front-to-back tilt (-180 to 180)
        let y = (event.beta || 45); // Use 45 as center
        y = (y - 45) / 20; // Normalize around 45, with a 20-degree range
        y = Math.max(-1, Math.min(1, y)); // Clamp

        // Update the target vector
        targetMouse.x = x;
        targetMouse.y = -y; // Invert Y
    }

    // Mouse move handler (for desktops or as fallback)
    function onDocumentMouseMove(event) {
        targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    // --- 2D Chaser Game Logic ---

    function moveChaser() {
        if (!chaserContainer) return;

        // Get viewport dimensions
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Get container size
        const elWidth = chaserContainer.offsetWidth;
        const elHeight = chaserContainer.offsetHeight;

        // Calculate a random position, padding from the edges
        const padding = 50;
        const newLeft = Math.random() * (vw - elWidth - (padding * 2)) + padding;
        const newTop = Math.random() * (vh - elHeight - (padding * 2)) + padding;

        chaserContainer.style.left = `${newLeft}px`;
        chaserContainer.style.top = `${newTop}px`;
    }

    function tauntUser() {
        if (!chaserTextElement) return;

        // Ensure the next taunt isn't the same as the last one
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * taunts.length);
        } while (taunts.length > 1 && newIndex === lastTauntIndex); // Check to avoid infinite loop

        lastTauntIndex = newIndex; // Update the last index
        chaserTextElement.innerText = taunts[newIndex];
    }

    // --- UPDATED FUNCTION ---
    // Positions the chaser next to the tagline initially
    function positionChaserInitially() {
        const tagline = document.getElementById('tagline');
        // Ensure elements exist before trying to get properties
        if (!tagline || !chaserContainer) {
            return;
        }

        const rect = tagline.getBoundingClientRect();
        // Get chaser dimensions. Using 48 as a fallback from CSS.
        const chaserWidth = chaserContainer.offsetWidth || 48;

        // "3 lines" (32px) + "3 more spaces" (32px) = 64px
        const space = 64;

        // Top: Positioned below the tagline + space
        const newTop = rect.bottom + space;

        // Left: Centered horizontally with the tagline
        const newLeft = rect.left + (rect.width / 2) - (chaserWidth / 2);

        chaserContainer.style.top = `${newTop}px`;
        chaserContainer.style.left = `${newLeft}px`;
    }


    // --- Animation Loop ---

    function animate() {
        requestAnimationFrame(animate);
        if (!renderer) return;

        // Camera interaction (gyro or mouse)
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetMouse.x * 2, 0.05);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetMouse.y * 2, 0.05);
        camera.lookAt(scene.position);

        // Animate background shapes
        shapes.forEach(shape => {
            shape.rotation.x += shape.userData.speed.x;
            shape.rotation.y += shape.userData.speed.y;
            shape.position.x += shape.userData.speed.x * 0.5;
            shape.position.y += shape.userData.speed.y * 0.5;

            // Wrap around screen
            if (shape.position.y > 12) shape.position.y = -12;
            if (shape.position.y < -12) shape.position.y = 12;
            if (shape.position.x > 12) shape.position.x = -12;
            if (shape.position.x < -12) shape.position.x = 12;
        });

        // Animate 2D Chaser (bobbing)
        // We check for chaserContainer.style.transform to avoid overwriting
        // the initial position set by positionChaserInitially()
        if (chaserContainer && chaserContainer.style.transform.includes('translateY')) {
            const bob = Math.sin(Date.now() * 0.005) * 5; // 5px up and down
            chaserContainer.style.transform = `translateY(${bob}px)`;
        } else if (chaserContainer && !chaserContainer.style.transform) {
            // Start the bobbing animation
            chaserContainer.style.transform = `translateY(0px)`;
        }

        renderer.render(scene, camera);
    }

    // Resize handler
    function onWindowResize() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // --- Mobile Menu Toggle ---
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuIconOpen = document.getElementById('menu-icon-open');
    const menuIconClose = document.getElementById('menu-icon-close');

    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            if (!mobileMenu || !menuIconOpen || !menuIconClose) return;
            mobileMenu.classList.toggle('hidden');
            menuIconOpen.classList.toggle('hidden');
            menuIconOpen.classList.toggle('block');
            menuIconClose.classList.toggle('hidden');
            menuIconClose.classList.toggle('block');
        });
    }

    // --- Get Scroll Container ---
    const mainContainer = document.querySelector('main');
    
    // --- START: New Logo Click to Scroll Top ---
    const logoLink = document.getElementById('logo-link');

    if (logoLink && mainContainer) {
        logoLink.addEventListener('click', (e) => {
            e.preventDefault(); // Stop the '#' from being added to the URL
            mainContainer.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    // --- END: New Logo Click to Scroll Top ---

    // --- Hero Card Scroll Animation ---
    const heroCard = document.getElementById('hero-card');

    if (heroCard && mainContainer) {
        // Listen to the <main> element's scroll, not the window
        mainContainer.addEventListener('scroll', () => {
            if (mainContainer.scrollTop > 50) { // When scrolled down 50px
                heroCard.classList.add('card-hidden');
            } else { // When at the top
                heroCard.classList.remove('card-hidden');
            }
        });
    }

    // --- START: Content Card Scroll Animation Observer ---
    if (mainContainer) {
        const animatedElements = document.querySelectorAll('.animate-slide-left, .animate-slide-right, .animate-slide-up');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Add the 'is-visible' class to trigger the animation
                    entry.target.classList.add('is-visible');
                } else {
                    // UPDATED: Un-commented this line
                    // This removes the class when the element is not visible,
                    // triggering the "out" animation and allowing it to
                    // re-animate on "in"
                    entry.target.classList.remove('is-visible');
                }
            });
        }, {
            root: mainContainer, 
            threshold: 0.3 // Trigger when 30% of the element is visible
        });

        animatedElements.forEach(el => {
            observer.observe(el);
        });
    }
    // --- END: Content Card Scroll Animation Observer ---


    // Close mobile menu when a link *inside* it is clicked
    if (mobileMenu) {
        mobileMenu.querySelectorAll('a.nav-link-mobile').forEach(link => {
            link.addEventListener('click', () => {
                if (!mobileMenu || !menuIconOpen || !menuIconClose) return;
                mobileMenu.classList.add('hidden');
                menuIconOpen.classList.add('block');
                menuIconOpen.classList.remove('hidden');
                menuIconClose.classList.add('hidden');
                menuIconClose.classList.remove('block');
            });
        });
    }

    // --- START: New Gallery Modal Logic ---

    // Define gallery image paths
    const galleries = {
        musical: [
            'images/musical/musical-1.png',
            'images/musical/musical-2.png',
            'images/musical/musical-3.png',
            'images/musical/musical-4.png',
            'images/musical/musical-5.png',
            'images/musical/musical-6.png'
        ],
        irl: [
            'images/irl/irl-1.png',
            'images/irl/irl-2.png',
            'images/irl/irl-3.png',
            'images/irl/irl-4.png',
            'images/irl/irl-5.png',
            'images/irl/irl-6.png'
        ],
        playground: [
            'images/playground/playground-1.png',
            'images/playground/playground-2.png',
            'images/playground/playground-3.png',
            'images/playground/playground-4.png',
            'images/playground/playground-5.png',
            'images/playground/playground-6.png'
        ],
        diy: [
            'images/diy/diy-1.png',
            'images/diy/diy-2.png',
            'images/diy/diy-3.png',
            'images/diy/diy-4.png',
            'images/diy/diy-5.png',
            'images/diy/diy-6.png',
            'images/diy/diy-7.png'
        ]
    };

    // Get modal elements
    const galleryModal = document.getElementById('gallery-modal');
    const galleryTrack = document.getElementById('gallery-track');
    const closeButton = document.getElementById('gallery-close');
    const nextButton = document.getElementById('gallery-next');
    const prevButton = document.getElementById('gallery-prev');
    const galleryTriggers = document.querySelectorAll('.activity-image-card');

    let currentGallery = [];
    let currentIndex = 0;

    function updateSlidePosition() {
        galleryTrack.style.transform = `translateX(-${currentIndex * 100}vw)`;
    }

    function openModal(galleryName) {
        if (!galleries[galleryName] || !mainContainer) return;

        currentGallery = galleries[galleryName];
        currentIndex = 0;

        // Populate the gallery track
        galleryTrack.innerHTML = '';
        currentGallery.forEach(src => {
            const slide = document.createElement('div');
            slide.className = 'gallery-slide';
            const img = document.createElement('img');
            img.src = src;
            img.alt = "Gallery image";
            // Add error handling for broken images
            img.onerror = () => {
                img.alt = "Image not found";
                // You could style the broken image state further if needed
            };
            slide.appendChild(img);
            galleryTrack.appendChild(slide);
        });

        updateSlidePosition(); // Set to first slide
        galleryModal.classList.remove('hidden');
        mainContainer.style.overflow = 'hidden'; // Stop main page from scrolling
    }

    function closeModal() {
        if (!mainContainer) return;
        galleryModal.classList.add('hidden');
        mainContainer.style.overflow = 'scroll'; // Re-enable main page scrolling
    }

    function nextImage() {
        currentIndex = (currentIndex + 1) % currentGallery.length;
        updateSlidePosition();
    }

    function prevImage() {
        currentIndex = (currentIndex - 1 + currentGallery.length) % currentGallery.length;
        updateSlidePosition();
    }

    // Add event listeners for modal
    galleryTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const galleryName = trigger.dataset.gallery;
            openModal(galleryName);
        });
    });

    if (closeButton) closeButton.addEventListener('click', closeModal);
    if (nextButton) nextButton.addEventListener('click', nextImage);
    if (prevButton) prevButton.addEventListener('click', prevImage);

    // --- END: New Gallery Modal Logic ---


    // --- Start Everything ---
    if (typeof THREE !== 'undefined') {
        init3D();
    } else {
        console.error("three.js library failed to load. 3D background will not start.");
    }

});