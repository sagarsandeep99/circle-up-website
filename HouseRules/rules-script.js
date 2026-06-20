/* ==========================================================================
   CircleUp - House Rules Dedicated Background Animation Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    // 1. Force absolute background confinement via inline styles
    canvas.style.setProperty('position', 'fixed', 'important');
    canvas.style.setProperty('top', '0', 'important');
    canvas.style.setProperty('left', '0', 'important');
    canvas.style.setProperty('width', '100vw', 'important');
    canvas.style.setProperty('height', '100vh', 'important');
    canvas.style.setProperty('z-index', '-1', 'important');
    canvas.style.setProperty('pointer-events', 'none', 'important');

    // 2. Three.js Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 3. Create Rainbow Iridescent Geometries (Matching image_94a759.png)
    const material = new THREE.MeshNormalMaterial();
    const meshes = [];
    const geometries = [
        new THREE.IcosahedronGeometry(1, 0),
        new THREE.OctahedronGeometry(0.8, 0),
        new THREE.TorusGeometry(0.6, 0.2, 8, 24),
        new THREE.SphereGeometry(0.7, 16, 16)
    ];

    // Spawn random floating crystals
    for (let i = 0; i < 20; i++) {
        const randomGeo = geometries[Math.floor(Math.random() * geometries.length)];
        const mesh = new THREE.Mesh(randomGeo, material);
        
        // Distribute loosely across screen space
        mesh.position.x = (Math.random() - 0.5) * 15;
        mesh.position.y = (Math.random() - 0.5) * 15;
        mesh.position.z = (Math.random() - 0.5) * 10 - 5;
        
        // Random scale variations
        const scale = Math.random() * 0.5 + 0.4;
        mesh.scale.set(scale, scale, scale);
        
        // Custom movement vectors
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

    // 4. Smooth Animation Loop (Purely visual, zero scroll hijacking)
    function animate() {
        requestAnimationFrame(animate);
        
        const time = Date.now() * 0.001;
        
        meshes.forEach(mesh => {
            mesh.rotation.x += mesh.userData.rotSpeedX;
            mesh.rotation.y += mesh.userData.rotSpeedY;
            
            // Subtle floating drifting up/down
            mesh.position.y += Math.sin(time + mesh.userData.phase) * mesh.userData.floatSpeed;
        });
        
        renderer.render(scene, camera);
    }
    
    animate();

    // 5. Responsive Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});