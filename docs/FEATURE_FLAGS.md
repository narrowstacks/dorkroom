# Feature Flags

Dorkroom uses feature flags to control the availability of certain features. Feature flags can be configured via environment variables.

## Available Feature Flags

### INFOBASE

Controls access to the MDX-based Infobase/wiki system.

- **Environment Variable:** `VITE_FEATURE_INFOBASE`
- **Default in Development:** `true`
- **Default in Production:** `false`
- **Values:** `'true'`, `'1'` (enabled) or `'false'`, `'0'` (disabled)

When disabled, users will see a "Coming Soon" page instead of the full Infobase.

### CUSTOM_RECIPE_SHARING

Enables sharing of user-created custom recipes.

- **Default in Development:** `true`
- **Default in Production:** `false`

### RECIPE_IMPORT

Enables importing recipes from shared URLs.

- **Default in Development:** `true`
- **Default in Production:** `true`

### ADVANCED_CHEMISTRY_CALCULATOR

Enables advanced chemistry calculation features.

- **Default in Development:** `true`
- **Default in Production:** `true`

## Configuration

### Using Environment Variables

Create a `.env.local` file in the project root:

```bash
# Enable Infobase feature
VITE_FEATURE_INFOBASE=true

# Disable Infobase feature
# VITE_FEATURE_INFOBASE=false
```

### In Code

```typescript
import { useFeatureFlags } from '@dorkroom/logic';

function MyComponent() {
  const { isInfobaseEnabled } = useFeatureFlags();

  if (isInfobaseEnabled) {
    // Show infobase content
  }

  return <div>...</div>;
}
```

Or use the generic method:

```typescript
const { isEnabled } = useFeatureFlags();

if (isEnabled('INFOBASE')) {
  // Show infobase content
}
```

## Adding New Feature Flags

1. **Update the interface** in `packages/logic/src/constants/feature-flags.ts`:

   ```typescript
   export interface FeatureFlags {
     // ... existing flags
     MY_NEW_FEATURE: boolean;
   }
   ```

2. **Add to development and production configs**:

   ```typescript
   const DEVELOPMENT_FLAGS: FeatureFlags = {
     // ... existing flags
     MY_NEW_FEATURE: getEnvFlag(import.meta.env?.VITE_FEATURE_MY_NEW_FEATURE, true),
   };

   const PRODUCTION_FLAGS: FeatureFlags = {
     // ... existing flags
     MY_NEW_FEATURE: getEnvFlag(import.meta.env?.VITE_FEATURE_MY_NEW_FEATURE, false),
   };
   ```

3. **Add description**:

   ```typescript
   export const FEATURE_FLAG_DESCRIPTIONS: Record<keyof FeatureFlags, string> = {
     // ... existing descriptions
     MY_NEW_FEATURE: 'Description of my new feature',
   };
   ```

4. **Add convenience property** in `packages/logic/src/hooks/use-feature-flags.ts`:

   ```typescript
   const isMyNewFeatureEnabled = useMemo(() => flags.MY_NEW_FEATURE, [flags.MY_NEW_FEATURE]);

   return {
     // ... existing return values
     isMyNewFeatureEnabled,
   };
   ```

5. **Use in components**:
   ```typescript
   const { isMyNewFeatureEnabled } = useFeatureFlags();
   ```

## Best Practices

- Use feature flags for:

  - Features in active development
  - Features that need gradual rollout
  - Features that may need quick rollback
  - A/B testing variations

- Remove feature flags when:

  - Feature is stable and fully released
  - Feature is permanently enabled/disabled
  - The code paths are well-tested in production

- Always provide good default values:
  - Development: Enable new features for testing
  - Production: Disable until ready for release
