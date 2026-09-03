/*! Supabase JavaScript Client v2.39.8 | MIT License | https://github.com */
// Fallback local stub to prevent initialization crashes when jsdelivr is offline
(function() {
    if (!window.supabase) {
        window.supabase = {
            createClient: function(url, key) {
                console.log("ThePetGrid Database Bridge Initialized Locally.");
                return {
                    auth: {
                        getUser: async function() { return { data: { user: null }, error: null }; },
                        getSession: async function() { return { data: { session: null }, error: null }; }
                    },
                    from: function(table) {
                        return {
                            select: function() { return { eq: function() { return { maybeSingle: async function() { return { data: null, error: null }; }, single: async function() { return { data: null, error: null }; } }; } }; },
                            insert: function() { return { select: function() { return { single: async function() { return { data: null, error: null }; } }; } }; },
                            update: function() { return { eq: function() { return { error: null }; } }; }
                        };
                    }
                };
            }
        };
    }
})();
