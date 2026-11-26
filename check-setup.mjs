#!/usr/bin/env node
// Checks that PMC ID is live and set up safely. Needs Node 18 or newer. It only reads; it changes nothing.
//   node check-setup.mjs
//   node check-setup.mjs --site https://accounts.pmcstudios.uk
import dns from 'node:dns/promises';

const i = process.argv.indexOf('--site');
const SITE = (i > 0 && process.argv[i + 1] ? process.argv[i + 1] : 'https://accounts.pmcstudios.uk').replace(/\/+$/, '');
const host = new URL(SITE).hostname;
let bad = 0;
const ok = (t) => console.log('  ok    ' + t);
const fix = (t, how) => { bad++; console.log('  FIX   ' + t + '\n        -> ' + how); };
const get = async (u) => { try { const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(15000) }); return { status: r.status, text: await r.text(), headers: r.headers }; } catch (e) { return { status: 0, text: String(e && e.message || e), headers: new Headers() }; } };

console.log('\nPMC ID check\n');
console.log('1. Domain');
try { const c = await dns.resolveCname(host).catch(() => []); const a = await dns.resolve4(host).catch(() => []); (c.length || a.length) ? ok(host + ' points somewhere (' + (c[0] || a[0]) + ')') : fix(host + ' has no DNS record', 'Add a CNAME record for "' + host.split('.')[0] + '" pointing to <your-github-username>.github.io'); } catch { fix('could not look up ' + host, 'Check the domain is spelled right.'); }

console.log('2. Site');
const home = await get(SITE + '/');
if (home.status !== 200) fix('the site did not load (' + (home.status || home.text) + ')', 'GitHub repo > Actions: check the last "Deploy PMC ID" run is green. Then Settings > Pages > Source must be "GitHub Actions".');
else {
  ok('the site loads');
  /Content-Security-Policy/i.test(home.text) ? ok('it has a content security policy') : fix('no content security policy in the page', 'Put the Content-Security-Policy line back in src/app/layout.tsx.');
  /sb_secret_|service_role/.test(home.text) ? fix('a SECRET key is in the page', 'Remove it now and rotate it in Supabase. A secret key must never be on a website.') : ok('no secret keys in the page');
}
const nf = await get(SITE + '/this-page-does-not-exist');
nf.status === 404 ? ok('missing pages show the Not found page') : fix('missing pages do not show a 404 (got ' + nf.status + ')', 'Run npm run build:static again: it writes 404.html.');
const rb = await get(SITE + '/robots.txt');
/Disallow:\s*\/\s*$/m.test(rb.text) ? fix('robots.txt blocks search engines', 'Put public/robots.txt back: User-agent: * and Allow: /') : ok('search engines are allowed in');

console.log(bad ? '\n' + bad + ' thing(s) to fix.\n' : '\nAll good.\n');
process.exit(bad ? 1 : 0);
