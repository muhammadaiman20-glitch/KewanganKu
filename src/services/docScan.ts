// Document-scan mode for receipts: find the paper, straighten it, and clean it into a white, sharp scan.
// Pure pixel functions on ImageData-shaped objects (no DOM), so they run in the browser and in node tests.

export type Pixels = { width: number; height: number; data: Uint8ClampedArray };
export type Point = { x: number; y: number };
export type Quad = [Point, Point, Point, Point]; // top-left, top-right, bottom-right, bottom-left
export type ScanFilter = 'document' | 'color' | 'original';

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const fullFrame = (w: number, h: number, inset = 0): Quad => {
  const dx = w * inset, dy = h * inset;
  return [{ x: dx, y: dy }, { x: w - dx, y: dy }, { x: w - dx, y: h - dy }, { x: dx, y: h - dy }];
};

function grayOf(img: Pixels): Float32Array {
  const g = new Float32Array(img.width * img.height), d = img.data;
  for (let i = 0, p = 0; i < g.length; i++, p += 4) g[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
  return g;
}

// Box blur through a summed-area table: O(pixels) whatever the radius.
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const sat = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) { row += src[y * w + x]; sat[(y + 1) * (w + 1) + x + 1] = sat[y * (w + 1) + x + 1] + row; }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const s = sat[y1 * (w + 1) + x1] - sat[y0 * (w + 1) + x1] - sat[y1 * (w + 1) + x0] + sat[y0 * (w + 1) + x0];
      out[y * w + x] = s / ((y1 - y0) * (x1 - x0));
    }
  }
  return out;
}

function otsu(g: Float32Array): number {
  const hist = new Float64Array(256);
  for (const v of g) hist[clamp(Math.round(v), 0, 255)]++;
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (!wB) continue;
    const wF = g.length - wB; if (!wF) break;
    sumB += t * hist[t];
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (between > best) { best = between; threshold = t; }
  }
  return threshold;
}

// Downscales by nearest neighbour so detection works on ~400 px whatever the camera resolution.
function shrink(img: Pixels, maxSide: number): { small: Pixels; scale: number } {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  if (scale === 1) return { small: img, scale };
  const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = (Math.min(img.height - 1, Math.floor(y / scale)) * img.width + Math.min(img.width - 1, Math.floor(x / scale))) * 4, o = (y * w + x) * 4;
    data[o] = img.data[s]; data[o + 1] = img.data[s + 1]; data[o + 2] = img.data[s + 2]; data[o + 3] = 255;
  }
  return { small: { width: w, height: h, data }, scale };
}

// Finds the receipt: the largest bright, low-colour region (paper) that isn't the whole background.
// Returns its four corners in the original image's coordinates; confidence 0 means "not found, using the frame".
export function detectQuad(img: Pixels): { quad: Quad; confidence: number } {
  const { small, scale } = shrink(img, 400);
  const w = small.width, h = small.height, n = w * h, d = small.data;
  // Paper is bright and grey-ish; a wooden table or a coloured mat is darker or more saturated.
  const score = new Float32Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = d[p], g = d[p + 1], b = d[p + 2];
    score[i] = 0.299 * r + 0.587 * g + 0.114 * b - 0.5 * (Math.max(r, g, b) - Math.min(r, g, b));
  }
  const blurred = boxBlur(score, w, h, 2);
  const t = otsu(blurred);
  // Close the mask (fill printed text inside the paper): dilate then erode with a box.
  const mask = new Float32Array(n);
  for (let i = 0; i < n; i++) mask[i] = blurred[i] > t ? 1 : 0;
  const r = Math.max(2, Math.round(Math.max(w, h) / 80));
  const dil = boxBlur(mask, w, h, r);
  for (let i = 0; i < n; i++) mask[i] = dil[i] > 0 ? 1 : 0;
  const ero = boxBlur(mask, w, h, r);
  const paper = new Uint8Array(n);
  for (let i = 0; i < n; i++) paper[i] = ero[i] > 0.999 ? 1 : 0;

  // Largest connected region, penalised when it hugs 3+ image borders (then it is probably the background).
  const label = new Int32Array(n), stack = new Int32Array(n);
  let best = { score: 0, id: 0, area: 0 }, id = 0;
  for (let s = 0; s < n; s++) {
    if (!paper[s] || label[s]) continue;
    id++; let top = 0, area = 0, minX = w, maxX = 0, minY = h, maxY = 0;
    stack[top++] = s; label[s] = id;
    while (top) {
      const i = stack[--top], x = i % w, y = (i - x) / w; area++;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (x > 0 && paper[i - 1] && !label[i - 1]) { label[i - 1] = id; stack[top++] = i - 1; }
      if (x < w - 1 && paper[i + 1] && !label[i + 1]) { label[i + 1] = id; stack[top++] = i + 1; }
      if (y > 0 && paper[i - w] && !label[i - w]) { label[i - w] = id; stack[top++] = i - w; }
      if (y < h - 1 && paper[i + w] && !label[i + w]) { label[i + w] = id; stack[top++] = i + w; }
    }
    const borders = Number(minX <= 1) + Number(maxX >= w - 2) + Number(minY <= 1) + Number(maxY >= h - 2);
    const sc = area * (borders >= 3 ? 0.15 : 1);
    if (sc > best.score) best = { score: sc, id, area };
  }
  if (best.area < n * 0.06) return { quad: fullFrame(img.width, img.height, 0.04), confidence: 0 };

  // Corners = extreme points of the region along the two diagonals.
  let tl = { v: Infinity, x: 0, y: 0 }, br = { v: -Infinity, x: 0, y: 0 }, tr = { v: -Infinity, x: 0, y: 0 }, bl = { v: Infinity, x: 0, y: 0 };
  for (let i = 0; i < n; i++) {
    if (label[i] !== best.id) continue;
    const x = i % w, y = (i - x) / w, s = x + y, df = x - y;
    if (s < tl.v) tl = { v: s, x, y }; if (s > br.v) br = { v: s, x, y };
    if (df > tr.v) tr = { v: df, x, y }; if (df < bl.v) bl = { v: df, x, y };
  }
  const up = (p: { x: number; y: number }, ox: number, oy: number): Point => ({ x: clamp((p.x + ox) / scale, 0, img.width), y: clamp((p.y + oy) / scale, 0, img.height) });
  const quad: Quad = [up(tl, 0, 0), up(tr, 1, 0), up(br, 1, 1), up(bl, 0, 1)];
  return { quad, confidence: Math.min(1, best.area / (n * 0.25)) };
}

