# NJS Export catalog browser

An unofficial, read-only browser for the public catalog of [NJS Export](https://www.njs-export.com), a shop in Japan selling
NJS-approved keirin frames and parts. It adds what the shop's own site lacks: filtering frames by seat tube, top tube,
standover, builder, tubing, condition and year, and the same kind of structured filters for every parts category.

**Good-faith notice.** This is a fan project made because the shop is wonderful and its catalog is hard to search.
It is not affiliated with, endorsed by, or connected to NJS Export in any way.

- Nothing is sold here. Every listing links back to its original page on njs-export.com, which is the only place to buy.
- All product titles, descriptions, photos and prices belong to NJS Export. Photos are loaded directly from the shop's own
  image host; none are copied into this repository.
- Data is refreshed occasionally by re-reading the shop's public product feed at a very gentle rate, in line with what the
  shop's own `robots.txt` and `agents.md` allow for read-only access.
- If you are the shop owner and would like anything changed, credited differently, or taken down, open an issue here and it
  will be done promptly.

The structured fields (geometry, builder, condition grade and so on) are extracted from the seller's free-text titles and
descriptions by a mix of pattern matching and a small language model. They are usually right, but always check the original
listing before buying. Low-confidence values are marked in the detail view.

## Stack

React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui (Radix primitives), lucide icons. No backend: the whole catalog
is loaded into memory and filtered client-side.

## Running locally

    npm install
    npm run dev          # http://localhost:5173

The data in `public/data/` is written by the companion pipeline repository (`make publish` there). This repo only renders it.

## Deploying

Pushing to `main` builds the site with GitHub Actions and deploys it to GitHub Pages (see `.github/workflows/pages.yml`).
Enable Pages in the repository settings with "GitHub Actions" as the source the first time.
