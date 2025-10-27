// We wrap all our code in a DOMContentLoaded listener.
// This is the safest way to ensure that all HTML elements
// (like the canvas and buttons) exist before we try to use them.
document.addEventListener('DOMContentLoaded', () => {

    // --- 3D Background Setup ---
    // 'THREE' is available globally from the script tag in the <head>
    let scene, camera, renderer, shapes;
    let targetMouse = new THREE.Vector2(); // To store mouse position

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
        const geometries = [
            new THREE.IcosahedronGeometry(0.5, 0), // Diamond
            new THREE.SphereGeometry(0.4, 16, 16)   // Ball
        ];
        // Use MeshNormalMaterial for a colorful, light-less effect
        const material = new THREE.MeshNormalMaterial(); 

        for (let i = 0; i < 150; i++) { // Increased number of shapes
            // Pick a random geometry
            const geometry = geometries[Math.floor(Math.random() * geometries.length)];
            const mesh = new THREE.Mesh(geometry, material);
            
            // Random positions (spread out a bit more)
            mesh.position.x = (Math.random() - 0.5) * 25;
            mesh.position.y = (Math.random() - 0.5) * 25;
            mesh.position.z = (Math.random() - 0.5) * 25;

            // Random scales
            const scale = 0.5 + Math.random() * 1.5;
            mesh.scale.set(scale, scale, scale);

            // Store speed for rotation and movement
            mesh.userData.speed = {
                x: (Math.random() - 0.5) * 0.005,
                y: (Math.random() - 0.5) * 0.005
            };

            shapes.push(mesh);
            scene.add(mesh);
        }

        // Handle window resize
        window.addEventListener('resize', onWindowResize, false);
        // Add mouse move listener for interaction
        document.addEventListener('mousemove', onDocumentMouseMove, false);

        animate();
    }

    // Mouse move handler
    function onDocumentMouseMove(event) {
        // Normalized device coordinates (-1 to +1)
        targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        if (!renderer) return; // Stop animation if renderer isn't set up

        // Add camera interaction
        // Smoothly interpolate camera position towards mouse target
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

    // --- NEW MODAL LOGIC (Replaces Game Logic) ---

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

    // --- NEW Activities Dropdown Logic ---
    
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
        if (navActivitiesLink && !navActivitiesLink.contains(e.target) && navActivitiesDropdown && !navActivitiesDropdown.contains(e.target)) {
            navActivitiesDropdown.classList.add('hidden');
            navActivitiesArrow.classList.remove('rotate-180');
        }
        // No need for mobile, as the whole menu closes
    });

    // Close mobile menu when a link *inside* it is clicked
    if (mobileMenu) {
        mobileMenu.querySelectorAll('a').forEach(link => {
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