import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectQuad, warp, enhance, outputSize, fullFrame } from '../src/services/docScan.ts';

// A tilted white receipt with dark text lines on a brown table.
function photo(w = 900, h = 1200, quad = [{ x: 260, y: 150 }, { x: 640, y: 190 }, { x: 610, y: 1050 }, { x: 230, y: 1010 }], shadow = false) {
  const data = new Uint8ClampedArray(w * h * 4);
  const inside = (x, y) => { // point in convex quad (clockwise)
    for (let i = 0; i < 4; i++) { const a = quad[i], b = quad[(i + 1) % 4]; if ((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x) < 0) return false; }
    return true;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = (y * w + x) * 4;
    let c = [120, 80, 50];
    if (inside(x, y)) {
      const line = Math.floor((y - 200) / 40) % 2 === 0 && (y % 40) < 12 && x > 300 && x < 560; // text rows
      const light = shadow ? 0.55 + 0.45 * (x / w) : 1; // shadow falling across the paper
      c = (line ? [30, 30, 30] : [245, 243, 238]).map((v) => v * light);
    }
    data[p] = c[0]; data[p + 1] = c[1]; data[p + 2] = c[2]; data[p + 3] = 255;
  }
  return { img: { width: w, height: h, data }, quad };
}

test('finds the four corners of a tilted receipt on a table', () => {
  const { img, quad } = photo();
  const { quad: found, confidence } = detectQuad(img);
  assert.ok(confidence > 0.5, `confidence ${confidence}`);
  found.forEach((p, i) => assert.ok(Math.hypot(p.x - quad[i].x, p.y - quad[i].y) < 25, `corner ${i}: ${JSON.stringify(p)} vs ${JSON.stringify(quad[i])}`));
});

test('falls back to the full frame when there is no paper to find', () => {
  const data = new Uint8ClampedArray(300 * 300 * 4).fill(90);
  const { quad, confidence } = detectQuad({ width: 300, height: 300, data });
  assert.equal(confidence, 0); assert.deepEqual(quad, fullFrame(300, 300, 0.04));
});

test('straightening keeps the receipt proportions and crops the table away', () => {
  const { img, quad } = photo();
  const size = outputSize(quad);
  assert.ok(size.height / size.width > 2 && size.height / size.width < 2.5, JSON.stringify(size));
  const flat = warp(img, quad, size);
  let brown = 0;
  for (let p = 0; p < flat.data.length; p += 4) if (flat.data[p] - flat.data[p + 2] > 50) brown++;
  assert.ok(brown / (flat.width * flat.height) < 0.03, `table pixels left: ${brown}`);
});

test('document filter removes the shadow: paper becomes evenly white, text stays dark', () => {
  const { img, quad } = photo(900, 1200, undefined, true);
  const doc = enhance(warp(img, quad), 'document');
  const at = (fx, fy) => doc.data[(Math.floor(fy * doc.height) * doc.width + Math.floor(fx * doc.width)) * 4];
  // Blank paper on the dark (left) and bright (right) side of the shadow.
  assert.ok(at(0.05, 0.03) > 235 && at(0.95, 0.03) > 235, `paper ${at(0.05, 0.03)} / ${at(0.95, 0.03)}`);
  // A text row in the shadowed half is still dark.
  let darkest = 255; for (let fy = 0.05; fy < 0.2; fy += 0.002) darkest = Math.min(darkest, at(0.3, fy));
  assert.ok(darkest < 60, `text ${darkest}`);
  assert.equal(enhance(img, 'original'), img);
});
