// Encrypts app.js into content.enc.json using the credentials in .env.
// Run after every change to app.js or .env:  node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const env = Object.fromEntries(
  readFileSync(new URL('./.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^(['"])(.*)\1$/, '$2')]; })
);
const { ONEAI_USERNAME: user, ONEAI_PASSWORD: pass } = env;
if (!user || !pass) throw new Error('.env must set ONEAI_USERNAME and ONEAI_PASSWORD');
const sessionDays = Number(env.SESSION_DAYS) || 7;

const ITER = 310000;
const enc = new TextEncoder();
const b64 = buf => Buffer.from(buf).toString('base64');

const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', enc.encode(`${user}\n${pass}`), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, readFileSync(new URL('./app.js', import.meta.url)));

writeFileSync(new URL('./content.enc.json', import.meta.url), JSON.stringify({ v: 1, iter: ITER, sessionDays, salt: b64(salt), iv: b64(iv), data: b64(data) }));
console.log(`content.enc.json written (session length: ${sessionDays} days)`);
