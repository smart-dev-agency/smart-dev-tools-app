// Dependency-free regression check; TypeScript is already part of the build toolchain.
import assert from "node:assert/strict";
import { createHash, createHmac, createPublicKey, generateKeyPairSync, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
const { decodeBytes, encodeBytes, formatDigest, compareDigest } = require("../src/shared/lib/binary.ts");
const { droppedFile, preventFileNavigation } = require("../src/shared/lib/fileDrop.ts");
const tauriConfig = JSON.parse(readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));
assert.equal(tauriConfig.app.windows[0].dragDropEnabled, false, "HTML file drops require native interception to stay disabled");
const dropped = new File(["abc"], "abc.txt");
assert.equal(droppedFile({ files: [dropped], items: [] }), dropped);
for (const transfer of [null, { files: [] }, { files: [dropped, dropped] }]) assert.throws(() => droppedFile(transfer), /one file/);
assert.throws(
  () =>
    droppedFile({
      files: [dropped],
      items: [{ webkitGetAsEntry: () => ({ isDirectory: true }) }],
    }),
  /not a folder/,
);
let prevented = false;
preventFileNavigation({
  dataTransfer: { types: ["Files"] },
  preventDefault: () => (prevented = true),
});
assert.equal(prevented, true);
prevented = false;
preventFileNavigation({
  dataTransfer: { types: ["text/plain"] },
  preventDefault: () => (prevented = true),
});
assert.equal(prevented, false);
const { hashBlob, hmac, algorithms } = require("../src/shared/lib/hashes.ts");
const { analyzeRsa } = require("../src/shared/lib/rsa.ts");
const { diffText, formatJson, inspectUrl, formatUuid, testPattern, decodeToken, analyzeText, parseDate } = require("../src/shared/lib/textTools.ts");

for (const text of ["", " ", "abc", "café 🛠️\r\n", "a".repeat(2 * 1024 * 1024 + 31)]) {
  const bytes = new TextEncoder().encode(text);
  let progress = 0;
  const hashes = await hashBlob(new Blob([bytes]), algorithms, (value) => {
    assert.ok(value >= progress && value <= 1);
    progress = value;
  });
  assert.equal(progress, 1);
  for (const algorithm of algorithms) assert.equal(hashes[algorithm], createHash(algorithm).update(bytes).digest("hex"));
  for (const encoding of ["hex", "base64", "base64url"]) assert.deepEqual(decodeBytes(encodeBytes(bytes, encoding), encoding), bytes);
}
await assert.rejects(hashBlob(new Blob(["abc"]), []));
await assert.rejects(hashBlob(new Blob(["abc"]), ["fake"]));
await assert.rejects(
  hashBlob(
    {
      size: 1,
      slice() {
        return {
          arrayBuffer: async () => {
            throw new Error("Read failed");
          },
        };
      },
    },
    algorithms,
  ),
  /Read failed/,
);
for (const invalid of ["0g", "0", "aaZZ", "a-b", ":", "AA-"]) assert.throws(() => decodeBytes(invalid, "hex"));
for (const invalid of ["a", "Zm=9v", "Zh==", "====", "*"]) assert.throws(() => decodeBytes(invalid, "base64"));
assert.equal(encodeBytes(decodeBytes(" AA-bb:00 ff ", "hex"), "hex"), "aabb00ff");
assert.throws(() => encodeBytes(new Uint8Array([255]), "text"));
assert.equal(formatDigest("aabbcc", { encoding: "hex", uppercase: true, separator: "-" }), "AA-BB-CC");
assert.equal(
  formatDigest("aabbcc", {
    encoding: "base64",
    uppercase: true,
    separator: "-",
  }),
  "qrvM",
);
assert.equal(compareDigest("aabbcc", "AA:BB:CC", "hex"), true);
assert.equal(compareDigest("aabbcc", "qrvM", "base64"), true);
assert.equal(compareDigest("aabbcc", "AA:BB:CD", "hex"), false);
assert.throws(() => compareDigest("aabbcc", "aa", "hex"));
for (const algorithm of ["sha256", "sha512"])
  for (const key of ["", "secret", "🔐"]) {
    assert.equal(
      hmac(decodeBytes("hello 🌍", "text"), decodeBytes(key, "text"), algorithm),
      createHmac(algorithm, key).update("hello 🌍").digest("hex"),
    );
  }

const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const spki = keys.publicKey.export({ type: "spki", format: "der" });
for (const [key, types] of [
  [keys.privateKey, ["pkcs1", "pkcs8"]],
  [keys.publicKey, ["pkcs1", "spki"]],
])
  for (const type of types) {
    const info = analyzeRsa(key.export({ type, format: "pem" }));
    assert.equal(info.bits, 2048);
    assert.equal(info.components.n.bits, 2048);
    assert.equal(info.fingerprints.sha256, createHash("sha256").update(spki).digest("hex"));
    assert.deepEqual(
      createPublicKey(info.publicKeyPem).export({
        type: "spki",
        format: "der",
      }),
      spki,
    );
  }
