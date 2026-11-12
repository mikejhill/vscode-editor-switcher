#!/usr/bin/env node
// Generates scaled icon PNGs from a single source image.
// Usage:
//   node scripts/generate-icons.js --src images/icon-source.png --out images --sizes 16,32,48,64,96,128,256,512

const fs = require("fs");
const path = require("path");
const { Jimp, ResizeStrategy } = require("jimp");

function parseArgs(argv) {
  const args = {};
  const tokens = argv.slice(2);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok.startsWith("--")) {
      continue;
    }
    const m = tok.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) {
      const key = m[1];
      if (m[2] !== undefined) {
        args[key] = m[2];
      } else {
        const next = tokens[i + 1];
        if (next && !next.startsWith("--")) {
          args[key] = next;
          i++; // consume value token
        } else {
          args[key] = true;
        }
      }
    }
  }
  return args;
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

function parseSizes(s) {
  if (!s) {
    return [16, 32, 48, 64, 96, 128, 256, 512];
  }
  return String(s)
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}

async function main() {
  const args = parseArgs(process.argv);
  const src = args.src || path.join("images", "icon-source.png");
  const outDir = args.out || "images";
  const sizes = parseSizes(args.sizes);

  const absSrc = path.resolve(src);
  const absOut = path.resolve(outDir);

  if (!fs.existsSync(absSrc)) {
    console.error(`Source not found: ${absSrc}`);
    process.exit(1);
  }

  await ensureDir(absOut);

  let image;
  try {
    image = await Jimp.read(absSrc);
  } catch (e) {
    console.error(`Failed to read source image: ${e.message}`);
    process.exit(1);
  }

  console.log(`Generating icons from ${absSrc} -> ${absOut}`);
  for (const size of sizes) {
    try {
      const cloned = image.clone();
      cloned.resize({ w: size, h: size, mode: ResizeStrategy.BILINEAR });
      const outPath = path.join(absOut, `icon-${size}.png`);
      await cloned.write(outPath);
      console.log(`✔ icon-${size}.png`);
    } catch (e) {
      console.error(`✖ Failed to generate size ${size}: ${e.message}`);
      process.exitCode = 1;
    }
  }
}

main();
