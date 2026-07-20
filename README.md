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

Sizes were measured from the client's existing infographics page. To reuse an existing build without rebuilding (faster local iteration): `npm run export:tiles -- --skip-build`.

### Web-sized export for Squarespace

The `tiles` sizes above are native-resolution. Squarespace resizes any upload wider than 2500px, so for the actual Squarespace image blocks use the `squarespace` preset instead:

```bash
npm run export:squarespace
```

| Infographic | File | Size |
|---|---|---|
| Renewables on the Rise | `renewables-2400x1688.png` | 2400×1688 (landscape) |
| Indo-Pacific Straits | `straits-2400x1688.png` | 2400×1688 (landscape) |
| ASEAN: Pivot of the Indo-Pacific | `asean-2400x2400.png` | 2400×2400 (square) |

Output lands in `exports/squarespace/`.

**On the 2400px default:** the client has not yet confirmed target pixel dimensions. 2400px is a deliberate placeholder — under Squarespace's 2500px resize cap, still crisp at 2× on its ~1200px content column. When the confirmed number arrives, either pass it (`npm run export:squarespace -- --width=2000`) or change the `SQUARESPACE_WIDTH` constant at the top of `scripts/export-tiles.mjs`. Heights are derived from each infographic's native aspect ratio, so only the width needs setting.

### Flags

| Flag | Effect |
|---|---|
| `--preset=tiles\|squarespace` | Size preset (default `tiles`) |
| `--width=N` | Output width in pixels; height follows |
| `--height=N` | Output height in pixels; width follows |
| `--base-url=URL` | Origin the emitted links point at (default `https://bfna-indopacific.netlify.app`) |
| `--skip-build` | Reuse an existing `.output/public` |

Pass `--width` **or** `--height`, not both — see below.

### Resolution vs. layout

Output resolution and layout viewport are deliberately separate. Each infographic is always rendered at a fixed CSS-pixel viewport (`LAYOUTS` in the script — the size the design is composed for), and the target resolution is reached purely by scaling that render up or down.

This matters: shrinking the CSS viewport to get a smaller PNG would re-flow the design instead of scaling it. An earlier pass at this did exactly that and clipped the renewables title and x-axis. So changing `--width` only changes resolution, never composition. Because the scale is uniform, width and height can't be set independently — passing both is rejected rather than distorting the design.

Each run also clears its own preset directory first, so a folder only ever holds one version of each infographic.

### Link-out artifacts

A static image is only half the deliverable — each one has to link to its interactive version. Both presets emit, alongside the PNGs:

- **`manifest.json`** — slug, title, filename, dimensions, and interactive URL per image.
- **`squarespace-snippets.html`** — paste-ready `<a href="…"><img …></a>` markup per infographic, with the interactive URL already filled in.

**Squarespace usage:** upload the PNG, then use the matching snippet, swapping only the `img src` for the URL Squarespace assigns the uploaded file. The `href` is already correct. The image is the static preview; the link is where visitors get the real, interactive version.

