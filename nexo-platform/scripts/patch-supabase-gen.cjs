const fs = require('fs');
const p = 'src/shared/types/supabase.gen.ts';
const text = fs.readFileSync(p, 'utf16le');
const hadBom = text.charCodeAt(0) === 0xfeff;
const body = hadBom ? text.slice(1) : text;
const lines = body.split('\n');

const tenantsIdx = lines.findIndex((l) => l.trim() === 'tenants: {');
if (tenantsIdx === -1) throw new Error('tenants block not found');

function findAfter(from, marker) {
  const idx = lines.slice(from).findIndex((l) => l.trim() === marker);
  if (idx === -1) throw new Error(`marker not found: ${marker}`);
  return from + idx;
}

const rowIdx = findAfter(tenantsIdx + 1, 'Row: {');
const insIdx = findAfter(rowIdx + 1, 'Insert: {');
const updIdx = findAfter(insIdx + 1, 'Update: {');
const endIdx = findAfter(updIdx + 1, 'Relationships: []');

function insertAfterBlock(blockStart, blockEnd, fieldMarker, insertLine) {
  const idx = lines.slice(blockStart, blockEnd).findIndex((l) => l.trim() === fieldMarker);
  if (idx === -1) throw new Error(`field not found: ${fieldMarker}`);
  const target = blockStart + idx;
  const cr = lines[target].endsWith('\r');
  lines.splice(target + 1, 0, insertLine + (cr ? '\r' : ''));
}

insertAfterBlock(rowIdx, insIdx, 'deleted_at: string | null', '          description: string | null');
insertAfterBlock(insIdx, updIdx, 'deleted_at?: string | null', '          description?: string | null');
insertAfterBlock(updIdx, endIdx, 'deleted_at?: string | null', '          description?: string | null');

const out = (hadBom ? '\ufeff' : '') + lines.join('\n');
fs.writeFileSync(p, out, 'utf16le');
console.log('patched supabase.gen.ts tenants.description (3 blocks)');
