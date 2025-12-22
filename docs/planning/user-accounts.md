# User Account System for Dorkroom: Analysis & Recommendation

> **TL;DR**: Adding accounts enables data safety, cross-device sync, and community features—but adds complexity. Recommended approach: **Optional accounts with local-first sync** (app works without login, accounts are opt-in). Start with Phase 0 (export/import) to validate demand.

---

## Executive Summary

### The Question
Should Dorkroom add user accounts to save border calculator presets, custom recipes, and favorites?

### Current State
- **Storage**: localStorage only (browser-specific, lost on cache clear)
- **Backend**: Supabase Edge Functions + PostgreSQL (auth not enabled)
- **User data**: Border presets, custom recipes, favorites, preferences

### Recommendation
**Optional accounts with local-first architecture**:
- App fully functional without login (no friction for casual users)
- Accounts opt-in for power users who want sync + community
- localStorage remains primary (instant, offline-capable)
- Cloud syncs in background (backup, cross-device)

### Quick Path Forward
1. **Phase 0** (1-2 days): Add export/import to validate demand
2. **Phase 1-2** (4-6 weeks): Auth + sync engine
3. **Phase 3** (3-4 weeks): Community features (defer until validated)

---

## Part 1: Pros & Cons

### Arguments FOR User Accounts

| Category | Benefits |
|----------|----------|
| **Data Safety** | No data loss on cache clear, device switch, or browser change |
| **Cross-Device** | Same recipes/presets at home and in the darkroom |
| **Community** | Recipe discovery, ratings, attribution, public profiles |
| **Business** | User analytics, engagement metrics, monetization potential |
| **Technical** | Supabase ready, data models exist, TanStack Query in place |

### Arguments AGAINST User Accounts

| Category | Concerns |
|----------|----------|
| **UX Friction** | Account fatigue, barrier to casual users, privacy concerns |
| **Complexity** | Auth flows, sync logic, conflict resolution, offline handling |
| **Liability** | Data breach risk, GDPR compliance, ToS/privacy policy |
| **Costs** | Supabase scaling, email infrastructure, support burden |
| **Philosophy** | Simplicity loss, scope creep, analog ethos mismatch |

---

## Part 2: Options Comparison

| Option | Effort | Data Safety | Cross-Device | Community | Maintenance |
|--------|--------|-------------|--------------|-----------|-------------|
| **A: Export/Import** | 1-2 days | Manual backup | Manual transfer | No | None |
| **B: Anonymous Sync** | 1-2 weeks | Auto backup | Yes | No | Low |
| **C: Device Pairing** | 2-3 weeks | Between paired | Yes | No | Medium |
| **D: Optional Accounts** | 4-6 weeks | Auto backup | Yes | Yes | Medium |
| **E: OAuth Only** | 2-3 weeks | Auto backup | Yes | Limited | Medium |

### Option Details

**A: Export/Import**
- JSON download/upload of all user data
- Users back up to iCloud/Google Drive manually
- Zero server changes, zero maintenance
- Good for validating demand before investing more

**B: Anonymous Cloud Sync**
- Generate recovery code (like Signal/Bitwarden)
- No email, no password, no account recovery
- Sync to server keyed by hashed code
- Simple but code loss = data loss

**C: Device Pairing**
- QR code links devices temporarily
- WebRTC or server-mediated sync
- No persistent account, ephemeral pairing
- Complex implementation, limited use case

**D: Optional Accounts (Recommended)**
- App works fully without account
- OAuth login (Google, Apple) for opt-in sync
- Local-first: localStorage primary, cloud backup
- Enables community features later

**E: OAuth Only**
- Skip email/password entirely
- Reduces security surface and support burden
- Simpler than full auth, same benefits as D
- Can be Phase 1 of Option D

---

## Part 3: Recommended Approach

### Architecture: Local-First with Cloud Sync

