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

