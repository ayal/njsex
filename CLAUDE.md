# njsex (site) — agent runbook

Public repo → https://ayal.github.io/njsex/ . React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui (Radix). Pure static:
the whole catalog (`public/data/*.jsonl`) loads into memory and is filtered client-side. The data files are generated
offline and committed; this repo only renders them. Never edit `public/data` by hand.

Good-faith stance (README + footer): unofficial, read-only, not affiliated, nothing sold, every listing links to the shop,
photos load from the shop's CDN and are not copied. Keep that wording when touching README/footer.

## Commands

    npm run dev      # http://localhost:5173 (hot reload)
    npm run build    # tsc --noEmit && vite build → dist/
Pushing to `main` deploys via `.github/workflows/pages.yml`. Do not wait on the deploy inside a command.

## Structure

- `src/data.ts` types + loading (relative to BASE_URL so it works under /njsex/), `src/facets.ts` pure filter/sort,
  `src/categories.ts` per-category facets / card headline / table columns / sorts / badges, `src/useHashState.ts` URL state
  (`#cat=…&f={…}&p=<handle>&view=…&favs=1`), `src/favs.tsx` favourites (localStorage), `src/theme.ts` dark mode,
  `src/components/*` UI (TopBar, Sidebar, Cards incl. showcase, Table, Detail dialog, Gallery + Lightbox, SavedViews).
- Frames get a bespoke detail panel; parts get a generic spec sheet. Fields with a `*_confidence` below 0.6 are marked
  "low confidence". Rows flagged `jev_pending` are new listings whose categorical fields are not filled in yet: they show
  a "partial specs" badge and appear under "not stated / pending" in the facets.

## Gotchas already paid for

- `package-lock.json` must keep `registry.npmjs.org` URLs (some dev machines use a private npm mirror) or CI's `npm ci`
  dies with "Exit handler never called". Do not regenerate the lockfile without checking the hosts.
- Radix Dialog disables pointer events outside itself: the Lightbox is portaled to body and sets `pointer-events: auto`.
  A transformed ancestor traps `position: fixed`, hence the portal.
- shadcn's DialogContent carries `sm:max-w-lg`; override with the same `sm:` prefix.
- iOS shares `<link rel="canonical">` instead of the address bar: there is deliberately no canonical tag.
- Sticky sidebar pins by its bottom edge (no inner scroll); its wrapper must be `display: contents` or it cannot pin.
- Starring must not rebuild the result list (only feed favourites into the query in favs mode) or the grid resets and jumps.
- Test with Playwright at 1400 and 400 px; `data-testid` hooks exist on the main pieces.