```
┌─────────────────────────────────────────────────────────┐
│                     React App                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ localStorage │◄──►│ Sync Engine │◄──►│ Supabase    │ │
│  │ (primary)    │    │ (reconcile) │    │ (backup)    │ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Why this works**:
- Writes go to localStorage first (instant, works offline)
- Sync engine pushes to cloud in background (debounced)
- Conflict resolution: Last-write-wins using existing `dateModified`
- On first login: Prompt to merge or replace local data

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth method | OAuth only (Google, Apple) | No password resets, reduced support |
| Sync strategy | Local-first, cloud backup | Works offline, no loading states |
| Conflict resolution | Last-write-wins | Simple, predictable, timestamps exist |
| Data migration | Merge with user prompt | Don't lose existing local data |
| Public sharing | Opt-in per recipe | Privacy by default |

---

## Part 4: Implementation Phases

### Phase 0: Validate Demand (1-2 days)
- Add "Export my data" button (downloads JSON)
- Add "Import data" option (uploads JSON, merges)
- No server changes, no auth, no ongoing maintenance
- Validates whether users actually care about data portability

### Phase 1: Auth Foundation (2-3 weeks)
- Enable Supabase Auth (Google + Apple OAuth)
- Auth context in React with TanStack Query
- Basic login/logout modal (not separate pages)
- User preferences table in Supabase
- "Sign in to sync" prompts on presets/recipes pages

### Phase 2: Sync Engine (2-3 weeks)
- Server tables: `user_recipes`, `user_presets`, `user_favorites`
- Sync service: localStorage ↔ Supabase with conflict resolution
- Migration flow: merge localStorage on first sign-in
- Background sync with retry logic
- Sync status indicator in UI

### Phase 3: Community Features (3-4 weeks)
- Public recipe sharing (opt-in per recipe)
- Recipe discovery page with search/filter
- User profiles (optional display name, bio)
- "Save to my recipes" for public recipes
- Recipe ratings (thumbs up/down)

### Phase 4: Compliance & Polish (1-2 weeks)
- Account settings (delete account, export data)
- Privacy policy and ToS pages
- Onboarding flow for new sign-ups
- Error handling and edge cases

---

## Part 5: Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Sync conflicts confuse users | Medium | Medium | Clear conflict UI, let user choose |
| OAuth provider issues | Low | High | Support multiple providers |
| Data migration bugs | Medium | High | Thorough testing, re-sync ability |
| Scope creep to social network | High | Medium | Strict phase boundaries |
| Low adoption of accounts | Medium | Low | Phase 0 validates demand first |
| GDPR compliance issues | Low | High | Right to deletion, data export |

---

## Part 6: Files to Modify

### Existing Files
- `packages/logic/src/services/local-storage.ts` → hybrid local/cloud storage
- `packages/api/src/dorkroom/client.ts` → authenticated API requests
- `apps/dorkroom/src/routes/__root.tsx` → auth context provider
- `supabase/config.toml` → enable auth

### New Files
- `packages/logic/src/contexts/auth-context.tsx` → auth state management
- `packages/logic/src/services/sync-engine.ts` → localStorage ↔ cloud sync
- `apps/dorkroom/src/components/auth/` → login modal, account settings
- `supabase/migrations/` → user data tables

---

## Decision Framework

| If your priority is... | Start with... |
|------------------------|---------------|
| Just data backup | Phase 0 (export/import) |
| Cross-device sync | Phase 0 → Phase 1-2 |
| Community features | Phase 0 → Phase 1-3 |
| Validate demand first | Phase 0 only, measure usage |
| Minimize maintenance | Phase 0 only |
| Full feature set | All phases |

---

## Questions to Answer Before Proceeding

1. **Validation**: Should we ship Phase 0 first to see if users actually use export/import?
2. **OAuth providers**: Google + Apple, or also GitHub for developer audience?
3. **Migration UX**: Merge local + cloud, or force user to choose one?
4. **Community scope**: Ratings only, or also comments/follows/forums?
5. **Monetization**: Free tier limits? Premium features?
