document.addEventListener('DOMContentLoaded', () => {
    // Elements references matching your directory layout
    const searchInput = document.querySelector('input[placeholder*="Name, city or country"]');
    const typeSelect = document.querySelector('select'); // If you have a type dropdown
    const clearFiltersBtn = document.getElementById('clearFiltersBtn') || document.querySelector('button:contains("Clear filters")') || document.querySelector('.header-actions + div button');
    
    // Fallback if container IDs differ, adjust querySelector to your exact grid container
    const orgsContainer = document.getElementById('organizationsGrid') || document.querySelector('.pet-grid') || document.querySelector('main .shell .grid') || document.getElementById('featuredPets');
    
    let allOrganizations = [];

    // 1. Fetch organizations roll dynamically from Supabase
    async function fetchOrganizations() {
        if (!window.supabase) {
            console.error("ThePetGrid Bridge Error: Supabase client instance missing.");
            return;
        }

        try {
            const { data, error } = await window.supabase
                .from('organizations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error pulling directory data:", error);
                if (orgsContainer) {
                    orgsContainer.innerHTML = `<p class="text-red-400 col-span-full text-center py-8">Failed to sync with the organization registry.</p>`;
                }
                return;
            }

            allOrganizations = data || [];
            renderOrganizations(allOrganizations);

        } catch (err) {
            console.error("Network synchronization crash:", err);
        }
    }

    // 2. Render beautiful custom card mosaics for registered shelters
    function renderOrganizations(orgs) {
        if (!orgsContainer) return;
        orgsContainer.innerHTML = '';

        if (orgs.length === 0) {
            orgsContainer.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-500 bg-[#0d1b33] rounded-2xl border border-dashed border-gray-800">
                    No active organizations match your current discovery scope.
                </div>`;
            return;
        }

        orgs.forEach(org => {
            const card = document.createElement('div');
            // Clean premium glassmorphism styling wrapping your UI card rules
            card.className = "bg-[#061326] border border-gray-800/60 rounded-3xl p-6 hover:border-orange-500/50 transition duration-300 flex flex-col justify-between shadow-xl relative overflow-hidden";
            
            // Build dynamic verified token badge structure
            const verifiedBadge = org.is_verified 
                ? `<span class="bg-blue-500/10 text-blue-400 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-blue-500/20 tracking-wider">✓ Verified</span>` 
                : '';

            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-start mb-4">
                        <img src="${org.avatar_url || '../assets/logo.png'}" 
                             class="w-16 h-16 rounded-xl object-cover border border-gray-800 bg-[#0a1f38]" 
                             alt="${org.name}">
                        ${verifiedBadge}
                    </div>
                    <h3 class="text-xl font-bold text-white mb-2 tracking-tight">${org.name}</h3>
                    <p class="text-gray-400 text-sm line-clamp-3 mb-4">${org.description || 'Dedicated to regional animal rescue operations and community welfare safety nets.'}</p>
                </div>
                <div class="mt-4 pt-4 border-t border-gray-900 flex flex-col gap-2">
                    ${org.website ? `<a href="${org.website}" target="_blank" class="text-xs text-gray-400 hover:text-white transition flex items-center gap-1">🌐 Website: ${new URL(org.website).hostname}</a>` : ''}
                    <a href="organization-profile.html?id=${org.id}" 
                       class="block text-center w-full bg-[#0a1f38] hover:bg-orange-500 text-white font-bold text-sm py-3 rounded-xl transition duration-300 mt-2">
                        Explore Hub →
                    </a>
                </div>
            `;
            orgsContainer.appendChild(card);
        });
    }

    // 3. Real-time client-side filter engine linkage
    function filterDirectory() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        
        const filtered = allOrganizations.filter(org => {
            const matchName = org.name ? org.name.toLowerCase().includes(query) : false;
            const matchDesc = org.description ? org.description.toLowerCase().includes(query) : false;
            const matchWebsite = org.website ? org.website.toLowerCase().includes(query) : false;
            
            return matchName || matchDesc || matchWebsite;
        });

        renderOrganizations(filtered);
    }

    // Bind real-time input event triggers
    if (searchInput) {
        searchInput.addEventListener('input', filterDirectory);
    }

    // Clear filters interaction trigger button
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (typeSelect) typeSelect.selectedIndex = 0;
            renderOrganizations(allOrganizations);
        });
    }

    // Execute lookup fetch call sequence
    setTimeout(fetchOrganizations, 600);
});