// Output size that keeps the receipt's real proportions (longest side capped).
export function outputSize(q: Quad, maxSide = 1800): { width: number; height: number } {
  const w = Math.max(dist(q[0], q[1]), dist(q[3], q[2])), h = Math.max(dist(q[0], q[3]), dist(q[1], q[2]));
  const s = Math.min(1, maxSide / Math.max(w, h, 1));
  return { width: Math.max(8, Math.round(w * s)), height: Math.max(8, Math.round(h * s)) };
}

// Homography taking the output rectangle onto the quad (solved as an 8x8 linear system).
function homography(q: Quad, w: number, h: number): number[] {
  const from = [[0, 0], [w, 0], [w, h], [0, h]], A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = from[i], { x: u, y: v } = q[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    if (Math.abs(A[c][c]) < 1e-12) throw new Error('Bucu resit tidak sah. Laraskan semula keempat-empat bucu.');
    for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k]; }
  }
  return [...A.map((row, i) => row[8] / row[i]), 1];
}

// Straightens the quad into a flat rectangle (perspective correction, bilinear sampling).
export function warp(img: Pixels, q: Quad, size = outputSize(q)): Pixels {
  const { width: W, height: H } = size, H8 = homography(q, W, H);
  const out = new Uint8ClampedArray(W * H * 4), sw = img.width, sh = img.height, s = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const X = x + 0.5, Y = y + 0.5, z = H8[6] * X + H8[7] * Y + H8[8];
    const u = clamp((H8[0] * X + H8[1] * Y + H8[2]) / z - 0.5, 0, sw - 1), v = clamp((H8[3] * X + H8[4] * Y + H8[5]) / z - 0.5, 0, sh - 1);
    const x0 = Math.floor(u), y0 = Math.floor(v), x1 = Math.min(sw - 1, x0 + 1), y1 = Math.min(sh - 1, y0 + 1), fx = u - x0, fy = v - y0;
    const a = (y0 * sw + x0) * 4, b = (y0 * sw + x1) * 4, c = (y1 * sw + x0) * 4, e = (y1 * sw + x1) * 4, o = (y * W + x) * 4;
    for (let k = 0; k < 3; k++) out[o + k] = (s[a + k] * (1 - fx) + s[b + k] * fx) * (1 - fy) + (s[c + k] * (1 - fx) + s[e + k] * fx) * fy;
    out[o + 3] = 255;
  }
  return { width: W, height: H, data: out };
}

// Cleans the straightened receipt.
// document: removes shadows and uneven light (divide by the local paper brightness), then white paper / dark text.
// color: same lighting fix per channel, keeps colours (logos, stamps). original: untouched.
export function enhance(img: Pixels, filter: ScanFilter): Pixels {
  if (filter === 'original') return img;
  const { width: w, height: h } = img, n = w * h, d = img.data, out = new Uint8ClampedArray(d.length);
  const r = Math.max(8, Math.round(Math.max(w, h) / 24));
  if (filter === 'document') {
    const g = grayOf(img), bg = boxBlur(g, w, h, r);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const ratio = g[i] / Math.max(1, bg[i]);
      // Paper sits a little above its local mean (ratio ~1.0-1.1); ink is well below it.
      const t = clamp((ratio - 0.6) / (0.93 - 0.6), 0, 1), v = 255 * Math.pow(t, 1.6);
      out[p] = out[p + 1] = out[p + 2] = v; out[p + 3] = 255;
    }
    return { width: w, height: h, data: out };
  }
  for (let k = 0; k < 3; k++) {
    const ch = new Float32Array(n);
    for (let i = 0; i < n; i++) ch[i] = d[i * 4 + k];
    const bg = boxBlur(ch, w, h, r);
    for (let i = 0; i < n; i++) out[i * 4 + k] = clamp((ch[i] / Math.max(1, bg[i])) * 245, 0, 255);
  }
  for (let i = 0; i < n; i++) out[i * 4 + 3] = 255;
  return { width: w, height: h, data: out };
}
