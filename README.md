# Smart Dev Tools

A local-first developer workspace built with Vue 3, TypeScript and Tauri 2.

## Tools

- **Text / File Hash**: real SHA-256, SHA-512, SHA-1 and MD5; UTF-8, hex and Base64 input; choose or drop a file, then hash incrementally with progress and cancellation.
- **Digest formatting**: hexadecimal upper/lowercase, spaces/colons/dashes, Base64/Base64URL, exact copy/export and expected-checksum comparison.
- **HMAC**: SHA-256/SHA-512, explicit message/key encodings; keys stay in session memory.
- **RSA Inspector**: parse unencrypted PKCS#1, PKCS#8 and SPKI; inspect actual components, export the public key and calculate SPKI DER fingerprints.
- **JWT Decoder**: unchanged claims and readable dates. Decoding does **not** verify the signature or trust claims.
- **Certificate Inspector / TLS Checker**: local PEM inspection and native TLS chain inspection. Local parsing is not trust validation; TLS uses system/bundled roots, not a revocation check.
- **Base64 & Hex**, **URL Toolkit**, **JSON Formatter** (preserves numeric precision and duplicate keys), **UUID v4 Generator**.
- **Text Diff**, **Regex Tester**, **Markdown Editor**, **Text Analyzer**, **Date Converter**, **QR Toolkit** (generate, copy/export PNG, scan an image).

## Workspace

Search tools with **Cmd/Ctrl+K**, pin favorites, revisit recent tools, collapse the sidebar and choose light, dark or system appearance. The desktop window is resizable (minimum 720 × 520).

Tool drafts and results survive navigation **only in memory**. Closing/reloading the app or choosing **Clear session data** discards them. Only appearance, sidebar, favorite/recent tool IDs and update preferences are stored locally. Explicit clipboard/export actions put data in the system clipboard or a file you choose; clear-session does not erase those copies.

Processing is local. TLS checks contact the server you enter; the desktop app checks GitHub for updates at most once per day after a successful automatic check (or on demand). Explicitly opening a link leaves the app. Markdown previews omit embedded resources, CSS and active content to avoid implicit network requests.

## Development

Requirements: Node.js 20.19+ (or a compatible newer LTS), npm, Rust and the platform's [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). The CLI is included; no global installation is needed.

```sh
npm ci
npm run check               # Algorithm/parser regression checks
npm run dev                 # Browser preview; no native certificate IPC
npm run tauri dev           # Desktop application
npm run build               # Type-check and production frontend build
npm run tauri build         # Native packages for the current platform
cargo test --manifest-path src-tauri/Cargo.toml --lib --locked
```

Use **package-lock.json / npm ci** as the single dependency source. Do not mix package managers. Restart the dev server after reinstalling dependencies.

Downloads: [releases](https://github.com/smart-dev-agency/smart-dev-tools-app/releases). Packaging/signing is separate from the source changes; this workspace does not publish a release.

## Implementation and limits

- Tools load lazily. Heavy computations run in terminable module workers. File hashes read 2 MiB chunks rather than loading the entire file.
- Text/JSON conversion: up to 4 MiB of input; large result previews are clipped with an explicit notice while copy/export retain the full output. Hash text limits use UTF-8 bytes; other text limits use JavaScript string length.
- Regex: 2-second timeout, 1 MiB input, 1,000 matches / 2 MiB captures.
- Diff: automatic comparison pauses beyond 200,000 characters or 2,000 total lines; explicit comparison supports up to 40,000 total lines / 4 MiB text, bounded to 4 million LCS cells, 100 rendered rows per page.
- Markdown: debounced preview; manual above 200,000 characters; source preview limit 1 MiB and generated HTML 2 MiB. Source is always available for copy/export. The editor is disposed when hidden; text is preserved, undo history is not.
- QR scanning: raster images up to 20 MiB, scaled to at most 2,000 pixels per side; worker cancellation/timeout.
- TLS: DNS, connection and handshake each time out after 10 seconds. PEM certificate input is limited to 1 MiB; RSA key input to 128 KiB.
- MD5/SHA-1 are labeled legacy. Formatting a digest does not make it more secure. RSA structural checks do not certify entropy, provenance or compliance.

`src/App.vue` owns navigation/session preferences. `src/shared/lib/tools.ts` is the catalog. Register a new tool there and add its lazy loader in App; reuse shared panels, outputs, tokens and workers instead of introducing a second theme or persistence layer.

## Validation

See [review](docs/reviews/2026-09-24-ui-and-tools-review.md) and [implementation / QA notes](docs/reviews/2026-09-24-implementation-validation.md) for measurements, checks and remaining platform verification. Tests are included in the build/release workflows. A successful local macOS build does not establish Windows/Linux or all macOS-version compatibility.

## License and support

MIT — see [LICENSE](LICENSE). Report reproducible problems with OS, app version and steps in [Issues](https://github.com/smart-dev-agency/smart-dev-tools-app/issues).
