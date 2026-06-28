/* ==========================================================================
   CircleUp - Ultimate Payment Gateway, Inventory & Interactive UI Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Background Visual Engine Setup (ThreeJS) ---
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


    // --- 2. Live Ticket Inventory Counter Manager ---
    const defaultInventory = {
        early_bird_female: 3,
        early_bird_male: 3,
        regular_female: 2,
        regular_male: 2
    };

    function getInventory() {
        const stored = localStorage.getItem('circleup_ticket_counts');
        if (!stored) {
            localStorage.setItem('circleup_ticket_counts', JSON.stringify(defaultInventory));
            return defaultInventory;
        }
        return JSON.parse(stored);
    }

    function updateInventoryUI() {
        const currentStock = getInventory();
        
        for (const [ticketKey, availableCount] of Object.entries(currentStock)) {
            const displaySpan = document.getElementById(`count-${ticketKey}`);
            const targetRow = document.getElementById(`row-${ticketKey}`);
            const targetRadio = targetRow ? targetRow.querySelector('input[type="radio"]') : null;

            if (displaySpan) {
                if (availableCount > 0) {
                    displaySpan.textContent = `${availableCount} left`;
                    displaySpan.className = "p-3 md:p-4 text-center text-gray-400 font-mono count-display";
                } else {
                    displaySpan.textContent = "Sold Out";
                    displaySpan.className = "p-3 md:p-4 text-center text-red-500 font-semibold count-display";
                    
                    if (targetRow) {
                        targetRow.classList.add('opacity-40', 'cursor-not-allowed');
                        targetRow.classList.remove('hover:bg-white/5', 'cursor-pointer', 'bg-pink-500/10', 'border-pink-500/40');
                    }
                    if (targetRadio) {
                        targetRadio.disabled = true;
                        if (targetRadio.checked) targetRadio.checked = false;
                    }
                }
            }
        }
    }

    function deductTicketStock(ticketKey) {
        const currentStock = getInventory();
        if (currentStock[ticketKey] > 0) {
            currentStock[ticketKey] -= 1;
            localStorage.setItem('circleup_ticket_counts', JSON.stringify(currentStock));
            updateInventoryUI();
            updateRowStyles();
        }
    }


    // --- 3. Robust Interactive Row-Selection Component ---
    function updateRowStyles() {
        document.querySelectorAll('.ticket-row').forEach(r => {
            const radio = r.querySelector('input[type="radio"]');
            
            if (radio && radio.checked) {
                // Highlight selected row with an explicit visual glow layout
                r.classList.add('bg-pink-500/10', 'border-pink-500/40');
                r.classList.remove('hover:bg-white/5');
            } else {
                // Reset unselected rows back to default base state templates
                r.classList.remove('bg-pink-500/10', 'border-pink-500/40');
                if (radio && !radio.disabled) {
                    r.classList.add('hover:bg-white/5');
                }
            }
        });
    }

    document.querySelectorAll('.ticket-row').forEach(row => {
        row.addEventListener('click', (event) => {
            const radio = row.querySelector('input[type="radio"]');
            
            // Abort configuration changes if the category option is locked out
            if (!radio || radio.disabled) return;
            
            // If the user fires a direct click clean onto the radio dot, step back and update style metrics natively
            if (event.target === radio) {
                updateRowStyles();
                return;
            }
            
            // Force programmatic radio selection toggle
            radio.checked = true;
            
            // Dispatch native state execution trigger flags out to form wrapper
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            
            updateRowStyles();
        });
    });

    // Sync any explicit manual click interaction on radio buttons
    document.querySelectorAll('input[name="ticket_type"]').forEach(radio => {
        radio.addEventListener('change', updateRowStyles);
    });

    // Run layout visual initialization routines
    updateInventoryUI();
    updateRowStyles();


    // --- 4. Live Razorpay Payment Engine Pipeline ---
    const paymentForm = document.getElementById('payment-form');
    
    if (paymentForm) {
        paymentForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const selectedTicket = document.querySelector('input[name="ticket_type"]:checked');
            if (!selectedTicket) {
                alert('Please pick an available ticket from the options above.');
                return;
            }

            const ticketValue = selectedTicket.value; 
            const ticketPriceINR = parseInt(selectedTicket.getAttribute('data-price'), 10);
            const ticketLabel = selectedTicket.closest('tr').querySelector('.ticket-label').textContent.trim();

            const activeStock = getInventory();
            if (activeStock[ticketValue] <= 0) {
                alert(`Sorry, ${ticketLabel} tickets are completely sold out!`);
                return;
            }

            const userName = document.getElementById('user-name').value.trim();
            const userEmail = document.getElementById('user-email').value.trim();
            const userPhoneRaw = document.getElementById('user-phone').value.trim();
            const userPhoneWithPrefix = '+91' + userPhoneRaw;

            const amountInPaise = ticketPriceINR * 100;

            const options = {
                "key": "rzp_live_T6j4wLEK2w7G6B", 
                "amount": amountInPaise,
                "currency": "INR",
                "name": "CircleUp",
                "description": `1x ${ticketLabel} Entry Ticket`,
                "image": "../images/logos/Circle-up-logo-3D.png",
                "handler": function (response) {
                    alert(`🎉 Payment Confirmed!\nTransaction ID: ${response.razorpay_payment_id}\nYour registration is locked.`);
                    deductTicketStock(ticketValue);
                },
                "prefill": {
                    "name": userName,
                    "email": userEmail,
                    "contact": userPhoneWithPrefix
                },
                "notes": {
                    "event_category": "CircleUp IRL Gathering",
                    "chosen_ticket": ticketLabel,
                    "ticket_sku": ticketValue,
                    "max_limit_per_payment": "1"
                },
                "theme": {
                    "color": "#ff007f" 
                }
            };

            const rzp = new Razorpay(options);
            
            rzp.on('payment.failed', function (response) {
                alert(`Transaction Incomplete. Context: ${response.error.description}`);
            });

            rzp.open();
        });
    }
});