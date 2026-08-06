# design-sync notes — Forma Auto Spa

## Repo shape

This is an application repo (Vite + React + Express/tRPC), **not** a
published component-library package. There's no Storybook, no
`*.stories.*` files, and no `dist/`/`.d.ts` export surface for
`client/src/components/ui/` (the shadcn-based UI primitives) — it's just
internal app source imported directly via the `@/` path alias.

To make the "package" shape work against this, package-build.mjs's normal
`node_modules/<pkg>` resolution was bypassed:

- **`cfg.entry`** points at `.ds-sync-entry.mjs` (repo root, gitignored) — a
  hand-written barrel that `export * from`s the scoped component files.
  Passing `--entry`/`cfg.entry` makes the script walk UP from that file
  looking for the nearest `package.json` with a `name` field to use as
  `PKG_DIR`. Since there's no nested `package.json` between repo root and
  the entry file, `PKG_DIR` resolves to the **repo root** — which is what
  makes `cfg.srcDir` / `componentSrcMap` (both resolved relative to
  `PKG_DIR`) work out as plain repo-root-relative paths.
- **Why the entry file lives at repo root, not inside `.ds-sync/`**: staging
  puts a `{"name":"ds-sync-deps"}` `package.json` at `.ds-sync/` for the
  converter's own npm deps. If the entry file lived under `.ds-sync/`, the
  walk-up would hit THAT package.json first and `PKG_DIR` would resolve to
  `.ds-sync/` instead of repo root — wrong base for `srcDir`. Keep the entry
  file at repo root (or anywhere else with no intervening `package.json`).
- **`componentSrcMap`** explicitly declares all 10 scoped component names
  (Button, Card, Input, Label, Textarea, Badge, Dialog, Select, Checkbox,
  Tabs) because there's no `.d.ts` for `exportedNames()` to scan — without
  the map, discovery would find zero components (`[ZERO_MATCH]`).
- Multi-export files (`card.tsx`, `dialog.tsx`, `select.tsx`, `tabs.tsx`)
  export several named sub-parts (e.g. `CardHeader`, `DialogTrigger`,
  `SelectItem`, `TabsList`). Only the 10 top-level names are mapped as
  their own components/cards; the sub-parts still ship in the bundle (via
  `export *`) and get composed inside their parent's authored preview, per
  the shape's own "leaf that throws outside its provider" guidance.

## CSS

This app's Tailwind v4 setup has no standalone "component library" CSS
build — the real compiled stylesheet only exists after `npm run build`
(via `@tailwindcss/vite`), and its filename is content-hashed
(`dist/public/assets/index-<hash>.css`), which isn't reproducible for a
committed config.

**`cfg.cssEntry` points at `.ds-sync/compiled-styles.css`** — a copy of that
build output at a stable name. **Before re-running the build/validate
pipeline, regenerate it:**

```sh
npm run build
cp dist/public/assets/index-*.css .ds-sync/compiled-styles.css
```

This file is gitignored (regenerated, not durable) — the *source of truth*
is `client/src/index.css` + Tailwind's utility-class scan of everything
under `client/src/`, which is a strict superset covering the 10 scoped
components' classes.

## Fonts

Fonts (Oswald for headlines, Inter for body, Inter Tight for numbers) are
loaded via a Google Fonts `<link>` tag in `client/index.html` — not a CSS
`@import`, not self-hosted `@font-face`. `cfg.runtimeFontPrefixes:
["Oswald", "Inter"]` tells the converter these are expected to resolve at
runtime from an external font service rather than ship in the bundle, so
it shouldn't flag `[FONT_MISSING]` for them.

## Re-sync risks

- **The compiled-styles.css copy can silently go stale.** If someone edits
  `client/src/index.css` or brand tokens and re-syncs without rebuilding
  first, the uploaded design system will render the OLD palette/styles.
  Always `npm run build` + re-copy before re-running the converter.
- **`componentSrcMap` is a manual allowlist**, not auto-discovered — adding
  more components later means adding more entries here, not just editing
  `srcDir`.
- **Multi-export sub-parts (CardHeader, DialogTrigger, etc.) have no
  individual `.d.ts`/prompt/card** — only composed previews of their
  parent. If the design agent needs to use e.g. `CardHeader` on its own
  with a documented prop contract, promote it to `componentSrcMap`.
- **`.ds-sync-entry.mjs` at repo root must be kept in sync with the scoped
  component list** — it's not auto-generated from `componentSrcMap`.
