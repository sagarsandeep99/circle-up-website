// We wrap all our code in a DOMContentLoaded listener.
// This is the safest way to ensure that all HTML elements
// (like the canvas and buttons) exist before we try to use them.
document.addEventListener('DOMContentLoaded', () => {

    // --- 3D Background Setup ---
    // 'THREE' is available globally from the script tag in the <head>
    let scene, camera, renderer, shapes;
    let targetMouse = new THREE.Vector2(); // This will be controlled by EITHER mouse or gyro

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

        // Shapes
        shapes = [];
        
        // --- UPDATED GEOMETRIES ---
        const geometries = [
            new THREE.IcosahedronGeometry(0.5, 0),      // Diamond
            new THREE.SphereGeometry(0.4, 16, 16),      // Ball
            new THREE.BoxGeometry(0.8, 0.8, 0.8),       // Cube
            new THREE.TetrahedronGeometry(0.7),         // Triangle
            new THREE.TorusGeometry( 0.4, 0.15, 16, 40 ) // Donut
        ];
        
        // Use MeshNormalMaterial for a colorful, light-less effect
        const material = new THREE.MeshNormalMaterial(); 

        // UPDATED: Reduced the number of shapes to 50
        for (let i = 0; i < 50; i++) { 
            const geometry = geometries[Math.floor(Math.random() * geometries.length)];
            const mesh = new THREE.Mesh(geometry, material);
            
            mesh.position.x = (Math.random() - 0.5) * 25;
            mesh.position.y = (Math.random() - 0.5) * 25;
            mesh.position.z = (Math.random() - 0.5) * 25;

            const scale = 0.5 + Math.random() * 1.5;
            mesh.scale.set(scale, scale, scale);

            mesh.userData.speed = {
                x: (Math.random() - 0.5) * 0.005,
                y: (Math.random() - 0.5) * 0.005
            };

            shapes.push(mesh);
            scene.add(mesh);
        }

        // Handle window resize
        window.addEventListener('resize', onWindowResize, false);
        
        // --- UPDATED: Add mouse listener by default ---
        // This will serve as the fallback for desktops.
        document.addEventListener('mousemove', onDocumentMouseMove, false);

        animate();
        
        // --- NEW: Attempt to enable motion controls on first user interaction ---
        // This is necessary to trigger the permission prompt on iOS.
        document.body.addEventListener('click', attemptMotionControl, { once: true });
        document.body.addEventListener('touchstart', attemptMotionControl, { once: true });
    }

    
    // --- NEW: Motion Control Logic ---

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
                        // If denied, the mouse listener just stays active.
                    })
                    .catch(err => {
                        // Handle errors (e.g., user is not on HTTPS)
                        console.error(err);
                    });
            } else {
                // Android or other browsers that don't need explicit permission
                // Just add the listener
                window.addEventListener('deviceorientation', onDeviceOrientation);
                // Remove the mouse listener to prevent conflicts
                document.removeEventListener('mousemove', onDocumentMouseMove, false);
            }
        }
        // If DeviceOrientationEvent is not supported at all, the mouse listener remains active.
    }

    // NEW: Handles device tilt
    function onDeviceOrientation(event) {
        // event.gamma: left-to-right tilt (-90 to 90)
        // event.beta: front-to-back tilt (-180 to 180)
        
        // We'll use gamma for x and beta for y.
        // Normalize these values to a -1 to 1 range.
        
        // Gamma: -90 (left) to 90 (right). Clamp and normalize.
        let x = (event.gamma || 0); // Get value
        x = Math.max(-90, Math.min(90, x)) / 90; // Clamp and normalize to -1 to 1
        
        // Beta: A good "neutral" range is ~25 to 65 degrees (holding phone).
        // Let's use 45 as the "center" (0) and clamp at +/- 20 degrees.
        let y = (event.beta || 45); // Get value
        y = (y - 45) / 20; // Normalize around 45, with a 20-degree range
        
        // Clamp values just in case
        y = Math.max(-1, Math.min(1, y));

        // Update the target vector.
        // Note: We'll reverse 'y' like we did with the mouse.
        targetMouse.x = x;
        targetMouse.y = -y;
    }
    
    // Mouse move handler (for desktops or as fallback)
    function onDocumentMouseMove(event) {
        // Normalized device coordinates (-1 to +1)
        targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    // --- End of Motion Control Logic ---


    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        if (!renderer) return; // Stop animation if renderer isn't set up

        // Add camera interaction
        // This code doesn't care if targetMouse is from gyro or mouse!
        // It smoothly interpolates camera position towards the target
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetMouse.x * 2, 0.05);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetMouse.y * 2, 0.05);
        // Always look at the center
        camera.lookAt(scene.position);


        // Animate shapes
        shapes.forEach(shape => {
            shape.rotation.x += shape.userData.speed.x;
            shape.rotation.y += shape.userData.speed.y;

            // Gently float around
            shape.position.x += shape.userData.speed.x * 0.5;
            shape.position.y += shape.userData.speed.y * 0.5;

            // Wrap around screen
            if (shape.position.y > 12) shape.position.y = -12;
            if (shape.position.y < -12) shape.position.y = 12;
            if (shape.position.x > 12) shape.position.x = -12;
            if (shape.position.x < -12) shape.position.x = 12;
        });
        
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
    
    // You can replace these placeholder URLs with your actual image paths.
    // For example: './images/charades-poster.jpg'
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

    // Event listeners for closing the modal
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