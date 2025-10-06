# Deployment Checklist

Use this checklist to deploy your Supabase edge functions.

## ✅ Pre-Deployment Checklist

- [x] Supabase CLI installed (`supabase` in devDependencies)
- [x] Project initialized (`supabase/config.toml` exists)
- [x] Functions copied to `supabase/functions/`
- [x] Deployment scripts added to `package.json`
- [x] `.gitignore` updated for Supabase files

## 🚀 Deployment Steps

### Step 1: Authentication

- [ ] Run `npm run supabase:login`
- [ ] Browser opens for authentication
- [ ] Login successful
- [ ] Token saved locally

### Step 2: Project Linking

- [ ] Run `npm run supabase:link`
- [ ] Enter database password when prompted
- [ ] Project linked successfully (ukpdbjhbudgsjqsxlays)
- [ ] Run `npm run supabase:status` to verify

### Step 3: Deploy Functions

- [ ] Run `npm run supabase:deploy`
- [ ] Films function deployed ✅
- [ ] Developers function deployed ✅
- [ ] Combinations function deployed ✅

### Step 4: Deploy Vercel Proxy Functions

- [ ] Run `vercel --prod` (or deploy via Vercel dashboard/git commit)
- [ ] Vercel proxy functions deployed
- [ ] Proxy functions abstract Supabase edge functions
- [ ] Verify deployment URLs match expected paths

### Step 5: Verification

- [ ] Test films endpoint: `curl "https://dorkroom.art/api/films?limit=2"`
- [ ] Test developers endpoint: `curl "https://dorkroom.art/api/developers?limit=2"`
- [ ] Test combinations endpoint: `curl "https://dorkroom.art/api/combinations?limit=2"`
- [ ] All tests return data (not errors)

### Step 6: Application Testing

- [ ] Visit development recipes page
- [ ] Page loads without 500 errors
- [ ] Search functionality works
- [ ] Filters work correctly
- [ ] Data displays properly

## 📊 Post-Deployment Monitoring

### Check Function Logs

- [ ] Run `npm run supabase:logs:films`
- [ ] Run `npm run supabase:logs:developers`
- [ ] Run `npm run supabase:logs:combinations`
- [ ] No errors in logs

### Verify API Responses

- [ ] Films API returns `{data: [...], count: N}` format
- [ ] Developers API returns `{data: [...], count: N}` format
- [ ] Combinations API returns `{data: [...], count: N}` format

### Test New Features

- [ ] Search works: `?query=kodak`
- [ ] Fuzzy search works: `?query=velvi&fuzzy=true`
- [ ] Limit works: `?limit=5`
- [ ] Filters work: `?colorType=bw&brand=Kodak`

## 🔧 Troubleshooting Checklist

If something goes wrong:

### Authentication Issues

- [ ] Run `npm run supabase:login` again
- [ ] Check browser opened correctly
- [ ] Verify correct Supabase account

### Linking Issues

- [ ] Verify project ref: `ukpdbjhbudgsjqsxlays`
- [ ] Check database password is correct
- [ ] Run `npm run supabase:status` to verify

### Deployment Issues

- [ ] Check function syntax (no TypeScript errors)
- [ ] View logs: `npm run supabase:logs:<function-name>`
- [ ] Check Supabase dashboard for errors
- [ ] Verify environment variables set

### API Issues

- [ ] Check Vercel logs for proxy errors
- [ ] Test direct Supabase endpoint
- [ ] Compare with working curl examples
- [ ] Check CORS headers

## 📝 Maintenance Checklist

### Regular Tasks

- [ ] Monitor function logs weekly
- [ ] Check for Supabase CLI updates
- [ ] Review API usage in dashboard
- [ ] Update functions when schema changes

### When Making Changes

- [ ] Edit function in `supabase/functions/<name>/index.ts`
- [ ] Test locally: `npm run supabase:serve`
- [ ] Deploy: `npm run supabase:deploy:<name>`
- [ ] Monitor logs: `npm run supabase:logs:<name>`
- [ ] Copy to reference: `cp supabase/functions/*/index.ts supabase-functions/*/`
- [ ] Test in production
- [ ] Commit changes to git

## ✅ Success Criteria

You've successfully deployed when:

- ✅ All three commands run without errors
- ✅ All API endpoints return data (not 500 errors)
- ✅ Development recipes page loads correctly
- ✅ Search and filtering work as expected
- ✅ No errors in Supabase function logs
- ✅ Vercel logs show successful API calls

## 🎉 Completion

Once all checkboxes are marked:

1. Your Supabase functions are deployed ✅
2. API search and filtering works ✅
3. Development recipes page is fixed ✅
4. Everything is properly documented ✅

---

**Current Status:** Ready for deployment

**Next Action:** Run `npm run supabase:login`

**Documentation:** See [SUPABASE_DEPLOYMENT.md](../SUPABASE_DEPLOYMENT.md) for details
