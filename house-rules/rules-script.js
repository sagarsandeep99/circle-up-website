/* ==========================================================================
   CircleUp - House Rules Dedicated Background Animation Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    // Force absolute background canvas configuration constraints
    canvas.style.setProperty('position', 'fixed', 'important');
    canvas.style.setProperty('top', '0', 'important');
    canvas.style.setProperty('left', '0', 'important');
    canvas.style.setProperty('width', '100vw', 'important');
    canvas.style.setProperty('height', '100vh', 'important');
    canvas.style.setProperty('z-index', '-1', 'important');
    canvas.style.setProperty('pointer-events', 'none', 'important');

    // Scene Setup
    const scene = new THREE.Scene();
    
    // Explicitly inject the core deep dark branding tone into ThreeJS rendering environment
    scene.background = new THREE.Color(0x0f0f1a);
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: false, // Set to false to cleanly showcase layout scene color
        antialias: true
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create Iridescent Geometries
    const material = new THREE.MeshNormalMaterial();
    const meshes = [];
    const geometries = [
        new THREE.IcosahedronGeometry(1, 0),
        new THREE.OctahedronGeometry(0.8, 0),
        new THREE.TorusGeometry(0.6, 0.2, 8, 24),
        new THREE.SphereGeometry(0.7, 16, 16)
    ];

    // Increased element count to 50 to maintain perfect balanced layout density across wide screen edges
    const totalObjects = 50;

    // Spawn and distribute random floating clusters
    for (let i = 0; i < totalObjects; i++) {
        const randomGeo = geometries[Math.floor(Math.random() * geometries.length)];
        const mesh = new THREE.Mesh(randomGeo, material);
        
        // Expanded layout coordinates spread to reach out to the far left and far right blank spaces
        mesh.position.x = (Math.random() - 0.5) * 35; // Increased from 15 to 35 to span ultra-widescreen layout borders
        mesh.position.y = (Math.random() - 0.5) * 22; // Increased from 15 to 22 for deep vertical distribution mapping
        mesh.position.z = (Math.random() - 0.5) * 10 - 5;
        
        // Random size variations
        const scale = Math.random() * 0.5 + 0.4;
        mesh.scale.set(scale, scale, scale);
        
        // Motion metrics configurations
        mesh.userData = {
            rotSpeedX: Math.random() * 0.01,
            rotSpeedY: Math.random() * 0.01,
            floatSpeed: Math.random() * 0.005 + 0.002,
            phase: Math.random() * Math.PI * 2
        };
        
        scene.add(mesh);
        meshes.push(mesh);
    }

    camera.position.z = 8;

    // Linear Animation Engine Frame System Execution Loop
    function animate() {
        requestAnimationFrame(animate);
        
        const time = Date.now() * 0.001;
        
        meshes.forEach(mesh => {
            mesh.rotation.x += mesh.userData.rotSpeedX;
            mesh.rotation.y += mesh.userData.rotSpeedY;
            
            // Continuous custom wave drift vertical float offsets
            mesh.position.y += Math.sin(time + mesh.userData.phase) * mesh.userData.floatSpeed;
        });
        
        renderer.render(scene, camera);
    }
    
    animate();

    // Viewport Dimension Tracking Constraints
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});