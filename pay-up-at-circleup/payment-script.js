/* ==========================================================================
   CircleUp - Supabase Secure Transactional Dynamic Pricing Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Supabase Client Configurations ---
    const SUPABASE_URL = 'https://gouqpxzehiuxzinvcavh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvdXFweHplaGl1eHppbnZjYXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTgxMTEsImV4cCI6MjA5NDA5NDExMX0.trhLEhq04vP3_-ekfWETyXWZmat3sLiVO750KUmJwhg';
    
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    let cachedInventory = {};

    // --- 2. Background Visual Engine Setup (ThreeJS) ---
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

    // --- 3. Cloud Database Inventory & Pricing Management Engine ---
    async function fetchInventoryFromCloud() {
        try {
            // Securely fetching both availability limits AND pricing rows from Supabase
            const { data, error } = await supabaseClient
                .from('ticket_inventory')
                .select('ticket_key, available_count, price');

            if (error) throw error;

            data.forEach(item => {
                cachedInventory[item.ticket_key] = {
                    count: item.available_count,
                    price: item.price
                };
            });

            updateInventoryUI();
        } catch (err) {
            console.error('Error loading config rows from Supabase:', err.message);
        }
    }

    function updateInventoryUI() {
        for (const [ticketKey, info] of Object.entries(cachedInventory)) {
            const countSpan = document.getElementById(`count-${ticketKey}`);
            const priceSpan = document.getElementById(`price-${ticketKey}`);
            const targetRow = document.getElementById(`row-${ticketKey}`);
            const targetRadio = targetRow ? targetRow.querySelector('input[type="radio"]') : null;

            // Render prices dynamically from database records
            if (priceSpan) {
                priceSpan.textContent = `\u20B9${info.price.toLocaleString('en-IN')}`;
            }

            // Render remaining ticket seats dynamically
            if (countSpan) {
                if (info.count > 0) {
                    countSpan.textContent = `${info.count} left`;
                    countSpan.className = "p-3 md:p-4 text-center text-gray-400 font-mono count-display";
                    
                    if (targetRow) {
                        targetRow.classList.remove('opacity-40', 'cursor-not-allowed');
                    }
                    if (targetRadio) targetRadio.disabled = false;
                } else {
                    countSpan.textContent = "Sold Out";
                    countSpan.className = "p-3 md:p-4 text-center text-red-500 font-semibold count-display";
                    
                    if (targetRow) {
                        targetRow.classList.add('opacity-40', 'cursor-not-allowed');
                        targetRow.classList.remove('bg-pink-500/10', 'border-pink-500/40');
                    }
                    if (targetRadio) {
                        targetRadio.disabled = true;
                        if (targetRadio.checked) {
                            targetRadio.checked = false;
                            updateRowStyles();
                        }
                    }
                }
            }
        }
    }

    // Realtime Sync Subscription Channel
    function initializeRealtimeSync() {
        supabaseClient
            .channel('live-inventory-tracker')
            .on(
                'postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'ticket_inventory' }, 
                (payload) => {
                    const updatedRow = payload.new;
                    if (updatedRow && updatedRow.ticket_key) {
                        cachedInventory[updatedRow.ticket_key] = {
                            count: updatedRow.available_count,
                            price: updatedRow.price
                        };
                        updateInventoryUI();
                        updateRowStyles();
                    }
                }
            )
            .subscribe();
    }

    // --- 4. Interactive UI Styling Components ---
    function updateRowStyles() {
        document.querySelectorAll('.ticket-row').forEach(r => {
            const radio = r.querySelector('input[type="radio"]');
            if (radio && radio.checked) {
                r.classList.add('bg-pink-500/10', 'border-pink-500/40');
            } else {
                r.classList.remove('bg-pink-500/10', 'border-pink-500/40');
            }
        });
    }

    document.querySelectorAll('.ticket-row').forEach(row => {
        row.addEventListener('click', (event) => {
            const radio = row.querySelector('input[type="radio"]');
            if (!radio || radio.disabled) return;
            if (event.target === radio) {
                updateRowStyles();
                return;
            }
            radio.checked = true;
            updateRowStyles();
        });
    });

    document.querySelectorAll('input[name="ticket_type"]').forEach(radio => {
        radio.addEventListener('change', updateRowStyles);
    });

    // --- 5. Razorpay Transaction & Secure Database Storage Pipeline ---
    const paymentForm = document.getElementById('payment-form');
    
    if (paymentForm) {
        paymentForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const selectedTicket = document.querySelector('input[name="ticket_type"]:checked');
            if (!selectedTicket) {
                alert('Please pick an available ticket from the options above.');
                return;
            }

            const ticketValue = selectedTicket.value; 
            const ticketLabel = selectedTicket.closest('tr').querySelector('.ticket-label').textContent.trim();

            // Pull fresh price context verified straight out of database cache state
            const verifiedTicketInfo = cachedInventory[ticketValue];
            if (!verifiedTicketInfo || verifiedTicketInfo.count <= 0) {
                alert(`Sorry, ${ticketLabel} tickets just sold out!`);
                return;
            }

            const userName = document.getElementById('user-name').value.trim();
            const userEmail = document.getElementById('user-email').value.trim();
            const userPhoneRaw = document.getElementById('user-phone').value.trim();
            const userPhoneWithPrefix = '+91' + userPhoneRaw;

            // Compute exact cost in lower currency denominations (Paise)
            const amountInPaise = verifiedTicketInfo.price * 100;

            const options = {
                "key": "rzp_live_T6j4wLEK2w7G6B", // Your public key identifier
                "amount": amountInPaise,
                "currency": "INR",
                "name": "CircleUp",
                "description": `1x ${ticketLabel} Entry Ticket`,
                "image": "../images/logos/Circle-up-logo-3D.png",
                "handler": async function (response) {
                    
                    // Capture payment data context and pipe it into our transaction function
                    try {
                        const mockOrderId = "ORD-" + Math.random().toString(36).substr(2, 9).toUpperCase();

                        const { data: isSuccess, error: rpcError } = await supabaseClient
                            .rpc('process_secure_registration', {
                                target_ticket_key: ticketValue,
                                p_name: userName,
                                p_email: userEmail,
                                p_phone: userPhoneWithPrefix,
                                p_razorpay_id: response.razorpay_payment_id,
                                p_order_id: response.razorpay_order_id || mockOrderId
                            });

                        if (rpcError) throw rpcError;

                        if (isSuccess) {
                            alert(`🎉 Payment Confirmed!\nTransaction ID: ${response.razorpay_payment_id}\nYour registration is successfully locked into the database.`);
                        } else {
                            alert('Transaction error: Tickets became sold out during processing. Please contact support immediately for a refund.');
                        }
                    } catch (dbErr) {
                        console.error('Critical database execution mapping crash:', dbErr.message);
                        alert('Payment was successful, but database mapping encountered an issue. Please contact support with your Payment ID.');
                    }
                },
                "prefill": {
                    "name": userName,
                    "email": userEmail,
                    "contact": userPhoneWithPrefix
                },
                "notes": {
                    "event_category": "CircleUp IRL Gathering",
                    "chosen_ticket": ticketLabel,
                    "ticket_sku": ticketValue
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

    // Execute application build instructions
    fetchInventoryFromCloud();
    initializeRealtimeSync();
});