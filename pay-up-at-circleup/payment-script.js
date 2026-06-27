/* ==========================================================================
   CircleUp - Payment Gateway & Animation Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Background Animation Engine (Preserved) ---
    const canvas = document.getElementById('bg-canvas');
    if (canvas) {
        canvas.style.setProperty('position', 'fixed', 'important');
        canvas.style.setProperty('top', '0', 'important');
        canvas.style.setProperty('left', '0', 'important');
        canvas.style.setProperty('width', '100vw', 'important');
        canvas.style.setProperty('height', '100vh', 'important');
        canvas.style.setProperty('z-index', '-1', 'important');
        canvas.style.setProperty('pointer-events', 'none', 'important');

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f0f1a);
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: false, antialias: true });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const material = new THREE.MeshNormalMaterial();
        const meshes = [];
        const geometries = [
            new THREE.IcosahedronGeometry(1, 0),
            new THREE.OctahedronGeometry(0.8, 0),
            new THREE.TorusGeometry(0.6, 0.2, 8, 24),
            new THREE.SphereGeometry(0.7, 16, 16)
        ];

        for (let i = 0; i < 50; i++) {
            const randomGeo = geometries[Math.floor(Math.random() * geometries.length)];
            const mesh = new THREE.Mesh(randomGeo, material);
            mesh.position.x = (Math.random() - 0.5) * 35;
            mesh.position.y = (Math.random() - 0.5) * 22;
            mesh.position.z = (Math.random() - 0.5) * 10 - 5;
            
            const scale = Math.random() * 0.5 + 0.4;
            mesh.scale.set(scale, scale, scale);
            
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

        function animate() {
            requestAnimationFrame(animate);
            const time = Date.now() * 0.001;
            meshes.forEach(mesh => {
                mesh.rotation.x += mesh.userData.rotSpeedX;
                mesh.rotation.y += mesh.userData.rotSpeedY;
                mesh.position.y += Math.sin(time + mesh.userData.phase) * mesh.userData.floatSpeed;
            });
            renderer.render(scene, camera);
        }
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // --- 2. Razorpay Integration Logic ---
    const paymentForm = document.getElementById('payment-form');
    
    if (paymentForm) {
        paymentForm.addEventListener('submit', function (e) {
            e.preventDefault(); // Stop form from reloading the page

            // Get selected ticket element
            const selectedTicket = document.querySelector('input[name="ticket_type"]:checked');
            if (!selectedTicket) {
                alert('Please select a ticket type before proceeding.');
                return;
            }

            // Extract ticket details
            const ticketValue = selectedTicket.value; // e.g., "early_bird_female"
            const ticketPriceINR = parseInt(selectedTicket.getAttribute('data-price'), 10); // e.g., 1000
            const ticketLabel = selectedTicket.closest('tr').querySelector('td:nth-child(2)').textContent.trim(); // e.g., "Early Bird (Female)"

            // Extract contact details
            const userName = document.getElementById('user-name').value.trim();
            const userEmail = document.getElementById('user-email').value.trim();
            const userPhoneRaw = document.getElementById('user-phone').value.trim();
            const userPhoneWithPrefix = '+91' + userPhoneRaw; // Combines prefix with 10-digit number

            // Razorpay accepts amounts in the smallest currency unit (Paise for INR). 
            // e.g., ₹1,000 = 100000 Paise.
            const amountInPaise = ticketPriceINR * 100;

            // Configure Razorpay Options
            const options = {
                "key": "YOUR_RAZORPAY_KEY_ID", // Replace with your actual Razorpay Key ID
                "amount": amountInPaise,
                "currency": "INR",
                "name": "CircleUp",
                "description": `1x ${ticketLabel} Ticket`,
                "image": "../images/logos/Circle-up-logo-3D.png", // Paths to your hosted dashboard logo
                "handler": function (response) {
                    // This function executes inside the client browser upon successful payment capture
                    alert(`Payment Successful!\nPayment ID: ${response.razorpay_payment_id}`);
                    
                    // You can redirect to a success page or send details to your email/database webhook here:
                    // window.location.href = "/payment-success/";
                },
                "prefill": {
                    "name": userName,
                    "email": userEmail,
                    "contact": userPhoneWithPrefix
                },
                "notes": {
                    "ticket_type": ticketLabel,
                    "system_sku": ticketValue,
                    "quantity": "1"
                },
                "theme": {
                    "color": "#ff007f" // Matches your custom hot pink branding color
                }
            };

            // Instantiate and open the Checkout modal
            const rzp = new Razorpay(options);
            
            rzp.on('payment.failed', function (response) {
                alert(`Payment Failed. Reason: ${response.error.description}`);
            });

            rzp.open();
        });
    }
});