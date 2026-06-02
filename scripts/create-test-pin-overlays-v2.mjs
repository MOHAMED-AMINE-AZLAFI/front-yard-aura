import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outputDir = path.join(root, 'public', 'pins', 'test-v2');
const reportPath = path.join(root, 'pin-preview-report-v2.md');
const generatedRoot = path.join(process.env.CODEX_HOME ?? path.join(process.env.USERPROFILE, '.codex'), 'generated_images');

const WIDTH = 1000;
const HEIGHT = 1500;
const SAFE_X = 96;
const TITLE_BOX_WIDTH = WIDTH - SAFE_X * 2;

const pins = [
  {
    title: 'Walkway Landscaping Ideas for a Polished Front Entry',
    category: 'Walkway Landscaping Ideas',
    type: 'A',
    hook: 'Polished Entry Ideas',
    file: 'walkway-landscaping-ideas-polished-entry-pin-a-test-v2.jpg',
    titleZone: 595
  },
  {
    title: 'Walkway Landscaping Ideas for a Polished Front Entry',
    category: 'Walkway Landscaping Ideas',
    type: 'B',
    hook: 'Save For Later',
    file: 'walkway-landscaping-ideas-polished-entry-pin-b-test-v2.jpg',
    titleZone: 560
  },
  {
    title: 'Walkway Landscaping Ideas for a Polished Front Entry',
    category: 'Walkway Landscaping Ideas',
    type: 'C',
    hook: 'Welcoming Walkway Style',
    file: 'walkway-landscaping-ideas-polished-entry-pin-c-test-v2.jpg',
    titleZone: 610
  },
  {
    title: 'Front Yard Flower Bed Ideas for Instant Curb Appeal',
    category: 'Front Yard Flower Bed Ideas',
    type: 'A',
    hook: 'Seasonal Curb Appeal',
    file: 'front-yard-flower-bed-ideas-curb-appeal-pin-a-test-v2.jpg',
    titleZone: 590
  },
  {
    title: 'Front Yard Flower Bed Ideas for Instant Curb Appeal',
    category: 'Front Yard Flower Bed Ideas',
    type: 'B',
    hook: 'Beautiful Flower Bed Ideas',
    file: 'front-yard-flower-bed-ideas-curb-appeal-pin-b-test-v2.jpg',
    titleZone: 560
  },
  {
    title: 'Front Yard Flower Bed Ideas for Instant Curb Appeal',
    category: 'Front Yard Flower Bed Ideas',
    type: 'C',
    hook: 'Save This Garden Look',
    file: 'front-yard-flower-bed-ideas-curb-appeal-pin-c-test-v2.jpg',
    titleZone: 610
  },
  {
    title: 'Front Yard Rock Landscaping With Decomposed Granite',
    category: 'Front Yard Landscaping With Rocks',
    type: 'A',
    hook: 'Must-See Stone Ideas',
    file: 'front-yard-rock-landscaping-decomposed-granite-pin-a-test-v2.jpg',
    titleZone: 595
  },
  {
    title: 'Front Yard Rock Landscaping With Decomposed Granite',
    category: 'Front Yard Landscaping With Rocks',
    type: 'B',
    hook: 'Low-Maintenance Stone Style',
    file: 'front-yard-rock-landscaping-decomposed-granite-pin-b-test-v2.jpg',
    titleZone: 555
  },
  {
    title: 'Front Yard Rock Landscaping With Decomposed Granite',
    category: 'Front Yard Landscaping With Rocks',
    type: 'C',
    hook: 'Natural Rock Curb Appeal',
    file: 'front-yard-rock-landscaping-decomposed-granite-pin-c-test-v2.jpg',
    titleZone: 610
  },
  {
    title: 'Drought-Tolerant Front Yard Landscaping Ideas That Still Feel Lush',
    category: 'Low Maintenance Front Yard Landscaping',
    type: 'C',
    hook: 'Save For Later',
    file: 'drought-tolerant-front-yard-landscaping-ideas-pin-c-test-v2.jpg',
    titleZone: 585
  }
];

