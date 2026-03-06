/**
 * Convert strait posX/posY percentages (0-100) to normalized UV coordinates
 * for the WebGL lens shader.
 *
 * UV convention: x runs left-to-right (0..1), y runs bottom-to-top (0..1).
 * The posY percentage runs top-to-bottom (CSS convention), so we flip Y.
 */
export function straitToUV(posX: number, posY: number): { x: number; y: number } {
  return {
    x: posX / 100,
    y: 1.0 - posY / 100,
  }
}
