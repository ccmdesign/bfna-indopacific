/**
 * Parse hormuz-polygon-01.svg into a JSON file with flattened path data.
 * No external dependencies - uses only built-in Node.js modules.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const svgText = readFileSync(resolve(ROOT, 'assets/images/hormuz-polygon-01.svg'), 'utf-8');

// ---------------------------------------------------------------------------
// SVG path tokenizer
// ---------------------------------------------------------------------------

function tokenizePath(d) {
  const tokens = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g;
  let m;
  while ((m = re.exec(d)) !== null) {
    if (m[1]) tokens.push(m[1]);
    else tokens.push(parseFloat(m[2]));
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Cubic bezier sampling
// ---------------------------------------------------------------------------

function cubicBezierPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
    y: u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y,
  };
}

function sampleCubicBezier(p0, p1, p2, p3, resolution = 2) {
  // Estimate arc length roughly to decide number of segments
  const chordLen = Math.hypot(p3.x - p0.x, p3.y - p0.y);
  const controlLen = Math.hypot(p1.x - p0.x, p1.y - p0.y)
                   + Math.hypot(p2.x - p1.x, p2.y - p1.y)
                   + Math.hypot(p3.x - p2.x, p3.y - p2.y);
  const approxLen = (chordLen + controlLen) / 2;
  const steps = Math.max(2, Math.ceil(approxLen / resolution));
  const pts = [];
  for (let i = 1; i <= steps; i++) {
    const pt = cubicBezierPoint(p0, p1, p2, p3, i / steps);
    pts.push(pt);
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Quadratic bezier sampling
// ---------------------------------------------------------------------------

function quadBezierPoint(p0, p1, p2, t) {
  const u = 1 - t;
  return {
    x: u*u*p0.x + 2*u*t*p1.x + t*t*p2.x,
    y: u*u*p0.y + 2*u*t*p1.y + t*t*p2.y,
  };
}

function sampleQuadBezier(p0, p1, p2, resolution = 2) {
  const chordLen = Math.hypot(p2.x - p0.x, p2.y - p0.y);
  const controlLen = Math.hypot(p1.x - p0.x, p1.y - p0.y)
                   + Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const approxLen = (chordLen + controlLen) / 2;
  const steps = Math.max(2, Math.ceil(approxLen / resolution));
  const pts = [];
  for (let i = 1; i <= steps; i++) {
    pts.push(quadBezierPoint(p0, p1, p2, i / steps));
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Path interpreter - converts SVG path commands to arrays of sub-paths
// Each sub-path is an array of {x, y} points
// ---------------------------------------------------------------------------

function parsePath(d) {
  const tokens = tokenizePath(d);
  const subPaths = [];
  let current = [];
  let cx = 0, cy = 0;       // current point
  let sx = 0, sy = 0;       // sub-path start
  let lastCp = null;         // last control point (for S/T)
  let lastCmd = '';
  let i = 0;

  function next() { return tokens[i++]; }
  function peek() { return tokens[i]; }
  function isNumber(v) { return typeof v === 'number'; }

  while (i < tokens.length) {
    let cmd = peek();
    if (typeof cmd === 'string') {
      next();
    } else {
      // Implicit repeat of last command (L after M, etc.)
      cmd = lastCmd;
    }

    switch (cmd) {
      case 'M': {
        if (current.length) { subPaths.push(current); current = []; }
        cx = next(); cy = next();
        sx = cx; sy = cy;
        current.push({ x: cx, y: cy });
        lastCmd = 'L'; // subsequent coords are implicit L
        lastCp = null;
        break;
      }
      case 'm': {
        if (current.length) { subPaths.push(current); current = []; }
        cx += next(); cy += next();
        sx = cx; sy = cy;
        current.push({ x: cx, y: cy });
        lastCmd = 'l';
        lastCp = null;
        break;
      }
      case 'L': {
        cx = next(); cy = next();
        current.push({ x: cx, y: cy });
        lastCmd = 'L'; lastCp = null;
        break;
      }
      case 'l': {
        cx += next(); cy += next();
        current.push({ x: cx, y: cy });
        lastCmd = 'l'; lastCp = null;
        break;
      }
      case 'H': {
        cx = next();
        current.push({ x: cx, y: cy });
        lastCmd = 'H'; lastCp = null;
        break;
      }
      case 'h': {
        cx += next();
        current.push({ x: cx, y: cy });
        lastCmd = 'h'; lastCp = null;
        break;
      }
      case 'V': {
        cy = next();
        current.push({ x: cx, y: cy });
        lastCmd = 'V'; lastCp = null;
        break;
      }
      case 'v': {
        cy += next();
        current.push({ x: cx, y: cy });
        lastCmd = 'v'; lastCp = null;
        break;
      }
      case 'C': {
        const x1 = next(), y1 = next();
        const x2 = next(), y2 = next();
        const x = next(), y = next();
        const pts = sampleCubicBezier({ x: cx, y: cy }, { x: x1, y: y1 }, { x: x2, y: y2 }, { x, y });
        current.push(...pts);
        lastCp = { x: x2, y: y2 };
        cx = x; cy = y;
        lastCmd = 'C';
        break;
      }
      case 'c': {
        const dx1 = next(), dy1 = next();
        const dx2 = next(), dy2 = next();
        const dx = next(), dy = next();
        const p0 = { x: cx, y: cy };
        const p1 = { x: cx + dx1, y: cy + dy1 };
        const p2 = { x: cx + dx2, y: cy + dy2 };
        const p3 = { x: cx + dx, y: cy + dy };
        const pts = sampleCubicBezier(p0, p1, p2, p3);
        current.push(...pts);
        lastCp = p2;
        cx = p3.x; cy = p3.y;
        lastCmd = 'c';
        break;
      }
      case 'S': {
        // Smooth cubic: reflect last control point
        const cp1 = lastCp ? { x: 2*cx - lastCp.x, y: 2*cy - lastCp.y } : { x: cx, y: cy };
        const x2 = next(), y2 = next();
        const x = next(), y = next();
        const pts = sampleCubicBezier({ x: cx, y: cy }, cp1, { x: x2, y: y2 }, { x, y });
        current.push(...pts);
        lastCp = { x: x2, y: y2 };
        cx = x; cy = y;
        lastCmd = 'S';
        break;
      }
      case 's': {
        const cp1 = lastCp ? { x: 2*cx - lastCp.x, y: 2*cy - lastCp.y } : { x: cx, y: cy };
        const dx2 = next(), dy2 = next();
        const dx = next(), dy = next();
        const p2 = { x: cx + dx2, y: cy + dy2 };
        const p3 = { x: cx + dx, y: cy + dy };
        const pts = sampleCubicBezier({ x: cx, y: cy }, cp1, p2, p3);
        current.push(...pts);
        lastCp = p2;
        cx = p3.x; cy = p3.y;
        lastCmd = 's';
        break;
      }
      case 'Q': {
        const x1 = next(), y1 = next();
        const x = next(), y = next();
        const pts = sampleQuadBezier({ x: cx, y: cy }, { x: x1, y: y1 }, { x, y });
        current.push(...pts);
        lastCp = { x: x1, y: y1 };
        cx = x; cy = y;
        lastCmd = 'Q';
        break;
      }
      case 'q': {
        const dx1 = next(), dy1 = next();
        const dx = next(), dy = next();
        const p1 = { x: cx + dx1, y: cy + dy1 };
        const p2 = { x: cx + dx, y: cy + dy };
        const pts = sampleQuadBezier({ x: cx, y: cy }, p1, p2);
        current.push(...pts);
        lastCp = p1;
        cx = p2.x; cy = p2.y;
        lastCmd = 'q';
        break;
      }
      case 'T': {
        const cp = lastCp ? { x: 2*cx - lastCp.x, y: 2*cy - lastCp.y } : { x: cx, y: cy };
        const x = next(), y = next();
        const pts = sampleQuadBezier({ x: cx, y: cy }, cp, { x, y });
        current.push(...pts);
        lastCp = cp;
        cx = x; cy = y;
        lastCmd = 'T';
        break;
      }
      case 't': {
        const cp = lastCp ? { x: 2*cx - lastCp.x, y: 2*cy - lastCp.y } : { x: cx, y: cy };
        const dx = next(), dy = next();
        const p = { x: cx + dx, y: cy + dy };
        const pts = sampleQuadBezier({ x: cx, y: cy }, cp, p);
        current.push(...pts);
        lastCp = cp;
        cx = p.x; cy = p.y;
        lastCmd = 't';
        break;
      }
      case 'Z':
      case 'z': {
        // Close path - return to start
        if (cx !== sx || cy !== sy) {
          current.push({ x: sx, y: sy });
        }
        cx = sx; cy = sy;
        lastCp = null;
        lastCmd = cmd;
        break;
      }
      case 'A':
      case 'a': {
        // Arc - approximate with line segments
        // For simplicity, just move to endpoint (arcs are rare in this SVG)
        const rx = next(), ry = next();
        const xRot = next(), largeArc = next(), sweep = next();
        let ex, ey;
        if (cmd === 'A') { ex = next(); ey = next(); }
        else { ex = cx + next(); ey = cy + next(); }
        current.push({ x: ex, y: ey });
        cx = ex; cy = ey;
        lastCmd = cmd; lastCp = null;
        break;
      }
      default:
        console.warn(`Unknown SVG path command: ${cmd}`);
        i++;
    }
  }
  if (current.length) subPaths.push(current);
  return subPaths;
}

// ---------------------------------------------------------------------------
// Parse polyline points attribute
// ---------------------------------------------------------------------------

function parsePolylinePoints(pointsStr) {
  const nums = pointsStr.trim().split(/[\s,]+/).map(Number);
  const pts = [];
  for (let i = 0; i < nums.length; i += 2) {
    pts.push({ x: nums[i], y: nums[i+1] });
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Extract elements from SVG
// ---------------------------------------------------------------------------

// Get the .st2 path d attribute (line 29)
const st2Match = svgText.match(/<path\s+class="st2"\s+d="([^"]+)"/);
const st0Match = svgText.match(/<path\s+class="st0"\s+d="([^"]+)"/);
const st1Match = svgText.match(/<polyline\s+class="st1"\s+points="([^"]+)"/);
const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/);

if (!st2Match) throw new Error('Could not find .st2 path');
if (!st0Match) throw new Error('Could not find .st0 path');
if (!st1Match) throw new Error('Could not find .st1 polyline');

const viewBox = viewBoxMatch[1].split(/\s+/).map(Number);

// Parse .st2 - first sub-path is main boundary, rest are islands
const st2SubPaths = parsePath(st2Match[1]);
const boundary = st2SubPaths[0];
const islands = st2SubPaths.slice(1);

// Parse .st0 - entry edge
const st0SubPaths = parsePath(st0Match[1]);
const entryEdge = st0SubPaths[0]; // should be a single path

// Parse .st1 - exit edge (polyline)
const exitEdge = parsePolylinePoints(st1Match[1]);

// ---------------------------------------------------------------------------
// Convert to compact [x, y] arrays, round to 1 decimal
// ---------------------------------------------------------------------------

function toCompact(pts) {
  return pts.map(p => [
    Math.round(p.x * 10) / 10,
    Math.round(p.y * 10) / 10,
  ]);
}

const result = {
  viewBox,
  boundary: toCompact(boundary),
  islands: islands.map(toCompact),
  entryEdge: toCompact(entryEdge),
  exitEdge: toCompact(exitEdge),
};

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------

const outPath = resolve(ROOT, 'data/straits/hormuz-polygon.json');
writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`Written to ${outPath}`);

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

function bbox(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

console.log('\n--- Verification ---');
console.log(`viewBox: [${viewBox}]`);
console.log(`boundary: ${result.boundary.length} points, bbox:`, bbox(result.boundary));
console.log(`islands: ${result.islands.length} sub-paths, point counts: [${result.islands.map(p=>p.length)}]`);
console.log(`entryEdge: ${result.entryEdge.length} points, bbox:`, bbox(result.entryEdge));
console.log(`exitEdge: ${result.exitEdge.length} points, bbox:`, bbox(result.exitEdge));
