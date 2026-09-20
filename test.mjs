// Test suite for PayLink. No framework, node >= 18.  Run: node test.mjs
import fs from 'node:fs';

// Minimal DOM stubs so app.js can load headlessly.
globalThis.document = { readyState: 'loading', addEventListener() {}, getElementById() { return null; } };
globalThis.window = globalThis;


const src = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
new Function(src)();
const P = globalThis.PayLink;

let pass = 0, fail = 0;
function eq(actual, expected, label) {
  if (actual === expected) { pass++; console.log('  ok  ' + label); }
  else { fail++; console.log('FAIL  ' + label + '\n       expected: ' + expected + '\n       actual:   ' + actual); }
}
function throws(fn, label) {
  try { fn(); fail++; console.log('FAIL  ' + label + ' (expected throw)'); }
  catch (e) { pass++; console.log('  ok  ' + label); }
}

console.log('\n-- amount math (exact, no float) --');
eq(P.toBaseUnits('1', 6), '1000000', '1 USDC -> 1e6 base units');
eq(P.toBaseUnits('25.00', 6), '25000000', '25.00 USDC');
eq(P.toBaseUnits('0.000001', 6), '1', '1 micro-USDC');
eq(P.toBaseUnits('1', 18), '1000000000000000000', '1 ETH -> wei');
eq(P.toBaseUnits(' 3.5 ', 6), '3500000', 'whitespace tolerated');
eq(P.toBaseUnits('0.1', 18), '100000000000000000', '0.1 ETH');
eq(P.fromBaseUnits('25000000', 6), '25', 'roundtrip 25 USDC');
eq(P.fromBaseUnits('1', 6), '0.000001', 'roundtrip micro');
throws(() => P.toBaseUnits('0', 6), 'zero rejected');
throws(() => P.toBaseUnits('', 6), 'empty rejected');
throws(() => P.toBaseUnits('1.2.3', 6), 'malformed rejected');
throws(() => P.toBaseUnits('-5', 6), 'negative rejected');
eq(P.toBaseUnits('0.1234567', 6), '123456', 'over-precision truncated, never rounded up');

console.log('\n-- EIP-55 checksum --');
const CHK = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
eq(P.toChecksumAddress(CHK.toLowerCase()), CHK, 'known EIP-55 vector');
eq(P.isValidAddress(CHK), true, 'valid checksummed accepted');
eq(P.isValidAddress(CHK.toLowerCase()), true, 'all-lowercase is valid (unchecksummed)');
eq(P.isValidAddress('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAeD'), false, 'bad checksum rejected');
eq(P.isValidAddress('0xdeadbeef'), false, 'short address rejected');
eq(P.isValidAddress('0x' + 'g'.repeat(40)), false, 'non-hex rejected');

console.log('\n-- EIP-681 URIs --');
const to = '0xb0F4860d56d25a2168a836ae2C34bF657FE3e9f6';
eq(P.buildUri({ to, chainId: '8453', token: 'native', units: '' }),
   'ethereum:' + to + '@8453', 'native, no amount');
eq(P.buildUri({ to, chainId: '8453', token: 'native', units: '1000000000000000' }),
   'ethereum:' + to + '@8453?value=1000000000000000', 'native with wei');
eq(P.buildUri({ to, chainId: '8453', token: 'USDC', units: '25000000' }),
   'ethereum:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913@8453/transfer?address=' + to + '&uint256=25000000',
   'ERC-20 USDC on Base');
eq(P.buildUri({ to, chainId: '137', token: 'USDC', units: '1000000' }),
   'ethereum:0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359@137/transfer?address=' + to + '&uint256=1000000',
   'ERC-20 USDC on Polygon');
throws(() => P.buildUri({ to, chainId: '137', token: 'DAI', units: '1' }), 'unsupported token/chain throws');

// Every declared token must be a 40-hex address with sane decimals.
console.log('\n-- token registry sanity --');
let bad = 0;
for (const [cid, toks] of Object.entries(P.TOKENS)) {
  for (const [sym, t] of Object.entries(toks)) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(t.addr)) { bad++; console.log('  bad addr ' + cid + '/' + sym); }
    if (t.dec !== 6 && t.dec !== 18) { bad++; console.log('  bad dec ' + cid + '/' + sym); }
    if (!P.CHAINS[cid]) { bad++; console.log('  token on unknown chain ' + cid); }
  }
}
eq(bad, 0, 'all tokens well-formed and on known chains');

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILURES') + ': ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
