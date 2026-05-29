/**
 * zip.mjs <sourceDir> <outputFile>
 * Creates a ZIP archive of all files under sourceDir.
 */
import { createWriteStream, readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const [, , srcDir, outFile] = process.argv;

if (!srcDir || !outFile) {
  console.error('Usage: node scripts/zip.mjs <sourceDir> <outputFile>');
  process.exit(1);
}

// Collect all files recursively
function collectFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

const files = collectFiles(srcDir);
if (files.length === 0) {
  console.error(`No files found in ${srcDir}`);
  process.exit(1);
}

// Minimal ZIP writer (no external deps)
function writeUint16LE(buf, offset, value) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
}

function writeUint32LE(buf, offset, value) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
  buf[offset + 3] = (value >> 24) & 0xff;
}

function crc32(data) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const out = createWriteStream(outFile);
const centralDir = [];
let offset = 0;

function write(buf) {
  out.write(buf);
  offset += buf.length;
}

for (const filePath of files) {
  const entryName = relative(srcDir, filePath).replace(/\\/g, '/');
  const data = readFileSync(filePath);
  const crc = crc32(data);
  const nameBytes = Buffer.from(entryName, 'utf8');
  const now = new Date();
  const dosTime =
    (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  const localHeader = Buffer.alloc(30 + nameBytes.length);
  writeUint32LE(localHeader, 0, 0x04034b50); // signature
  writeUint16LE(localHeader, 4, 20); // version needed
  writeUint16LE(localHeader, 6, 0); // flags
  writeUint16LE(localHeader, 8, 0); // compression: stored
  writeUint16LE(localHeader, 10, dosTime);
  writeUint16LE(localHeader, 12, dosDate);
  writeUint32LE(localHeader, 14, crc);
  writeUint32LE(localHeader, 18, data.length);
  writeUint32LE(localHeader, 22, data.length);
  writeUint16LE(localHeader, 26, nameBytes.length);
  writeUint16LE(localHeader, 28, 0); // extra length
  nameBytes.copy(localHeader, 30);

  const entryOffset = offset;
  write(localHeader);
  write(data);

  centralDir.push({ entryName, nameBytes, crc, size: data.length, dosTime, dosDate, entryOffset });
}

const centralStart = offset;

for (const entry of centralDir) {
  const cdRecord = Buffer.alloc(46 + entry.nameBytes.length);
  writeUint32LE(cdRecord, 0, 0x02014b50);
  writeUint16LE(cdRecord, 4, 20);
  writeUint16LE(cdRecord, 6, 20);
  writeUint16LE(cdRecord, 8, 0);
  writeUint16LE(cdRecord, 10, 0);
  writeUint16LE(cdRecord, 12, entry.dosTime);
  writeUint16LE(cdRecord, 14, entry.dosDate);
  writeUint32LE(cdRecord, 16, entry.crc);
  writeUint32LE(cdRecord, 20, entry.size);
  writeUint32LE(cdRecord, 24, entry.size);
  writeUint16LE(cdRecord, 28, entry.nameBytes.length);
  writeUint16LE(cdRecord, 30, 0);
  writeUint16LE(cdRecord, 32, 0);
  writeUint16LE(cdRecord, 34, 0);
  writeUint16LE(cdRecord, 36, 0);
  writeUint32LE(cdRecord, 38, 0);
  writeUint32LE(cdRecord, 42, entry.entryOffset);
  entry.nameBytes.copy(cdRecord, 46);
  write(cdRecord);
}

const centralSize = offset - centralStart;
const eocd = Buffer.alloc(22);
writeUint32LE(eocd, 0, 0x06054b50);
writeUint16LE(eocd, 4, 0);
writeUint16LE(eocd, 6, 0);
writeUint16LE(eocd, 8, centralDir.length);
writeUint16LE(eocd, 10, centralDir.length);
writeUint32LE(eocd, 12, centralSize);
writeUint32LE(eocd, 16, centralStart);
writeUint16LE(eocd, 20, 0);
write(eocd);

out.end(() => {
  console.log(`Created ${outFile} (${offset} bytes, ${files.length} files)`);
});
