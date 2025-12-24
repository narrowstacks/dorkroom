# Dorkroom App

Main React application for analog photography calculations.

## E2E Testing

E2E tests use Playwright with Chromatic for visual regression testing.

### Snapshots

Snapshots are platform-specific (generated on Ubuntu in CI). To update locally:

```bash
bun run test:e2e --update-snapshots
```

Note: Local snapshots may differ from CI due to font rendering differences between macOS and Linux.
