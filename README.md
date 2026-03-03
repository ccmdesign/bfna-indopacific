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

Pages that use the `embed` layout can be embedded on third-party sites via an `<iframe>`. The recommended snippet:

```html
<iframe
  src="https://indopacific.bfranklinscience.org/embed/renewables"
  width="1280"
  height="800"
  sandbox="allow-scripts allow-same-origin"
  loading="lazy"
  title="Indo-Pacific Renewable Energy Infographic"
></iframe>
```

**Notes:**

- **Dimensions:** The infographics are designed for a 1280x800 viewport. Using smaller dimensions may clip content due to `overflow: hidden` on the grid layout.
- **`sandbox` attribute:** `allow-scripts` is required for chart interactivity. `allow-same-origin` is required for asset loading. Do not add `allow-top-navigation` or `allow-forms` unless explicitly needed.
- **Headers:** The server returns `Content-Security-Policy: frame-ancestors *` for `/embed/*` routes, allowing embedding from any origin. Non-embed routes return `X-Frame-Options: DENY` and cannot be embedded.