function newestGeneratedImages(count) {
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(png|jpe?g|webp)$/i.test(entry.name)) files.push(full);
    }
  };

  walk(generatedRoot);

  return files
    .map((file) => ({ file, mtime: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, count)
    .sort((a, b) => a.mtime - b.mtime)
    .map((item) => item.file);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function estimateWidth(text, fontSize) {
  return [...text].reduce((total, char) => {
    if (char === ' ') return total + fontSize * 0.3;
    if (/[il.,'’:-]/.test(char)) return total + fontSize * 0.28;
    if (/[MW]/.test(char)) return total + fontSize * 0.82;
    if (/[A-Z]/.test(char)) return total + fontSize * 0.62;
    return total + fontSize * 0.52;
  }, 0);
}

function wrapForSize(text, fontSize, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (estimateWidth(next, fontSize) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function fitTitle(text) {
  for (let fontSize = 76; fontSize >= 38; fontSize -= 2) {
    const lines = wrapForSize(text, fontSize, TITLE_BOX_WIDTH);
    const lineHeight = fontSize * 0.96;
    const widest = Math.max(...lines.map((line) => estimateWidth(line, fontSize)));
    if (lines.length <= 5 && widest <= TITLE_BOX_WIDTH && lines.length * lineHeight <= 300) {
      return { fontSize, lineHeight, lines };
    }
  }

  const fontSize = 38;
  return { fontSize, lineHeight: fontSize * 0.98, lines: wrapForSize(text, fontSize, TITLE_BOX_WIDTH).slice(0, 5) };
}

function fitHook(text) {
  for (let fontSize = 34; fontSize >= 24; fontSize -= 1) {
    if (estimateWidth(text, fontSize) <= 560) return fontSize;
  }
  return 24;
}

function overlaySvg(pin) {
  const title = fitTitle(pin.title);
  const titleHeight = title.lines.length * title.lineHeight;
  const panelPaddingY = 34;
  const panelY = Math.max(270, pin.titleZone - titleHeight / 2 - panelPaddingY);
  const panelHeight = titleHeight + panelPaddingY * 2;
  const titleStart = panelY + panelPaddingY + title.fontSize * 0.76;
  const titleTspans = title.lines
    .map((line, index) => `<tspan x="${WIDTH / 2}" y="${titleStart + index * title.lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');
  const hookSize = fitHook(pin.hook);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#07140f" stop-opacity="0.20"/>
          <stop offset="0.40" stop-color="#07140f" stop-opacity="0.04"/>
          <stop offset="0.66" stop-color="#07140f" stop-opacity="0.10"/>
          <stop offset="1" stop-color="#07140f" stop-opacity="0.34"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000000" flood-opacity="0.48"/>
        </filter>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#shade)"/>
      <text x="${WIDTH / 2}" y="102" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" letter-spacing="3.4" fill="#fff8ee" filter="url(#shadow)">FRONT YARD AURA</text>
      <rect x="${SAFE_X}" y="${panelY}" width="${TITLE_BOX_WIDTH}" height="${panelHeight}" rx="0" fill="#07140f" fill-opacity="0.18"/>
      <text text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${title.fontSize}" font-weight="700" fill="#fff8ee" filter="url(#shadow)">${titleTspans}</text>
      <g transform="translate(${WIDTH / 2} 1326)">
        <rect x="-304" y="-48" width="608" height="96" rx="0" fill="#fff8ee" fill-opacity="0.92"/>
        <text y="11" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${hookSize}" font-weight="800" fill="#102118">${escapeXml(pin.hook)}</text>
      </g>
    </svg>`;
}

fs.mkdirSync(outputDir, { recursive: true });

const sources = newestGeneratedImages(pins.length);
if (sources.length < pins.length) {
  throw new Error(`Expected ${pins.length} generated source images, found ${sources.length}.`);
}

for (const [index, pin] of pins.entries()) {
  await sharp(sources[index])
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
    .modulate({ brightness: 1.08, saturation: 1.03 })
    .composite([{ input: Buffer.from(overlaySvg(pin)), top: 0, left: 0 }])
    .jpeg({ quality: 91, mozjpeg: true })
    .toFile(path.join(outputDir, pin.file));
}

const reportRows = pins
  .map((pin) => `| ${pin.title} | ${pin.file} | ${pin.category} | ${pin.type} |`)
  .join('\n');

fs.writeFileSync(
  reportPath,
  `# Pin Preview Report V2\n\nGenerated 10 test-v2 Pinterest Pins only. No 900-image production batch was created.\n\nFixes applied:\n\n- Strict title safe area with ${SAFE_X}px side padding and ${TITLE_BOX_WIDTH}px max width.\n- Automatic title font sizing and measured line wrapping.\n- Lighter image overlay plus mild brightness lift.\n- A/B/C samples use visibly different compositions for the same article topics.\n- CTA remains inside a bottom mobile-safe zone.\n\n| Article title | Image filename | Category | Pin type (A/B/C) |\n| --- | --- | --- | --- |\n${reportRows}\n`,
  'utf8'
);

console.log(JSON.stringify({ outputDir: path.relative(root, outputDir), report: path.relative(root, reportPath), pins: pins.length }, null, 2));
