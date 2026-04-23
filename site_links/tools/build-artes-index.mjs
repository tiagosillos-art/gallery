import fs from 'node:fs';
import path from 'node:path';

const targetDir = path.resolve(process.cwd(), 'site_links/artes');
const outputFile = path.join(targetDir, 'index.json');

if (!fs.existsSync(targetDir)) {
  console.error(`Pasta não encontrada: ${targetDir}`);
  process.exit(1);
}

const files = fs
  .readdirSync(targetDir, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => /\.jpg$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

const payload = {
  generatedAt: new Date().toISOString(),
  files
};

fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`Manifesto gerado com ${files.length} arquivo(s): ${outputFile}`);
