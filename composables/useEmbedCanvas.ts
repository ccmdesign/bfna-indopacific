/**
 * BF-224: marks a page as an embed canvas (pages/embed/canvas/*) — the design-size
 * frame the embed stage scales to fit. `is-embed-canvas` relaxes the 16:9 grid
 * lock so the grid fills the canvas; `?bare` adds `is-bare`, which hides the
 * infographic's own text for thumbnail captures (see assets/styles.css).
 */
export function useEmbedCanvas() {
  const route = useRoute()
  const bare = route.query.bare !== undefined

  useHead({
    htmlAttrs: { class: bare ? 'is-embed-canvas is-bare' : 'is-embed-canvas' }
  })
}
