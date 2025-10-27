// We wrap all our code in a DOMContentLoaded listener.
// This is the safest way to ensure that all HTML elements
// (like the canvas and buttons) exist before we try to use them.
document.addEventListener('DOMContentLoaded', () => {

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
            new THREE.BoxGeometry(0.8, 0.8, 0.8),       // Cube
            new THREE.TetrahedronGeometry(0.7),         // Triangle
            new THREE.TorusGeometry( 0.4, 0.15, 16, 40 ) // Donut
        ];
        const material = new THREE.MeshNormalMaterial(); 

        for (let i = 0; i < 100; i++) { // Set to 100 shapes total
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

        // --- 2D Smiley Click Listener ---
        if (chaserSmiley) {
            chaserSmiley.addEventListener('click', () => {
                moveChaser();
                tauntUser();
            });
            
            // Make it visible once JS is loaded
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
        if (chaserContainer) {
            const bob = Math.sin(Date.now() * 0.005) * 5; // 5px up and down
            chaserContainer.style.transform = `translate(-50%, -50%) translateY(${bob}px)`;
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

    // --- MODAL LOGIC ---

    // Get modal elements
    const imageModal = document.getElementById('image-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalImage = document.getElementById('modal-image');
    const closeImageModalBtn = document.getElementById('close-image-modal');

    // Get card elements
    const charadesCard = document.getElementById('charades-card');
    const pictionaryCard = document.getElementById('pictionary-card');
    const karaokeCard = document.getElementById('karaoke-card'); 

    // Function to open the image modal
    function openImageModal(title, imageUrl, colorClass) {
        if (!imageModal || !modalTitle || !modalImage) return;
        modalTitle.textContent = title;
        modalImage.src = imageUrl;
        modalTitle.className = `text-3xl font-bold mb-4 text-center ${colorClass}`; // Apply color
        imageModal.classList.remove('hidden');
    }

    // Function to close modal
    function closeImageModal() {
        if (!imageModal) return;
        imageModal.classList.add('hidden');
        modalImage.src = ""; // Clear image src
    }

    // --- Event Listeners for Cards ---
    
    const placeholderUrl = (text, color) => `https://placehold.co/600x400/${color}/white?text=${text}`;

    if (charadesCard) {
        charadesCard.addEventListener('click', () => {
            openImageModal('Dumb Charades', placeholderUrl('Charades+Image', '06b6d4'), 'text-cyan-300');
        });
    }

    if (pictionaryCard) {
        pictionaryCard.addEventListener('click', () => {
            openImageModal('Pictionary', placeholderUrl('Pictionary+Image', 'ec4899'), 'text-pink-300');
        });
    }

    if (karaokeCard) {
        karaokeCard.addEventListener('click', () => {
            openImageModal('Karaoke', placeholderUrl('Karaoke+Image', 'eab308'), 'text-yellow-300');
        });
    }

    if (closeImageModalBtn) {
        closeImageModalBtn.addEventListener('click', closeImageModal);
    }
    
    if (imageModal) {
        imageModal.addEventListener('click', (e) => {
            // Close if clicking on the background overlay
            if (e.target === imageModal) {
                closeImageModal();
            }
        });
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

    // --- Activities Dropdown Logic ---
    
    // Desktop
    const navActivitiesLink = document.getElementById('nav-activities-link');
    const navActivitiesDropdown = document.getElementById('nav-activities-dropdown');
    const navActivitiesArrow = document.getElementById('nav-activities-arrow');

    if (navActivitiesLink) {
        navActivitiesLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (!navActivitiesDropdown || !navActivitiesArrow) return;
            const isHidden = navActivitiesDropdown.classList.toggle('hidden');
            navActivitiesArrow.classList.toggle('rotate-180', !isHidden);
        });
    }

    // Mobile
    const mobileNavActivitiesLink = document.getElementById('mobile-nav-activities-link');
    const mobileNavActivitiesDropdown = document.getElementById('mobile-nav-activities-dropdown');
    const mobileNavActivitiesArrow = document.getElementById('mobile-nav-activities-arrow');

    if (mobileNavActivitiesLink) {
        mobileNavActivitiesLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (!mobileNavActivitiesDropdown || !mobileNavActivitiesArrow) return;
            const isHidden = mobileNavActivitiesDropdown.classList.toggle('hidden');
            mobileNavActivitiesArrow.classList.toggle('rotate-180', !isHidden);
        });
    }

    // Close dropdowns if clicking outside
    window.addEventListener('click', (e) => {
        // Check for desktop nav
        const navContainer = document.getElementById('activities-nav-container');
        if (navContainer && !navContainer.contains(e.target)) {
            if(navActivitiesDropdown) navActivitiesDropdown.classList.add('hidden');
            if(navActivitiesArrow) navActivitiesArrow.classList.remove('rotate-180');
        }
    });

    // Close mobile menu when a link *inside* it is clicked
    if (mobileMenu) {
        mobileMenu.querySelectorAll('a.nav-link-mobile, a.dropdown-link-mobile').forEach(link => {
            link.addEventListener('click', () => { 
                if (!mobileMenu || !menuIconOpen || !menuIconClose) return;
                mobileMenu.classList.add('hidden');
                menuIconOpen.classList.add('block');
                menuIconOpen.classList.remove('hidden');
                menuIconClose.classList.add('hidden');
                menuIconClose.classList.remove('block');
                
                // Also close the mobile activities dropdown if it was open
                if(mobileNavActivitiesDropdown) mobileNavActivitiesDropdown.classList.add('hidden');
                if(mobileNavActivitiesArrow) mobileNavActivitiesArrow.classList.remove('rotate-180');
            });
        });
    }


    // --- Start Everything ---
    if (typeof THREE !== 'undefined') {
        init3D();
    } else {
        console.error("three.js library failed to load. 3D background will not start.");
    }

});