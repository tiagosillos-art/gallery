import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const artesDir = path.join(projectRoot, 'artes');
const indexFile = path.join(artesDir, 'index.json');

if (!fs.existsSync(artesDir)) {
  console.error('Pasta não encontrada:', artesDir);
  process.exit(1);
}

const files = fs.readdirSync(artesDir)
  .filter((name) => /\.jpg$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

fs.writeFileSync(indexFile, JSON.stringify(files, null, 2) + '\n', 'utf8');
console.log(`index.json gerado com ${files.length} arquivo(s).`);
