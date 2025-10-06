# Supabase Setup Guide

This guide will help you connect your local Supabase configuration to your existing Supabase instance.

## Prerequisites

✅ Supabase CLI is installed (`npm install -D supabase`)
✅ Supabase project is initialized (`supabase init`)
✅ Edge functions are copied to `supabase/functions/`

## Step 1: Get Your Project Information

You'll need the following from your Supabase dashboard:

1. **Project Reference ID** - Found in your project URL: `https://[project-ref].supabase.co`

   - Based on your error logs, your project ref appears to be: `[project-url]`

2. **Database Password** - Your database password (you set this when creating the project)

3. **API Keys** - Found in Settings > API:
   - `anon` key (public key)
   - `service_role` key (secret key)

## Step 2: Link to Your Supabase Project

Run this command and follow the prompts:

```bash
bunx supabase link --project-ref [project-url]
```

You'll be asked to:

1. Enter your database password
2. Confirm the link

Alternative - if you need to login first:

```bash
# Login to Supabase (opens browser)
bunx supabase login

# Then link
bunx supabase link --project-ref [project-url]
```

## Step 3: Update Your .env File

Add these variables to your `.env` file (copy from `.env.example`):

```bash
# Supabase Configuration
SUPABASE_ENDPOINT=https://[project-url].supabase.co
SUPABASE_MASTER_API_KEY=your_service_role_key_here
```

Get your `service_role` key from: https://supabase.com/dashboard/project/[project-url]/settings/api

## Step 4: Verify the Setup

Check that everything is connected:

```bash
bunx supabase status
```

You should see your project information and connected services.

## Step 5: Deploy Edge Functions

Deploy all three edge functions:

```bash
bunx supabase functions deploy films --no-verify-jwt
bunx supabase functions deploy developers --no-verify-jwt
bunx supabase functions deploy combinations --no-verify-jwt
```

Or deploy all at once:

```bash
npm run supabase:deploy
```

## Step 6: Test Your Deployment

Test each endpoint to verify they're working:

```bash
# Test films
curl "https://[project-url].supabase.co/functions/v1/films?limit=2"

# Test developers
curl "https://[project-url].supabase.co/functions/v1/developers?limit=2"

# Test combinations
curl "https://[project-url].supabase.co/functions/v1/combinations?limit=2"
```

## Quick Commands Reference

```bash
# Login to Supabase
bunx supabase login

# Link to project
bunx supabase link --project-ref [project-url]

# Check status
bunx supabase status

# Deploy a specific function
bunx supabase functions deploy <function-name> --no-verify-jwt

# Deploy all functions
npm run supabase:deploy

# View function logs
bunx supabase functions logs <function-name>

# Serve functions locally for testing
bunx supabase functions serve
```

## Troubleshooting

### "Not logged in"

```bash
bunx supabase login
# Follow browser authentication flow
```

### "Project not linked"

```bash
bunx supabase link --project-ref [project-url]
```

### "Cannot find project"

- Verify your project ref is correct in the Supabase dashboard URL
- Make sure you're logged in with the correct account

### "Deployment failed"

- Check function logs: `bunx supabase functions logs <function-name>`
- Verify your function code has no syntax errors
- Ensure environment variables are set correctly

## Directory Structure

After setup, your directory should look like:

```
supabase/
├── .gitignore
├── config.toml              # Supabase configuration
├── SETUP.md                 # This file
└── functions/
    ├── films/
    │   └── index.ts
    ├── developers/
    │   └── index.ts
    └── combinations/
        └── index.ts
```

## Security Notes

⚠️ **NEVER commit these to git:**

- `.env` file (contains secrets)
- `service_role` key (has admin access)

✅ **Safe to commit:**

- `supabase/config.toml`
- `supabase/functions/**/*.ts`
- `.env.example`

## Next Steps

Once deployed and tested:

1. The Vercel API proxies will automatically use the updated Supabase functions
2. The @dorkroom/api library will work correctly with search and filtering
3. Your development recipes page will load without 500 errors

## Need Help?

- Supabase Docs: https://supabase.com/docs/guides/functions
- Supabase CLI Docs: https://supabase.com/docs/reference/cli/introduction