assert.throws(() => analyzeRsa("-----BEGIN PRIVATE KEY-----\n" + "A".repeat(900) + "\n-----END PRIVATE KEY-----"));
assert.throws(() =>
  analyzeRsa(
    generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({
      type: "pkcs8",
      format: "pem",
    }),
  ),
);
const forge = require("node-forge");
const broken = forge.pki.privateKeyFromPem(keys.privateKey.export({ type: "pkcs1", format: "pem" }));
broken.n = broken.n.add(new forge.jsbn.BigInteger("2"));
assert.throws(() => analyzeRsa(forge.pki.privateKeyToPem(broken)), /Inconsistent/);

const json = '{"big":900719925474099312345,"float":1e400,"key":1,"key":2,"a":[{},"a\\\"b",true,null]}';
assert.equal(formatJson(formatJson(json, 2), 0), json);
assert.equal(formatJson("null", 4), "null");
assert.throws(() => formatJson('{"a":}', 2));
assert.deepEqual(inspectUrl("https://example.com/a?x=1&x=2&q=a+b#here").parameters, [
  { name: "x", value: "1" },
  { name: "x", value: "2" },
  { name: "q", value: "a b" },
]);
assert.throws(() => inspectUrl("not a URL"));
const uuid = randomUUID();
assert.equal(formatUuid(uuid, true, false, true), "{" + uuid.replaceAll("-", "").toUpperCase() + "}");
assert.equal(testPattern("(?<letter>a)", "g", "<a&").matches[0].index, 1);
assert.equal(testPattern("(?:)", "gu", "🛠").matches.length, 2);
assert.equal(testPattern("a", "g", "a".repeat(1001)).truncated, true);
assert.throws(() => testPattern("[", "g", "x"));
assert.throws(() => testPattern("a", "gg", "a"));
assert.deepEqual(
  diffText("a\nb\nc", "a\nnew\nb\nc", false, false).map((row) => row.type),
  ["unchanged", "added", "unchanged", "unchanged"],
);
assert.deepEqual(
  diffText("a\nb\nc", "a\nc", false, false).map((row) => row.type),
  ["unchanged", "removed", "unchanged"],
);
assert.equal(diffText("ABC ", "a b c", true, true)[0].type, "unchanged");
for (const a of ["", "a", "a\n", "a\nb", "b\na", "a\na"])
  for (const b of ["", "c", "a\nb", "b\na", "\n"]) {
    const rows = diffText(a, b, false, false);
    assert.equal(
      rows
        .filter((row) => row.left !== null)
        .map((row) => row.before)
        .join("\n"),
      a,
    );
    assert.equal(
      rows
        .filter((row) => row.right !== null)
        .map((row) => row.after)
        .join("\n"),
      b,
    );
  }
assert.throws(() => diffText("a\n".repeat(2500), "b\n".repeat(2500), false, false), /limit/);
console.log("✓ Binary formats, streaming hashes, HMAC, RSA, JSON, URL, UUID, regex and line diff regression checks passed.");

assert.equal(parseDate("0", "epoch").toISOString(), "1970-01-01T00:00:00.000Z");
assert.equal(parseDate("-1.5", "epoch").getTime(), -1500);
assert.equal(parseDate("100", "timestamp").getTime(), 100);
assert.equal(parseDate("1726000000000", "auto").getTime(), 1726000000000);
for (const value of ["", "123abc", "Infinity", "1e20"]) assert.throws(() => parseDate(value, "epoch"));
const b64 = (text) => Buffer.from(text).toString("base64url");
const decoded = decodeToken(b64('{"alg":"none"}') + "." + b64('{"sub":"🛠","exp":0,"big":900719925474099312345}') + ".");
assert.equal(decoded.expiration, "Expired");
assert.equal(decoded.times.exp, "1970-01-01T00:00:00.000Z");
assert.ok(decoded.payload.includes("900719925474099312345"));
assert.ok(!decoded.payload.includes("_readable"));
assert.ok(decodeToken(b64('{"exp":"bad"}')).expiration.includes("No valid"));
assert.throws(() => decodeToken("bad.token"));
assert.throws(() => decodeToken(b64("[]")));
assert.throws(() => decodeToken(b64("null")));
assert.throws(() => decodeToken(b64("{bad}")));
const stats = analyzeText("a 🛠\r\n\r\nb");
assert.equal(stats["Characters (Unicode code points)"], 8);
assert.equal(stats["UTF-8 bytes"], 11);
assert.equal(stats.Lines, 3);
assert.equal(stats.Paragraphs, 2);
assert.equal(stats.Words, 3);
const { searchTools } = require("../src/shared/lib/tools.ts");
assert.equal(searchTools("mayúsculas")[0].id, "string-hasher");
assert.deepEqual(
  searchTools("text hash").map((tool) => tool.id),
  ["string-hasher"],
);
assert.equal(searchTools("notatool").length, 0);
console.log("✓ Date parsing, unverified JWT claims, Unicode statistics and catalog search checks passed.");
