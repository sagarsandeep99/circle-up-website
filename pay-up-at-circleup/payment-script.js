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

    // --- 3. Cloud Database Inventory & Dynamic Row Renderer ---
    async function fetchInventoryFromCloud() {
        try {
            const { data, error } = await supabaseClient
                .from('ticket_inventory')
                .select('ticket_key, ticket_label, available_count, price, is_active')
                .eq('is_active', true) // Render only active flag rows
                .order('id', { ascending: true });

            if (error) throw error;

            data.forEach(item => {
                cachedInventory[item.ticket_key] = {
                    label: item.ticket_label,
                    count: item.available_count,
                    price: item.price
                };
            });

            renderTicketTable(data);
        } catch (err) {
            console.error('Error loading config rows from Supabase:', err.message);
        }
    }

    function renderTicketTable(tickets) {
        const container = document.getElementById('ticket-rows-container');
        if (!container) return;

        container.innerHTML = '';

        tickets.forEach((ticket, index) => {
            const isSoldOut = ticket.available_count <= 0;
            const rowClass = isSoldOut ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer';
            const countText = isSoldOut ? 'Sold Out' : `${ticket.available_count} left`;
            const countClass = isSoldOut ? 'text-red-500 font-semibold' : 'text-gray-400 font-mono';

            const tr = document.createElement('tr');
            tr.id = `row-${ticket.ticket_key}`;
            tr.className = `ticket-row ${rowClass} transition-colors`;
            tr.innerHTML = `
                <td class="p-3 md:p-4 text-center">
                    <input type="radio" id="ticket-${ticket.ticket_key}" name="ticket_type" value="${ticket.ticket_key}" class="w-4 h-4 accent-pink-500 cursor-pointer" ${isSoldOut ? 'disabled' : ''} ${index === 0 && !isSoldOut ? 'required' : ''}>
                </td>
                <td class="p-3 md:p-4 font-medium text-white ticket-label">${ticket.ticket_label}</td>
                <td class="p-3 md:p-4 text-center ${countClass} count-display" id="count-${ticket.ticket_key}">${countText}</td>
                <td class="p-3 md:p-4 text-right font-semibold text-pink-400 price-display" id="price-${ticket.ticket_key}">₹${ticket.price.toLocaleString('en-IN')}</td>
            `;

            tr.addEventListener('click', (e) => {
                const radio = tr.querySelector('input[type="radio"]');
                if (!radio || radio.disabled) return;
                radio.checked = true;
                updateRowStyles();
            });

            container.appendChild(tr);
        });

        updateRowStyles();
    }

    function updateInventoryUI() {
        for (const [ticketKey, info] of Object.entries(cachedInventory)) {
            const countSpan = document.getElementById(`count-${ticketKey}`);
            const priceSpan = document.getElementById(`price-${ticketKey}`);
            const targetRow = document.getElementById(`row-${ticketKey}`);
            const targetRadio = targetRow ? targetRow.querySelector('input[type="radio"]') : null;

            if (priceSpan) {
                priceSpan.textContent = `\u20B9${info.price.toLocaleString('en-IN')}`;
            }

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

    function initializeRealtimeSync() {
        supabaseClient
            .channel('live-inventory-tracker')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ticket_inventory' },
                () => {
                    fetchInventoryFromCloud(); // Re-render table on any schema/data changes
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

    // --- 5. Razorpay Transaction & Secure Database Storage Pipeline ---
    const paymentForm = document.getElementById('payment-form');
    const payBtn = document.getElementById('pay-btn');

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

            const userName = document.getElementById('user-name').value.trim();
            const userEmail = document.getElementById('user-email').value.trim();
            const userPhoneRaw = document.getElementById('user-phone').value.trim();
            const userPhoneWithPrefix = '+91' + userPhoneRaw;

            // Freeze the form button and display status feedback
            payBtn.disabled = true;
            payBtn.innerText = "Initializing Secure Checkout...";

            try {
                // CALL THE SECURE EDGE FUNCTION TO CONSTRUCT TAMPER-PROOF ORDER CONTEXT
                const { data, error: functionError } = await supabaseClient.functions.invoke('create-razorpay-order', {
                    body: { ticket_key: ticketValue }
                });

                if (functionError || !data?.order_id) {
                    throw new Error(functionError ? functionError.message : 'Missing secure Order ID registration.');
                }

                // Configuration parameters safely locked in by backend values
                const options = {
                    "key": "rzp_live_T6j4wLEK2w7G6B",
                    "amount": data.amount,
                    "order_id": data.order_id,
                    "currency": "INR",
                    "name": "CircleUp",
                    "description": `1x ${ticketLabel} Entry Ticket`,
                    "image": "../images/logos/Circle-up-logo-3D.png",
                    "handler": async function (response) {
                        payBtn.innerText = "Finalizing Reservation...";

                        try {
                            const { data: isSuccess, error: rpcError } = await supabaseClient
                                .rpc('process_secure_registration', {
                                    target_ticket_key: ticketValue,
                                    p_name: userName,
                                    p_email: userEmail,
                                    p_phone: userPhoneWithPrefix,
                                    p_razorpay_id: response.razorpay_payment_id,
                                    p_order_id: response.razorpay_order_id
                                });

                            if (rpcError) throw rpcError;

                            if (isSuccess) {
                                document.getElementById('modal-name').textContent = userName;
                                document.getElementById('modal-email').textContent = userEmail;
                                document.getElementById('modal-ticket').textContent = ticketLabel;
                                document.getElementById('modal-amount').textContent = `₹${(data.amount / 100).toLocaleString('en-IN')}`;
                                document.getElementById('modal-payment-id').textContent = response.razorpay_payment_id;

                                const receiptModal = document.getElementById('transaction-modal');
                                if (receiptModal) {
                                    receiptModal.classList.remove('hidden');
                                    receiptModal.classList.add('flex');
                                }

                                document.getElementById('modal-close-btn').onclick = function () {
                                    window.location.reload();
                                };
                            } else {
                                alert('Transaction error: Seats filled during checkout processing. Contact support for immediate help.');
                                window.location.reload();
                            }
                        } catch (dbErr) {
                            console.error('Database entry execution mapping failure:', dbErr.message);
                            alert('Payment successful, but database allocation failed. Contact support with your Payment ID.');
                            window.location.reload();
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
                    alert(`Transaction Incomplete. Reason: ${response.error.description}`);
                    payBtn.disabled = false;
                    payBtn.innerText = "Proceed to Pay";
                });
                rzp.open();

            } catch (err) {
                console.error('Checkout preparation block dropped out:', err.message);
                alert(`Checkout initialization failed: ${err.message}`);
                payBtn.disabled = false;
                payBtn.innerText = "Proceed to Pay";
            }
        });
    }

    // --- 6. Dynamic Event Details & Visibility Toggle Engine ---
    const eventModal = document.getElementById('event-details-modal');
    const openEventBtn = document.getElementById('open-event-btn');
    const closeEventBtn = document.getElementById('close-event-modal-btn');
    const dismissEventBtn = document.getElementById('dismiss-event-modal-btn');

    const eventNameEl = document.getElementById('event-modal-name');
    const eventDateEl = document.getElementById('event-modal-date');
    const eventTimeEl = document.getElementById('event-modal-time');
    const eventVenueEl = document.getElementById('event-modal-venue');

    const heroCard = document.getElementById('hero-card');
    const paymentWrapper = document.getElementById('payment-content-wrapper');
    const constructionWrapper = document.getElementById('construction-wrapper');

    let eventDataCached = null;

    async function loadEventDetails() {
        try {
            const response = await fetch('event-details.json');
            if (!response.ok) throw new Error('Failed to load event details JSON');
            eventDataCached = await response.json();

            if (eventNameEl) eventNameEl.textContent = eventDataCached.eventName;
            if (eventDateEl) eventDateEl.textContent = eventDataCached.date;
            if (eventTimeEl) eventTimeEl.textContent = eventDataCached.time;
            if (eventVenueEl) eventVenueEl.textContent = eventDataCached.venue;

            // Toggle page content visibility based on paymentPage flag
            const isPaymentActive = String(eventDataCached.paymentPage).toLowerCase() === 'true';

            if (!isPaymentActive) {
                if (heroCard) heroCard.classList.add('hidden');
                if (paymentWrapper) paymentWrapper.classList.add('hidden');
                if (constructionWrapper) {
                    constructionWrapper.classList.remove('hidden');
                    constructionWrapper.classList.add('block');
                }
            } else {
                if (heroCard) heroCard.classList.remove('hidden');
                if (paymentWrapper) paymentWrapper.classList.remove('hidden');
                if (constructionWrapper) {
                    constructionWrapper.classList.add('hidden');
                    constructionWrapper.classList.remove('block');
                }
            }

        } catch (err) {
            console.error('Error fetching event details:', err);
            if (eventNameEl) eventNameEl.textContent = "CircleUp Halloween House Party";
            if (eventDateEl) eventDateEl.textContent = "31 October 2026";
            if (eventTimeEl) eventTimeEl.textContent = "7PM onwards";
            if (eventVenueEl) eventVenueEl.textContent = "The Collection by BramhaCorp, New Kalyani Nagar";
        }
    }

    function openModal() {
        if (eventModal) {
            eventModal.classList.remove('hidden');
            eventModal.classList.add('flex');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal() {
        if (eventModal) {
            eventModal.classList.add('hidden');
            eventModal.classList.remove('flex');
            document.body.style.overflow = 'auto';
        }
    }

    if (openEventBtn) openEventBtn.addEventListener('click', openModal);
    if (closeEventBtn) closeEventBtn.addEventListener('click', closeModal);
    if (dismissEventBtn) dismissEventBtn.addEventListener('click', closeModal);

    if (eventModal) {
        eventModal.addEventListener('click', (e) => {
            if (e.target === eventModal) closeModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && eventModal && !eventModal.classList.contains('hidden')) {
            closeModal();
        }
    });

    loadEventDetails();
    fetchInventoryFromCloud();
    initializeRealtimeSync();
});