import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

const root = globalThis.process.cwd();
const indexHtml = readFileSync(resolve(root, 'index.html'), 'utf8');

function readPngPixel(png, x, y) {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const colorType = png[25];
  const bitDepth = png[24];
  const bytesPerPixel = 4;
  let offset = 8;
  const imageData = [];

  expect(bitDepth).toBe(8);
  expect(colorType).toBe(6);
  expect(x).toBeLessThan(width);
  expect(y).toBeLessThan(height);

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');

    if (type === 'IDAT') {
      imageData.push(png.subarray(offset + 8, offset + 8 + length));
    }

    offset += length + 12;
  }

  const inflated = inflateSync(Buffer.concat(imageData));
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(height * stride);
  let sourceOffset = 0;

  for (let row = 0; row < height; row += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;

    for (let column = 0; column < stride; column += 1) {
      const left = column >= bytesPerPixel ? pixels[row * stride + column - bytesPerPixel] : 0;
      const up = row > 0 ? pixels[(row - 1) * stride + column] : 0;
      const upLeft = row > 0 && column >= bytesPerPixel ? pixels[(row - 1) * stride + column - bytesPerPixel] : 0;
      const value = inflated[sourceOffset];
      const prediction = filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : 0;
      const paeth = () => {
        const estimate = left + up - upLeft;
        const leftDistance = Math.abs(estimate - left);
        const upDistance = Math.abs(estimate - up);
        const upLeftDistance = Math.abs(estimate - upLeft);

        return leftDistance <= upDistance && leftDistance <= upLeftDistance ? left : upDistance <= upLeftDistance ? up : upLeft;
      };

      pixels[row * stride + column] = (value + (filter === 4 ? paeth() : prediction)) & 0xff;
      sourceOffset += 1;
    }
  }

  const pixelOffset = (y * width + x) * bytesPerPixel;
  return [...pixels.subarray(pixelOffset, pixelOffset + 4)];
}

describe('document favicon', () => {
  it('keeps the viewport scalable by the user', () => {
    const viewport = indexHtml.match(/<meta name="viewport" content="([^"]+)" \/>/)?.[1];

    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1.0');
    expect(viewport).not.toMatch(/(?:user-scalable|maximum-scale|minimum-scale)/i);
  });

  it('references SVG and PNG favicon fallbacks from the Vite public directory', () => {
    expect(indexHtml).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml" />');
    expect(indexHtml).toContain('<link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />');
    expect(indexHtml.indexOf('favicon-32x32.png')).toBeLessThan(indexHtml.indexOf('favicon.svg'));
  });

  it('references an Apple touch icon for mobile bookmarks', () => {
    expect(indexHtml).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />');
  });

  it('keeps the favicon as the official Hibilio mark', () => {
    const favicon = readFileSync(resolve(root, 'public/favicon.svg'), 'utf8');

    expect(favicon).toContain('viewBox="0 0 1024 1024"');
    expect(favicon).toContain('#f5efe8');
    expect(favicon).toContain('#a84e1e');
    expect(favicon).toContain('#e07b3a');
    expect(favicon).toContain('<circle cx="512" cy="512"');
  });

  it.each([
    ['favicon fallback', 'favicon-32x32.png', 32],
    ['Apple touch icon', 'apple-touch-icon.png', 180],
  ])('provides a valid %s PNG at the declared size', (_, filename, expectedSize) => {
    const icon = readFileSync(resolve(root, 'public', filename));

    expect([...icon.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(icon.readUInt32BE(16)).toBe(expectedSize);
    expect(icon.readUInt32BE(20)).toBe(expectedSize);
  });

  it('preserves the Hibilio mark center color in the Apple touch icon', () => {
    const icon = readFileSync(resolve(root, 'public/apple-touch-icon.png'));

    expect(readPngPixel(icon, 90, 90)).toEqual([194, 97, 42, 255]);
  });
});
