document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('createOrgForm');
    const msgDiv = document.getElementById('formMsg');

    // Helper to clear and display status messages
    function showMessage(text, isError = false) {
        msgDiv.textContent = text;
        msgDiv.className = isError 
            ? "text-red-400 bg-red-500/10 p-3 rounded-xl text-sm block" 
            : "text-green-400 bg-green-500/10 p-3 rounded-xl text-sm block";
    }

    // Helper function to generate clean URL slugs
    function generateSlug(text) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')         // Replace spaces with -
            .replace(/[^\w\-]+/g, '')     // Remove all non-word chars
            .replace(/\-\-+/g, '-');      // Replace multiple - with single -
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 1. Get the current logged-in user from Supabase auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            showMessage("You must be logged in to create an organization.", true);
            return;
        }

        // 2. Extract values from input fields
        const name = document.getElementById('orgName').value.trim();
        const description = document.getElementById('orgDescription').value.trim();
        const website = document.getElementById('orgWebsite').value.trim();
        const avatar_url = document.getElementById('orgAvatar').value.trim();
        const slug = generateSlug(name);

        try {
            // 3. Insert new row into the organizations table
            const { data, error } = await supabase
                .from('organizations')
                .insert([
                    {
                        name: name,
                        slug: slug,
                        description: description || null,
                        website: website || null,
                        avatar_url: avatar_url || null,
                        owner_id: user.id // Connected to current user
                    }
                ])
                .select()
                .single();

            if (error) {
                // Handle unique constraint fail for slug
                if (error.code === '23505') {
                    showMessage("An organization with this name or a similar slug already exists.", true);
                } else {
                    showMessage(`Error: ${error.message}`, true);
                }
                return;
            }

            // Success! The database trigger (v1.1) automatically inserted the user as 'owner' in organization_members.
            showMessage("Organization successfully registered! Redirecting...");
            form.reset();

            // Redirect to dashboard after a brief delay
            setTimeout(() => {
                window.location.href = `organization-dashboard.html?id=${data.id}`;
            }, 2000);

        } catch (err) {
            showMessage("An unexpected network error occurred.", true);
            console.error(err);
        }
    });
});
