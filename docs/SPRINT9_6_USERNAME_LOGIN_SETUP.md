# Username login setup

In Vercel, open **Project Settings -> Environment Variables** and add:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Copy the values from Supabase **Project Settings -> API**. The service-role key is secret and must exist only in Vercel. Redeploy after saving the variables.

Registration still requests an email for confirmation and password recovery. Normal login requests only username and password.
