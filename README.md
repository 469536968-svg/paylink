# PayLink

**Offline, dependency-free crypto payment link & QR generator.**

Generate [EIP-681](https://eips.ethereum.org/EIPS/eip-681) payment URIs and QR codes
for stablecoins (USDC / USDT / DAI) and native tokens across Base, Ethereum,
Optimism, Arbitrum, Polygon, BNB Chain and Avalanche — entirely in the browser.

- **No server.** It is a static page. Drop it in a bucket, a repo Pages site, or a USB stick.
- **No signup. No tracking. No analytics.** Your recipient address never leaves the tab.
- **No build step.** Open `index.html`.
- Exact decimal → base-unit math via `BigInt` (no float rounding, ever).
- EIP-55 checksum validation on the recipient, so a typo can't silently send funds into the void.
- QR is rendered as **SVG** — crisp at any size, printable, one-click download.

## Use

Open `index.html`. Fill in the recipient, pick chain + asset, optionally set an
amount, and copy the link or download the QR.

## Supported chains

| Chain | ID | Assets |
|---|---|---|
| Base | 8453 | ETH, USDC, USDT, DAI |
| Base Sepolia | 84532 | ETH, USDC |
| Ethereum | 1 | ETH, USDC, USDT, DAI |
| OP Mainnet | 10 | ETH, USDC, USDT |
| Arbitrum One | 42161 | ETH, USDC, USDT |
| Polygon | 137 | POL, USDC, USDT |
| BNB Chain | 56 | BNB, USDT |
| Avalanche C-Chain | 43114 | AVAX, USDC |

## URI format

Native transfer:

```
ethereum:<recipient>@<chainId>?value=<wei>
```

ERC-20 transfer:

```
ethereum:<tokenContract>@<chainId>/transfer?address=<recipient>&uint256=<baseUnits>
```

## Development

```bash
python -m http.server 8080   # then visit http://localhost:8080
```

There are no runtime dependencies. `vendor/qrcode.js` is
[qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko
Arase (MIT) — vendored on purpose so the page works with zero network access.

## License

MIT. See `LICENSE`.

## Support

If PayLink saved you time, pay what it was worth — USDC on Base:

```
0xb0F4860d56d25a2168a836ae2C34bF657FE3e9f6
```

Or open the page and click **Use as recipient**.
