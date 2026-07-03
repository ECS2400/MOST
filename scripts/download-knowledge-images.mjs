/**
 * Pobiera 10 zdjęć z Unsplash do assets/knowledge/ (offline).
 */
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, '../assets/knowledge');

const PHOTOS = [
  'photo-1516589178581-6cd7833ae3b2',
  'photo-1507003211169-0a1dd7228f2d',
  'photo-1529156069898-49953e39b3ac',
  'photo-1438761681033-6461ffad8d80',
  'photo-1573496359142-b8d87734a5a2',
  'photo-1516321318423-f06f85e504b3',
  'photo-1524504388940-b1c1722653e1',
  'photo-1600880292203-757bb62b4baf',
  'photo-1522075469751-3a6694fb2f61',
  'photo-1511895426328-dc8714191300',
];

mkdirSync(outDir, { recursive: true });

for (let i = 0; i < PHOTOS.length; i++) {
  const num = String(i + 1).padStart(2, '0');
  const url = `https://images.unsplash.com/${PHOTOS[i]}?auto=format&fit=crop&w=800&q=80`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${num}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(join(outDir, `knowledge-${num}.jpg`), buf);
  console.log(`OK knowledge-${num}.jpg`);
}

console.log('Done — 10 images in assets/knowledge/');
