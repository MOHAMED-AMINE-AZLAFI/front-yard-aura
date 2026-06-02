import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outputDir = path.join(root, 'public', 'pins', 'test');
const reportPath = path.join(root, 'pin-preview-report.md');
const generatedRoot = path.join(process.env.CODEX_HOME ?? path.join(process.env.USERPROFILE, '.codex'), 'generated_images');

const pins = [
  {
    title: 'Curb Appeal Landscaping for Black Houses',
    category: 'Curb Appeal Landscaping Ideas',
    type: 'A',
    hook: 'Luxury Curb Appeal',
    file: 'curb-appeal-landscaping-for-black-houses-pin-a-test.jpg'
  },
  {
    title: 'Front Yard Flower Bed Ideas for Instant Curb Appeal',
    category: 'Front Yard Flower Bed Ideas',
    type: 'B',
    hook: 'Beautiful Flower Bed Ideas',
    file: 'front-yard-flower-bed-ideas-for-curb-appeal-pin-b-test.jpg'
  },
  {
    title: 'Front Yard Rock Landscaping With Decomposed Granite',
    category: 'Front Yard Landscaping With Rocks',
    type: 'B',
    hook: 'Low-Maintenance Stone Style',
    file: 'front-yard-rock-landscaping-with-decomposed-granite-pin-b-test.jpg'
  },
  {
    title: 'Low Maintenance Front Yard Ideas With Minimal Lawn',
    category: 'Low Maintenance Front Yard Landscaping',
    type: 'C',
    hook: 'Save For Later',
    file: 'low-maintenance-front-yard-ideas-with-minimal-lawn-pin-c-test.jpg'
  },
  {
    title: 'Modern Concrete Walkway Ideas for Front Yards',
    category: 'Modern Front Yard Landscaping',
    type: 'A',
    hook: 'Polished Entry Ideas',
    file: 'modern-front-yard-concrete-walkway-ideas-pin-a-test.jpg'
  },
  {
    title: 'Small Front Yard Ideas With One Tree',
    category: 'Small Front Yard Landscaping Ideas',
    type: 'C',
    hook: 'Save This Small Yard Idea',
    file: 'small-front-yard-ideas-with-a-single-tree-pin-c-test.jpg'
  },
  {
    title: 'Walkway Landscaping Ideas for a Polished Front Entry',
    category: 'Walkway Landscaping Ideas',
    type: 'A',
    hook: 'Polished Entry Ideas',
    file: 'walkway-landscaping-ideas-for-a-polished-entry-pin-a-test.jpg'
  },
  {
    title: 'Budget Front Yard Mailbox Makeover Ideas',
    category: 'Front Yard Landscaping On A Budget',
    type: 'B',
    hook: 'Save This Affordable Look',
    file: 'budget-front-yard-mailbox-makeover-ideas-pin-b-test.jpg'
  },
  {
    title: 'Luxury Front Yard Curb Appeal Ideas',
    category: 'Curb Appeal Landscaping Ideas',
    type: 'A',
    hook: 'Luxury Curb Appeal',
    file: 'front-yard-luxury-curb-appeal-ideas-pin-a-test.jpg'
  },
  {
    title: 'Drought-Tolerant Front Yard Landscaping Ideas That Still Feel Lush',
    category: 'Low Maintenance Front Yard Landscaping',
    type: 'C',
    hook: 'Save For Later',
    file: 'drought-tolerant-front-yard-landscaping-ideas-pin-c-test.jpg'
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

function wrapText(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 5);
}

function overlaySvg(pin) {
  const titleLines = wrapText(pin.title, pin.title.length > 58 ? 20 : pin.title.length > 44 ? 22 : 25);
  const titleSize = titleLines.length >= 5 ? 48 : titleLines.length === 4 ? 54 : titleLines.length === 3 ? 62 : 72;
  const lineHeight = titleSize * 0.92;
  const titleCenter = 610;
  const titleStart = titleCenter - ((titleLines.length - 1) * lineHeight) / 2;
  const panelHeight = titleLines.length * lineHeight + 86;
  const panelY = titleCenter - panelHeight / 2;
  const titleTspans = titleLines
    .map((line, index) => `<tspan x="500" y="${titleStart + index * lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');

  return `
    <svg width="1000" height="1500" viewBox="0 0 1000 1500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#07140f" stop-opacity="0.46"/>
          <stop offset="0.32" stop-color="#07140f" stop-opacity="0.18"/>
          <stop offset="0.58" stop-color="#07140f" stop-opacity="0.34"/>
          <stop offset="1" stop-color="#07140f" stop-opacity="0.78"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000000" flood-opacity="0.55"/>
        </filter>
      </defs>
      <rect width="1000" height="1500" fill="url(#shade)"/>
      <text x="500" y="112" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" letter-spacing="4" fill="#f7efe2" filter="url(#shadow)">FRONT YARD AURA</text>
      <rect x="92" y="${panelY}" width="816" height="${panelHeight}" fill="#07140f" fill-opacity="0.30"/>
      <text text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${titleSize}" font-weight="700" fill="#fff8ee" filter="url(#shadow)">${titleTspans}</text>
      <g transform="translate(500 1320)">
        <rect x="-315" y="-52" width="630" height="104" rx="0" fill="#f7efe2" fill-opacity="0.94"/>
        <text y="13" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="800" fill="#102118">${escapeXml(pin.hook)}</text>
      </g>
    </svg>`;
}

fs.mkdirSync(outputDir, { recursive: true });

const sources = newestGeneratedImages(pins.length);
if (sources.length < pins.length) {
  throw new Error(`Expected ${pins.length} generated source images, found ${sources.length}.`);
}

for (const [index, pin] of pins.entries()) {
  const output = path.join(outputDir, pin.file);
  await sharp(sources[index])
    .resize(1000, 1500, { fit: 'cover', position: 'attention' })
    .composite([{ input: Buffer.from(overlaySvg(pin)), top: 0, left: 0 }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(output);
}

const reportRows = pins
  .map((pin) => `| ${pin.title} | ${pin.file} | ${pin.category} | ${pin.type} |`)
  .join('\n');

fs.writeFileSync(
  reportPath,
  `# Pin Preview Report\n\nGenerated 10 test Pinterest Pins only. No 900-image production batch was created.\n\n| Article title | Image filename | Category | Pin type (A/B/C) |\n| --- | --- | --- | --- |\n${reportRows}\n`,
  'utf8'
);

console.log(JSON.stringify({ outputDir: path.relative(root, outputDir), report: path.relative(root, reportPath), pins: pins.length }, null, 2));
