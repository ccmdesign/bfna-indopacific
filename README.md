# BFNA Indopacific

Nuxt 4 project

## Setup

Install dependencies:

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

## Production

Build the application:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Embedding Infographics

Pages that use the `embed` layout can be embedded on third-party sites via an `<iframe>`. Recommended snippet:

```html
<iframe
  src="https://bfna-indopacific.netlify.app/embed/renewables"
  width="1280"
  height="800"
  style="border:0;max-width:100%;aspect-ratio:16/10"
  loading="lazy"
  allowfullscreen
  title="Renewables on the Rise"
></iframe>
```

**Notes:**

- **Dimensions:** Infographics are designed for a 1280×800 viewport. The `aspect-ratio: 16/10` + `max-width: 100%` style lets the embed scale down responsively in the host column without clipping.
- **Headers:** The server returns `Content-Security-Policy: frame-ancestors *` for `/embed/*` routes, allowing embedding from any origin. Non-embed routes return `X-Frame-Options: DENY` and cannot be embedded.

## Static Tile Export (Squarespace)

The client's Squarespace site (indo-pacificnexus.org) can't carry the live `<iframe>` embeds above — they're too heavy for that page. Instead, each infographic ships as a single static PNG "tile" that links out to its live interactive page.

Regenerate all tiles:

```bash
npm run export:tiles
```

This runs `nuxt generate` (a full prerendered build — needed so `?capture` mode and the latest components are reflected), serves the output locally, and screenshots each infographic's `/embed/<slug>` route with Playwright at a settled idle state (no ambient/decorative animation, reduced motion). Output lands in `exports/tiles/` (gitignored — this pipeline is the deliverable, not its output):

| Infographic | File | Size |
|---|---|---|
| Renewables on the Rise | `renewables-2824x1986.png` | 2824×1986 (landscape) |
| Indo-Pacific Straits | `straits-2824x1986.png` | 2824×1986 (landscape) |
| ASEAN: Pivot of the Indo-Pacific | `asean-3840x3840.png` | 3840×3840 (square) |

Sizes were measured from the client's existing infographics page. Squarespace downscales images for display, so native-size exports are safe to upload as-is. To reuse an existing build without rebuilding (faster local iteration): `npm run export:tiles -- --skip-build`.

**Squarespace usage:** for each infographic, place the tile PNG as an image block linking to its live interactive page, e.g. `https://bfna-indopacific.netlify.app/infographics/renewables`. The tile is the static preview; the link is where visitors get the real, interactive version.

