# Dorkroom App

Main React application for analog photography calculations.

## E2E Testing

E2E tests use Playwright with Chromatic for visual regression testing.

### How it works

1. Playwright runs functional tests (page loads, elements visible)
2. Chromatic automatically captures screenshots at the end of each test
3. Chromatic compares screenshots on consistent cloud infrastructure (no platform differences)
4. Visual changes are reviewed in Chromatic's UI

### Running locally

```bash
bun run test:e2e
```

Note: Chromatic visual comparison only runs in CI. Local runs verify functional behavior only.
