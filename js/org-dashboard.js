document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get('id');

    if (!orgId) {
        alert("No Organization ID provided!");
        window.location.href = "index.html";
        return;
    }

    // Connect link back to public view profile
    document.getElementById('viewPublicProfile').href = `organization-profile.html?id=${orgId}`;

    // 1. Verify User Session & Initialize Dashboard Layout
    async function initDashboard() {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            alert("Please login to view this workspace.");
            window.location.href = "login.html";
            return;
        }

        // Fetch Org metadata to update title
        const { data: org } = await supabase.from('organizations').select('name').eq('id', orgId).single();
        if (org) {
            document.getElementById('dashboardTitle').textContent = `${org.name} Workspace`;
        }

        // Load tables
        loadDashboardPets();
        loadDashboardMembers();
    }

    // 2. Fetch and List Connected Pet Records
    async function loadDashboardPets() {
        const { data: linkedPets, error } = await supabase
            .from('organization_pets')
            .select(`
                pet_id,
                pets (id, name, breed, status, image_url)
            `)
            .eq('organization_id', orgId);

        const tbody = document.getElementById('dashboardPetsList');
        if (error || !linkedPets) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-400">Error loading repository data.</td></tr>`;
            return;
        }

        document.getElementById('petCount').textContent = linkedPets.length;
        tbody.innerHTML = '';

        if (linkedPets.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-500">No pets linked to this organization yet.</td></tr>`;
            return;
        }

        linkedPets.forEach(item => {
            const pet = item.pets;
            if (!pet) return;

            const row = document.createElement('tr');
            row.className = "border-b border-gray-800/50 hover:bg-gray-800/10 transition";
            row.innerHTML = `
                <td class="px-4 py-3 flex items-center gap-3">
                    <img src="${pet.image_url || 'https://unsplash.com'}" class="w-10 h-10 rounded-xl object-cover">
                    <span class="font-bold text-white">${pet.name}</span>
                </td>
                <td class="px-4 py-3 text-gray-300">${pet.breed || 'N/A'}</td>
                <td class="px-4 py-3">
                    <span class="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">${pet.status || 'Available'}</span>
                </td>
                <td class="px-4 py-3 text-right">
                    <button onclick="unlinkPet('${pet.id}')" class="text-xs text-red-400 hover:text-red-500 font-bold transition">Remove link</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // 3. Fetch and Render Staff Team Roll
    async function loadDashboardMembers() {
        const { data: members, error } = await supabase
            .from('organization_members')
            .select('user_id, role, joined_at')
            .eq('organization_id', orgId);

        const container = document.getElementById('dashboardMembersList');
        if (error || !members) {
            container.innerHTML = `<p class="text-sm text-red-400">Failed to sync staff records.</p>`;
            return;
        }

        document.getElementById('memberCount').textContent = members.length;
        container.innerHTML = '';

        members.forEach(member => {
            const card = document.createElement('div');
            card.className = "flex justify-between items-center bg-[#161b22] border border-gray-800 px-4 py-3 rounded-xl";
            card.innerHTML = `
                <div>
                    <p class="text-xs font-mono text-gray-400">User: ${member.user_id.substring(0,8)}...</p>
                    <p class="text-[11px] text-gray-500">Joined: ${new Date(member.joined_at).toLocaleDateString()}</p>
                </div>
                <span class="text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                    member.role === 'owner' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                    member.role === 'admin' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                }">${member.role}</span>
            `;
            container.appendChild(card);
        });
    }

    // 4. Form Submission: Connect an Existing Pet to the Organization
    document.getElementById('linkPetForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const petId = document.getElementById('petIdInput').value.trim();
        const msg = document.getElementById('petLinkMsg');

        const { error } = await supabase
            .from('organization_pets')
            .insert([{ organization_id: orgId, pet_id: petId }]);

        msg.classList.remove('hidden');
        if (error) {
            msg.textContent = `Authorization Error: Role restrictions apply or invalid ID.`;
            msg.className = "text-xs text-red-400 mt-2";
        } else {
            msg.textContent = "Pet successfully connected to repository!";
            msg.className = "text-xs text-green-400 mt-2";
            document.getElementById('petIdInput').value = '';
            loadDashboardPets();
        }
    });

    // Window global access function to drop pet relations
    window.unlinkPet = async (petId) => {
        if (!confirm("Are you sure you want to remove this pet link?")) return;

        const { error } = await supabase
            .from('organization_pets')
            .delete()
            .eq('organization_id', orgId)
            .eq('pet_id', petId);

        if (error) {
            alert(`Error: You lack permissions to unlink records.`);
        } else {
            loadDashboardPets();
        }
    }

    // Run Initialization execution hook
    initDashboard();
});
