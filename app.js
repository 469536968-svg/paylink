/* PayLink — client-side crypto payment link + QR generator.
 * Zero network calls. Zero tracking. No dependencies except a vendored QR lib.
 * MIT License.
 */
(function () {
  "use strict";

  /* ---------------- chain + token registry ---------------- */
  var CHAINS = {
    "8453":  { name: "Base",           native: "ETH",  explorer: "https://basescan.org" },
    "84532": { name: "Base Sepolia",   native: "ETH",  explorer: "https://sepolia.basescan.org" },
    "1":     { name: "Ethereum",       native: "ETH",  explorer: "https://etherscan.io" },
    "10":    { name: "OP Mainnet",     native: "ETH",  explorer: "https://optimistic.etherscan.io" },
    "42161": { name: "Arbitrum One",   native: "ETH",  explorer: "https://arbiscan.io" },
    "137":   { name: "Polygon",        native: "POL",  explorer: "https://polygonscan.com" },
    "56":    { name: "BNB Chain",      native: "BNB",  explorer: "https://bscscan.com" },
    "43114": { name: "Avalanche C",    native: "AVAX", explorer: "https://snowtrace.io" }
  };

  // Well-known ERC-20s, keyed by chainId.
  var TOKENS = {
    "8453":  { USDC: { addr: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", dec: 6 },  USDT: { addr: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", dec: 6 },  DAI: { addr: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", dec: 18 } },
    "84532": { USDC: { addr: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", dec: 6 } },
    "1":     { USDC: { addr: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", dec: 6 },  USDT: { addr: "0xdAC17F958D2ee523a2206206994597C13D831ec7", dec: 6 },  DAI: { addr: "0x6B175474E89094C44Da98b954EedeAC495271d0F", dec: 18 } },
    "10":    { USDC: { addr: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", dec: 6 },  USDT: { addr: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", dec: 6 } },
    "42161": { USDC: { addr: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", dec: 6 },  USDT: { addr: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", dec: 6 } },
    "137":   { USDC: { addr: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", dec: 6 },  USDT: { addr: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", dec: 6 } },
    "56":    { USDT: { addr: "0x55d398326f99059fF775485246999027B3197955", dec: 18 } },
    "43114": { USDC: { addr: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", dec: 6 } }
  };

  /* ---------------- address helpers ---------------- */
  var ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

  function keccak256Hex(hexNo0x) {
    // Minimal Keccak-256 (EIP-55 checksum only). Public-domain style implementation.
    var RC = [0x1n,0x8082n,0x800000000000808an,0x8000000080008000n,0x808bn,0x80000001n,0x8000000080008081n,0x8000000000008009n,
      0x8an,0x88n,0x80008009n,0x8000000an,0x8000808bn,0x800000000000008bn,0x8000000000008089n,0x8000000000008003n,
      0x8000000000008002n,0x8000000000000080n,0x800an,0x800000008000000an,0x8000000080008081n,0x8000000000008080n,
      0x80000001n,0x8000000080008008n];
    var R = [[0,36,3,41,18],[1,44,10,45,2],[62,6,43,15,61],[28,55,25,21,56],[27,20,39,8,14]];
    var M = 0xffffffffffffffffn; // 64-bit lane mask
    function rotl(x,n){ n=BigInt(n); return ((x<<n)|(x>>(64n-n))) & M; }
    var s = new Array(25).fill(0n);
    var rate = 136; // 1088 bits
    // pad
    var msg = hexNo0x;
    var bytes = [];
    for (var i=0;i<msg.length;i+=2) bytes.push(parseInt(msg.substr(i,2),16));
    bytes.push(0x01);
    while ((bytes.length % rate) !== rate-1) bytes.push(0x00);
    bytes.push(0x80);
    for (var off=0; off<bytes.length; off+=rate) {
      for (var i2=0;i2<rate/8;i2++){
        var v=0n;
        for (var b=7;b>=0;b--) v = (v<<8n) | BigInt(bytes[off+i2*8+b]);
        s[i2] ^= v;
      }
      // keccak-f[1600]
      for (var rnd=0; rnd<24; rnd++) {
        var C = new Array(5), D = new Array(5), B = new Array(25);
        for (var x=0;x<5;x++) C[x] = s[x] ^ s[x+5] ^ s[x+10] ^ s[x+15] ^ s[x+20];
        for (var x2=0;x2<5;x2++) D[x2] = C[(x2+4)%5] ^ rotl(C[(x2+1)%5],1);
        for (var x3=0;x3<5;x3++) for (var y=0;y<5;y++) s[x3+5*y] ^= D[x3];
        for (var x4=0;x4<5;x4++) for (var y2=0;y2<5;y2++){
          var idx = R[x4][y2];
          B[y2 + 5*((2*x4+3*y2)%5)] = rotl(s[x4+5*y2], idx);
        }
        for (var x5=0;x5<5;x5++) for (var y3=0;y3<5;y3++) s[x5+5*y3] = B[x5+5*y3] ^ ((~B[(x5+1)%5+5*y3]) & B[(x5+2)%5+5*y3]);
        s[0] ^= RC[rnd];
      }
    }
    // Keccak output is the little-endian encoding of each lane, in lane order.
    var out = "";
    for (var i3=0;i3<4;i3++){
      var w = s[i3];
      for (var b2=0;b2<8;b2++){ out += ("0"+Number(w & 0xffn).toString(16)).slice(-2); w >>= 8n; }
    }
    return out;
  }

  function toChecksumAddress(addr) {
    var a = addr.toLowerCase().replace(/^0x/, "");
    // EIP-55 hashes the lowercase address as ASCII bytes (40 bytes),
    // so re-encode the text to a hex string before feeding the hasher.
    var asciiHex = "";
    for (var j=0;j<a.length;j++) asciiHex += ("0"+a.charCodeAt(j).toString(16)).slice(-2);
    var hash;
    try { hash = keccak256Hex(asciiHex); } catch (e) { return addr; }
    var out = "0x";
    for (var i=0;i<a.length;i++) {
      out += parseInt(hash[i],16) >= 8 ? a[i].toUpperCase() : a[i];
    }
    return out;
  }

  function isValidAddress(addr) {
    if (!ADDR_RE.test(addr)) return false;
    // If mixed case, enforce EIP-55.
    var body = addr.slice(2);
    if (body === body.toLowerCase() || body === body.toUpperCase()) return true;
    return toChecksumAddress(addr) === addr;
  }

  /* ---------------- amount math (exact, BigInt) ---------------- */
  function toBaseUnits(amountStr, decimals) {
    var s = String(amountStr).trim();
    if (!/^\d*\.?\d*$/.test(s) || s === "" || s === ".") throw new Error("Invalid amount");
    var parts = s.split(".");
    var whole = parts[0] || "0";
    var frac = (parts[1] || "");
    if (frac.length > decimals) frac = frac.slice(0, decimals); // truncate, never round up
    frac = (frac + new Array(decimals + 1).join("0")).slice(0, decimals);
    var n = BigInt(whole + frac);
    if (n <= 0n) throw new Error("Amount must be > 0");
    return n.toString();
  }

  function fromBaseUnits(units, decimals) {
    var s = units.toString().padStart(decimals + 1, "0");
    var whole = s.slice(0, s.length - decimals);
    var frac = s.slice(s.length - decimals).replace(/0+$/, "");
    return frac ? whole + "." + frac : whole;
  }

  /* ---------------- EIP-681 URI ---------------- */
  function buildUri(o) {
    var chainId = o.chainId;
    if (o.token === "native") {
      var u = "ethereum:" + o.to + "@" + chainId;
      if (o.units) u += "?value=" + o.units;
      return u;
    }
    var t = TOKENS[chainId] && TOKENS[chainId][o.token];
    if (!t) throw new Error("Token not available on this chain");
    return "ethereum:" + t.addr + "@" + chainId + "/transfer?address=" + o.to + "&uint256=" + o.units;
  }

  /* ---------------- UI ---------------- */
  var $ = function (id) { return document.getElementById(id); };

  function populateChains() {
    var sel = $("chain");
    Object.keys(CHAINS).forEach(function (id) {
      var opt = document.createElement("option");
      opt.value = id;
      opt.textContent = CHAINS[id].name + " (" + id + ")";
      sel.appendChild(opt);
    });
  }

  function populateTokens() {
    var chainId = $("chain").value;
    var sel = $("token");
    var prev = sel.value;
    sel.innerHTML = "";
    var nat = document.createElement("option");
    nat.value = "native";
    nat.textContent = "Native " + CHAINS[chainId].native;
    sel.appendChild(nat);
    var toks = TOKENS[chainId] || {};
    Object.keys(toks).forEach(function (sym) {
      var o = document.createElement("option");
      o.value = sym;
      o.textContent = sym;
      sel.appendChild(o);
    });
    if ([].some.call(sel.options, function (o) { return o.value === prev; })) sel.value = prev;
  }

  function render() {
    var status = $("status");
    status.className = "status";
    status.textContent = "";

    var to = $("to").value.trim();
    var chainId = $("chain").value;
    var token = $("token").value;
    var amount = $("amount").value.trim();
    var memo = $("memo").value.trim();

    if (!to) { return; }
    if (!isValidAddress(to)) { status.className = "status err"; status.textContent = "Recipient is not a valid EVM address (checksum mismatch?)."; return; }
    var toC = toChecksumAddress(to);

    var decimals = 18;
    if (token !== "native") {
      var t = TOKENS[chainId][token];
      decimals = t.dec;
    }

    var units = "";
    if (amount) {
      try { units = toBaseUnits(amount, decimals); }
      catch (e) { status.className = "status err"; status.textContent = e.message; return; }
    }

    var uri;
    try { uri = buildUri({ to: toC, chainId: chainId, token: token, units: units }); }
    catch (e) { status.className = "status err"; status.textContent = e.message; return; }

    $("uri").value = uri;
    if (memo) { $("uri").value = uri; }

    // QR
    var qrBox = $("qr");
    qrBox.innerHTML = "";
    try {
      var qr = qrcode(0, "M");
      qr.addData(uri);
      qr.make();
      var svg = qr.createSvgTag({ cellSize: 5, margin: 12, scalable: true });
      qrBox.innerHTML = svg;
      $("dl").disabled = false;
      $("dl").dataset.svg = svg;
    } catch (e) {
      qrBox.innerHTML = "<p class='err'>Payload too large for QR. Reduce memo length.</p>";
      $("dl").disabled = true;
    }

    // human summary
    var humane = amount ? (amount + " " + (token === "native" ? CHAINS[chainId].native : token)) : "(any amount)";
    status.className = "status ok";
    status.textContent = "Ready — request " + humane + " on " + CHAINS[chainId].name + " to " + toC.slice(0,6) + "…" + toC.slice(-4);
  }

  function download() {
    var svg = $("dl").dataset.svg;
    if (!svg) return;
    var blob = new Blob([svg], { type: "image/svg+xml" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "payment-qr.svg";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function copy() {
    var el = $("uri");
    el.select();
    el.setSelectionRange(0, 99999);
    try { document.execCommand("copy"); } catch (e) {}
    if (navigator.clipboard) { navigator.clipboard.writeText(el.value).catch(function(){}); }
    $("copyState").textContent = "copied";
    setTimeout(function(){ $("copyState").textContent = ""; }, 1200);
  }

  function boot() {
    populateChains();
    populateTokens();
    $("chain").addEventListener("change", function () { populateTokens(); render(); });
    ["to","amount","memo","token"].forEach(function (id) {
      $(id).addEventListener("input", render);
      $(id).addEventListener("change", render);
    });
    $("copy").addEventListener("click", copy);
    $("dl").addEventListener("click", download);
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // expose for tests
  window.PayLink = { keccak256Hex: keccak256Hex, toBaseUnits: toBaseUnits, fromBaseUnits: fromBaseUnits, buildUri: buildUri, toChecksumAddress: toChecksumAddress, isValidAddress: isValidAddress, CHAINS: CHAINS, TOKENS: TOKENS };
})();
