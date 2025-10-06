# Supabase Edge Functions

Edge functions for the Dorkroom API with search and filtering capabilities.

## 🚀 Quick Deploy

```bash
# 1. Login (first time only)
npm run supabase:login

# 2. Link project (first time only)
npm run supabase:link

# 3. Deploy all functions
npm run supabase:deploy
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run supabase:login` | Login to Supabase |
| `npm run supabase:link` | Link to project |
| `npm run supabase:status` | Check project status |
| `npm run supabase:deploy` | Deploy all functions |
| `npm run supabase:deploy:films` | Deploy films function |
| `npm run supabase:deploy:developers` | Deploy developers function |
| `npm run supabase:deploy:combinations` | Deploy combinations function |
| `npm run supabase:logs:films` | View films logs |
| `npm run supabase:logs:developers` | View developers logs |
| `npm run supabase:logs:combinations` | View combinations logs |
| `npm run supabase:serve` | Serve locally |

## 📁 Functions

### Films (`/films`)
Search and filter film stocks.

**Query Parameters:**
- `query` - Search term
- `fuzzy` - Fuzzy search (true/false)
- `limit` - Max results
- `colorType` - Filter by color type
- `brand` - Filter by brand

**Example:**
```bash
curl "https://dorkroom.art/api/films?query=kodak&limit=5"
```

### Developers (`/developers`)
Search and filter developers.

**Query Parameters:**
- `query` - Search term
- `fuzzy` - Fuzzy search (true/false)
- `limit` - Max results
- `type` - Filter by type
- `manufacturer` - Filter by manufacturer

**Example:**
```bash
curl "https://dorkroom.art/api/developers?manufacturer=Ilford"
```

### Combinations (`/combinations`)
Search and filter development combinations.

**Query Parameters:**
- `film` - Filter by film slug
- `developer` - Filter by developer slug
- `query` - Search term
- `fuzzy` - Fuzzy search (true/false)
- `limit` - Max results
- `count` - Results per page
- `page` - Page number
- `id` - Specific combination

**Example:**
```bash
curl "https://dorkroom.art/api/combinations?film=ilford-hp5-plus&limit=5"
```

## 🔗 URLs

- **Production:** `https://ukpdbjhbudgsjqsxlays.supabase.co/functions/v1/`
- **Via Vercel:** `https://dorkroom.art/api/`
- **Local:** `http://localhost:54321/functions/v1/`

## 📚 Documentation

- [SETUP.md](./SETUP.md) - Initial setup guide
- [DEPLOY.md](./DEPLOY.md) - Complete deployment guide

## 🔧 Project Info

- **Project Ref:** `ukpdbjhbudgsjqsxlays`
- **Project URL:** https://ukpdbjhbudgsjqsxlays.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/ukpdbjhbudgsjqsxlays

## 🧪 Testing

```bash
# Direct to Supabase
curl "https://ukpdbjhbudgsjqsxlays.supabase.co/functions/v1/films?limit=2"

# Through Vercel proxy
curl "https://dorkroom.art/api/films?query=kodak&limit=2"

# Local testing
npm run supabase:serve
curl "http://localhost:54321/functions/v1/films?limit=2"
```

## 📝 File Structure

```
supabase/
├── README.md           # This file
├── SETUP.md           # Initial setup
├── DEPLOY.md          # Deployment guide
├── config.toml        # Configuration
└── functions/         # Edge functions
    ├── films/
    ├── developers/
    └── combinations/
```

## ⚡ What Changed

All endpoints now support:
- ✅ Search with `query` parameter
- ✅ Fuzzy matching with `fuzzy=true`
- ✅ Result limiting with `limit`
- ✅ Enhanced filtering options
- ✅ Consistent response format

## 🐛 Troubleshooting

**Not logged in?**
```bash
npm run supabase:login
```

**Project not linked?**
```bash
npm run supabase:link
```

**Deployment failed?**
```bash
npm run supabase:logs:<function-name>
```

## 🔐 Security

- ✅ Functions use `--no-verify-jwt` (public access)
- ✅ Query parameters are validated
- ✅ CORS properly configured
- ✅ Service role key is NOT committed
