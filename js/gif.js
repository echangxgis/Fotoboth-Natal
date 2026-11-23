(function () {
  'use strict';

  const PB = window.PB || (window.PB = {});

  function indexFrame(data, size) {
    const colors = new Map();
    const palette = new Uint8Array(768);
    const indices = new Uint8Array(size);
    let i = 0;
    for (; i < size; i++) {
      const p = i * 4;
      const rgb = (data[p] << 16) | (data[p + 1] << 8) | data[p + 2];
      let index = colors.get(rgb);
      if (index === undefined) {
        index = colors.size;
        if (index === 256) break;
        colors.set(rgb, index);
        palette.set(data.subarray(p, p + 3), index * 3);
      }
      indices[i] = index;
    }
    if (i === size) {
      const depth = Math.max(2, Math.ceil(Math.log2(colors.size)));
      return { indices, palette: palette.subarray(0, 3 << depth), depth };
    }

    // Fall back to a bounded 3:3:2 RGB palette for photographic frames.
    for (let c = 0; c < 256; c++) {
      palette[c * 3] = Math.round((c >> 5) * 255 / 7);
      palette[c * 3 + 1] = Math.round(((c >> 2) & 7) * 255 / 7);
      palette[c * 3 + 2] = (c & 3) * 85;
    }
    for (let j = 0; j < size; j++) {
      const p = j * 4;
      indices[j] = (Math.round(data[p] * 7 / 255) << 5) |
        (Math.round(data[p + 1] * 7 / 255) << 2) | Math.round(data[p + 2] * 3 / 255);
    }
    return { indices, palette, depth: 8 };
  }

  function writeLzw(parts, indices, depth) {
    const clear = 1 << depth;
    const end = clear + 1;
    const dictionary = new Map();
    let next = end + 1;
    let width = depth + 1;
    let bits = 0;
    let count = 0;
    let block = new Uint8Array(256);
    let used = 0;

    function flushBlock() {
      block[0] = used;
      parts.push(block.subarray(0, used + 1));
      block = new Uint8Array(256);
      used = 0;
    }

    function writeCode(code) {
      bits |= code << count;
      count += width;
      while (count >= 8) {
        block[++used] = bits & 255;
        if (used === 255) flushBlock();
        bits >>>= 8;
        count -= 8;
      }
    }

    function writePhrase(code) {
      writeCode(code);
      // The decoder adds an entry one phrase later than the encoder.
      if (width < 12 && next === (1 << width)) width++;
    }

    writeCode(clear);
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const symbol = indices[i];
      const key = (prefix << 8) | symbol;
      const code = dictionary.get(key);
      if (code !== undefined) {
        prefix = code;
        continue;
      }
      writePhrase(prefix);
      if (next < 4096) {
        dictionary.set(key, next++);
      } else {
        writeCode(clear);
        dictionary.clear();
        next = end + 1;
        width = depth + 1;
      }
      prefix = symbol;
    }
    writePhrase(prefix);
    writeCode(end);
    if (count) block[++used] = bits;
    if (used) flushBlock();
    parts.push(Uint8Array.of(0));
  }

  // Encode same-sized, opaque RGB frames (ImageData alpha is ignored).
  PB.encodeGif = function (frames, delayMs) {
    if (!Array.isArray(frames) || !frames.length || !frames[0]) {
      throw new TypeError('Expected a nonempty array of ImageData frames');
    }
    const { width, height } = frames[0];
    if (![width, height].every(n => Number.isInteger(n) && n > 0 && n <= 65535)) {
      throw new RangeError('GIF dimensions must be integers from 1 to 65535');
    }
    const size = width * height;
    for (const frame of frames) {
      if (!frame || frame.width !== width || frame.height !== height ||
          !frame.data || frame.data.length !== size * 4) {
        throw new TypeError('Expected same-sized RGBA ImageData frames');
      }
    }
    if (!Number.isFinite(delayMs) || delayMs < 0) {
      throw new RangeError('Expected a finite, nonnegative frame delay in milliseconds');
    }
    const delay = Math.min(65535, Math.round(delayMs / 10));
    const dimensions = [width & 255, width >> 8, height & 255, height >> 8];
    const parts = [];
    const bytes = (...values) => parts.push(Uint8Array.of(...values));

    parts.push('GIF89a');
    bytes(...dimensions, 0x70, 0, 0); // No global color table.
    bytes(0x21, 0xff, 11);
    parts.push('NETSCAPE2.0');
    bytes(3, 1, 0, 0, 0); // Loop forever.

    for (const frame of frames) {
      const { indices, palette, depth } = indexFrame(frame.data, size);
      bytes(0x21, 0xf9, 4, 0x04, delay & 255, delay >> 8, 0, 0);
      bytes(0x2c, 0, 0, 0, 0, ...dimensions, 0x80 | (depth - 1));
      parts.push(palette);
      bytes(depth);
      writeLzw(parts, indices, depth);
    }
    bytes(0x3b);
    return new Blob(parts, { type: 'image/gif' });
  };
})();
