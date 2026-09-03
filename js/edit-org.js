document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get('id');

    if (!orgId) {
        alert("No Organization ID specified.");
        window.location.href = "index.html";
        return;
    }

    const form = document.getElementById('editOrgForm');
    const msgDiv = document.getElementById('updateMsg');
    
    document.getElementById('viewLiveProfile').href = `organization-profile.html?id=${orgId}`;

    function showStatus(text, isError = false) {
        msgDiv.textContent = text;
        msgDiv.className = isError 
            ? "text-red-400 bg-red-500/10 p-3 rounded-xl text-sm block" 
            : "text-green-400 bg-green-500/10 p-3 rounded-xl text-sm block";
    }

    async function loadCurrentData() {
        const { data: org, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single();

        if (error || !org) {
            showStatus("Error loading organization data.", true);
            return;
        }

        document.getElementById('editOrgName').value = org.name;
        document.getElementById('editOrgDescription').value = org.description || '';
        document.getElementById('editOrgWebsite').value = org.website || '';
        document.getElementById('editOrgAvatar').value = org.avatar_url || '';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showStatus("You must be logged in to update this profile.", true);
            window.location.href = "pages/login.html";
            return;
        }

        const updatedName = document.getElementById('editOrgName').value.trim();
        const updatedDescription = document.getElementById('editOrgDescription').value.trim();
        const updatedWebsite = document.getElementById('editOrgWebsite').value.trim();
        const updatedAvatar = document.getElementById('editOrgAvatar').value.trim();

        const { error } = await supabase
            .from('organizations')
            .update({
                name: updatedName,
                description: updatedDescription || null,
                website: updatedWebsite || null,
                avatar_url: updatedAvatar || null
            })
            .eq('id', orgId);

        if (error) {
            showStatus(`Update failed: ${error.message}`, true);
        } else {
            showStatus("Profile settings updated successfully!");
            setTimeout(() => { msgDiv.classList.add('hidden'); }, 3000);
        }
    });

    loadCurrentData();
});
