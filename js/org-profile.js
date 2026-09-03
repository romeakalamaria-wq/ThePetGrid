document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get Organization ID from the URL string
    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get('id');

    if (!orgId) {
        document.getElementById('orgName').textContent = "Organization Not Found";
        document.getElementById('orgDescription').textContent = "No valid organization ID was provided in the URL.";
        return;
    }

    // 2. Fetch Organization Details from Supabase
    async function loadOrganizationDetails() {
        const { data: org, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single();

        if (error || !org) {
            console.error("Error fetching organization:", error);
            document.getElementById('orgName').textContent = "Error Loading Profile";
            return;
        }

        // Update UI Text elements
        document.getElementById('orgName').textContent = org.name;
        document.getElementById('orgDescription').textContent = org.description || "No description provided yet.";
        
        if (org.avatar_url) {
            document.getElementById('orgLogo').src = org.avatar_url;
        }

        if (org.is_verified) {
            document.getElementById('verifiedBadge').classList.remove('hidden');
        }

        if (org.website) {
            const webLink = document.getElementById('orgWebsite');
            webLink.href = org.website;
            webLink.classList.remove('hidden');
        }
    }

    // 3. Fetch Linked Pets via organization_pets Table
    async function loadOrganizationPets() {
        const petsContainer = document.getElementById('petsContainer');
        
        const { data: linkedPets, error } = await supabase
            .from('organization_pets')
            .select(`
                pet_id,
                pets (
                    id,
                    name,
                    image_url,
                    breed,
                    status
                )
            `)
            .eq('organization_id', orgId);

        if (error) {
            console.error("Error fetching organization pets:", error);
            document.getElementById('loadingPets').textContent = "Failed to load pets.";
            return;
        }

        // Clear loading state indicator
        petsContainer.innerHTML = '';

        if (!linkedPets || linkedPets.length === 0) {
            petsContainer.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-500 bg-[#12161c] rounded-2xl border border-dashed border-gray-800">
                    No pets listed under this organization at the moment.
                </div>`;
            return;
        }

        // Map and render out the custom responsive pet cards
        linkedPets.forEach(item => {
            const pet = item.pets;
            if (!pet) return; // Guard statement if pet data is corrupt

            const card = document.createElement('div');
            card.className = "bg-[#12161c] border border-gray-800 rounded-2xl overflow-hidden hover:border-orange-500/50 transition duration-300 flex flex-col justify-between";
            
            card.innerHTML = `
                <div>
                    <img src="${pet.image_url || 'https://unsplash.com'}" 
                         class="w-full h-48 object-cover" alt="${pet.name}">
                    <div class="p-4">
                        <div class="flex justify-between items-center mb-1">
                            <h3 class="font-bold text-lg text-white">${pet.name}</h3>
                            <span class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                pet.status === 'Adopted' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'
                            }">
                                ${pet.status || 'Available'}
                            </span>
                        </div>
                        <p class="text-gray-400 text-sm">${pet.breed || 'Unknown Breed'}</p>
                    </div>
                </div>
                <div class="p-4 pt-0">
                    <a href="pet-details.html?id=${pet.id}" class="block text-center w-full bg-[#161b22] hover:bg-orange-500 text-white font-semibold text-sm py-2.5 rounded-xl transition duration-300">
                        View Details
                    </a>
                </div>
            `;
            petsContainer.appendChild(card);
        });
    }

    // Execute functions concurrently
    await Promise.all([
        loadOrganizationDetails(),
        loadOrganizationPets()
    ]);
});
