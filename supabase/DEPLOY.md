# Supabase Edge Functions - Deployment Workflow

## Quick Start

### 1. Login to Supabase (one-time)
```bash
npm run supabase:login
```
This will open a browser for authentication.

### 2. Link to Your Project (one-time)
```bash
npm run supabase:link
```
You'll need your database password.

### 3. Deploy All Functions
```bash
npm run supabase:deploy
```

That's it! Your edge functions are now deployed.

## Available Commands

### Deployment
```bash
# Deploy all edge functions at once
npm run supabase:deploy

# Deploy individual functions
npm run supabase:deploy:films
npm run supabase:deploy:developers
npm run supabase:deploy:combinations
```

### Monitoring
```bash
# View function logs
npm run supabase:logs:films
npm run supabase:logs:developers
npm run supabase:logs:combinations

# Check project status
npm run supabase:status
```

### Local Development
```bash
# Serve functions locally for testing
npm run supabase:serve
```

## Step-by-Step Deployment

### First Time Setup

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Login to Supabase**:
   ```bash
   npm run supabase:login
   ```
   - Opens browser for authentication
   - Login with your Supabase account

3. **Link to your project**:
   ```bash
   npm run supabase:link
   ```
   - Enter database password when prompted
   - Project ref is already configured: `ukpdbjhbudgsjqsxlays`

4. **Verify connection**:
   ```bash
   npm run supabase:status
   ```
   - Should show your project details and services

### Deploy Edge Functions

**Option A: Deploy all at once** (recommended)
```bash
npm run supabase:deploy
```

**Option B: Deploy one at a time**
```bash
npm run supabase:deploy:films
npm run supabase:deploy:developers
npm run supabase:deploy:combinations
```

### Verify Deployment

Test each endpoint:

```bash
# Test films
curl "https://ukpdbjhbudgsjqsxlays.supabase.co/functions/v1/films?limit=2"

# Test developers
curl "https://ukpdbjhbudgsjqsxlays.supabase.co/functions/v1/developers?limit=2"

# Test combinations
curl "https://ukpdbjhbudgsjqsxlays.supabase.co/functions/v1/combinations?limit=2"
```

Or test through Vercel proxy:

```bash
# Test films with search
curl "https://dorkroom.art/api/films?query=kodak&limit=2"

# Test developers with filter
curl "https://dorkroom.art/api/developers?manufacturer=Ilford"

# Test combinations
curl "https://dorkroom.art/api/combinations?limit=5"
```

## Monitoring & Debugging

### View Real-time Logs

```bash
# Films function logs
npm run supabase:logs:films

# Developers function logs
npm run supabase:logs:developers

# Combinations function logs
npm run supabase:logs:combinations
```

### Check Deployment Status

```bash
npm run supabase:status
```

This shows:
- Project info
- Database status
- Edge function status
- Service URLs

## Local Testing

Before deploying, test functions locally:

```bash
# Start local Supabase services
npm run supabase:serve
```

Then test against local endpoints:
```bash
curl "http://localhost:54321/functions/v1/films?limit=2"
```

## Continuous Deployment

### Automatic Deployment on Git Push

To set up automatic deployment when you push to main:

1. **Get your access token**:
   ```bash
   bunx supabase projects access-tokens create "GitHub Actions"
   ```

2. **Add to GitHub Secrets**:
   - Go to your repo → Settings → Secrets and variables → Actions
   - Add secret: `SUPABASE_ACCESS_TOKEN`
   - Paste the token from step 1

3. **Create workflow file** `.github/workflows/deploy-supabase.yml`:
   ```yaml
   name: Deploy Supabase Functions

   on:
     push:
       branches: [main]
       paths:
         - 'supabase/functions/**'

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4

         - uses: supabase/setup-cli@v1
           with:
             version: latest

         - name: Deploy to Supabase
           env:
             SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
             PROJECT_ID: ukpdbjhbudgsjqsxlays
           run: |
             supabase functions deploy films --project-ref $PROJECT_ID --no-verify-jwt
             supabase functions deploy developers --project-ref $PROJECT_ID --no-verify-jwt
             supabase functions deploy combinations --project-ref $PROJECT_ID --no-verify-jwt
   ```

Now functions auto-deploy when you push changes to `supabase/functions/` on main branch.

## Troubleshooting

### "Not logged in"
```bash
npm run supabase:login
```

### "Project not linked"
```bash
npm run supabase:link
```

### "Function deployment failed"
1. Check function logs:
   ```bash
   npm run supabase:logs:<function-name>
   ```
2. Verify syntax in the function file
3. Check Supabase dashboard for errors

### "Cannot connect to project"
1. Verify project ref: `ukpdbjhbudgsjqsxlays`
2. Check internet connection
3. Verify you're logged in to correct Supabase account

### "Environment variables missing"
The following are automatically available in Supabase Edge Functions:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No manual configuration needed!

## Development Workflow

### Making Changes

1. **Edit function code** in `supabase/functions/<name>/index.ts`

2. **Test locally** (optional):
   ```bash
   npm run supabase:serve
   curl "http://localhost:54321/functions/v1/<name>?..."
   ```

3. **Deploy**:
   ```bash
   npm run supabase:deploy:<name>
   ```

4. **Monitor**:
   ```bash
   npm run supabase:logs:<name>
   ```

5. **Verify**:
   ```bash
   curl "https://ukpdbjhbudgsjqsxlays.supabase.co/functions/v1/<name>?..."
   ```

### Syncing Reference Files

Keep `supabase-functions/` in sync with deployed `supabase/functions/`:

```bash
# After editing a function in supabase/functions/
cp supabase/functions/films/index.ts supabase-functions/films/
cp supabase/functions/developers/index.ts supabase-functions/developers/
cp supabase/functions/combinations/index.ts supabase-functions/combinations/
```

Or create a sync script in package.json:
```json
"supabase:sync": "cp supabase/functions/*/index.ts supabase-functions/*/"
```

## File Structure

```
supabase/
├── config.toml                    # Supabase configuration
├── SETUP.md                       # Initial setup guide
├── DEPLOY.md                      # This file - deployment guide
└── functions/                     # Edge functions (deployed)
    ├── films/
    │   └── index.ts
    ├── developers/
    │   └── index.ts
    └── combinations/
        └── index.ts

supabase-functions/               # Reference copies (not deployed)
├── DEPLOYMENT.md                 # Original deployment guide
├── NOTE.md                       # Important notes
├── films/
│   └── index.ts
├── developers/
│   └── index.ts
└── combinations/
    └── index.ts
```

## Security Checklist

✅ `.env` is in `.gitignore`
✅ Service role key is NOT committed
✅ Functions use `--no-verify-jwt` (public access)
✅ Query parameters are validated in functions
✅ CORS headers are properly configured

## What's Next?

After successful deployment:

1. ✅ Vercel API proxies will use updated Supabase functions
2. ✅ @dorkroom/api library will work with search/filtering
3. ✅ Development recipes page will load without errors
4. ✅ All API endpoints support new query parameters

## Need Help?

- 📚 [Supabase Functions Docs](https://supabase.com/docs/guides/functions)
- 🛠️ [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)
- 💬 [Supabase Discord](https://discord.supabase.com/)
