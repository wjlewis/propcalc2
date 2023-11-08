import { readFileSync } from 'fs';
import read from './syntax/read.js';
import synth from './synth.js';

const sourcePath = process.argv[2];

if (!sourcePath) {
  console.error(`usage: propcalc2 <source-file>`);
  process.exit(1);
}

try {
  const source = readFileSync(sourcePath, 'utf-8');

  try {
    synth(read(source));
    console.log('all good =)');
  } catch (err) {
    console.error(`check failed: ${err.message}`);
  }
} catch {
  console.error('failed to open file');
}
