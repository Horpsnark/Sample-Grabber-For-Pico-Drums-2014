# Have a Grate Tour

1965 -> 1995 interactive tour survival game built with React, TypeScript, and Vite, configured to run statically on **GitHub Pages**.

## Play on GitHub Pages

### Option 1: GitHub Actions (Recommended)
1. Push this repository to GitHub (`main` or `master` branch).
2. In your repository, go to **Settings -> Pages**.
3. Under **Build and deployment -> Source**, select **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` builds the Vite app (`npm run build`) with relative asset paths (`base: './'`) and publishes `./dist` automatically on every push.

### Option 2: Branch `/docs` folder (Zero-build fallback)
1. In your repository, go to **Settings -> Pages**.
2. Under **Build and deployment -> Source**, select **Deploy from a branch**, choose your branch, and select **`/docs`**.
3. GitHub Pages serves the self-contained standalone version in `docs/index.html`.

## Browser Storage & Sharing
- **Auto-save & High Scores**: Active tours and your Top 10 best tours are persisted automatically in `localStorage`.
- **Challenge Links**: Shareable `?challenge=...` links let friends load your tour score directly into their local leaderboard without any backend server.
- **On the Road Live Presence**: Open tabs/windows of the app on the same origin sync live via `BroadcastChannel` and `localStorage`.

## Local Development
```bash
npm install
npm run dev
```

Build for production:
```bash
npm run build
```
