import forge from "node-forge";
import { decodeBytes, encodeBytes } from "./binary";

export function analyzeRsa(pem: string) {
  if (pem.length > 128 * 1024) throw new Error("Key input exceeds 128 KiB.");
  const match = pem
    .trim()
    .match(
      /^-----BEGIN (RSA PRIVATE KEY|PRIVATE KEY|RSA PUBLIC KEY|PUBLIC KEY)-----\s*([\s\S]+?)\s*-----END \1-----$/,
    );
  if (!match)
    throw new Error(
      "Enter one unencrypted RSA key in PKCS#1, PKCS#8 or SubjectPublicKeyInfo PEM format.",
    );
  const bytes = decodeBytes(match[2], "base64");
  const der = Array.from(
    { length: Math.ceil(bytes.length / 32768) },
    (_, index) =>
      String.fromCharCode(
        ...bytes.subarray(index * 32768, (index + 1) * 32768),
      ),
  ).join("");
  const buffer = forge.util.createBuffer(der);
  const asn1 = forge.asn1.fromDer(buffer, true);
  if (buffer.length()) throw new Error("Unexpected trailing key data.");
  const isPrivate = match[1].includes("PRIVATE");
  const key = isPrivate
    ? forge.pki.privateKeyFromAsn1(asn1)
    : forge.pki.publicKeyFromAsn1(asn1);
  const one = new forge.jsbn.BigInteger("1");
  const three = new forge.jsbn.BigInteger("3");
  if (
    key.n.signum() <= 0 ||
    key.e.compareTo(three) < 0 ||
    key.e.mod(new forge.jsbn.BigInteger("2")).signum() === 0 ||
    key.e.compareTo(key.n) >= 0
  )
    throw new Error("Invalid RSA modulus or exponent.");
  if (isPrivate) {
    const privateKey = key as forge.pki.rsa.PrivateKey;
    const { p, q, d, dP, dQ, qInv } = privateKey;
    if (p.compareTo(one) <= 0 || q.compareTo(one) <= 0)
      throw new Error("Invalid RSA prime factors.");
    const p1 = p.subtract(one),
      q1 = q.subtract(one);
    const lambda = p1.multiply(q1).divide(p1.gcd(q1));
    if (
      !p.multiply(q).equals(key.n) ||
      !d.multiply(key.e).mod(lambda).equals(one) ||
      !d.mod(p1).equals(dP) ||
      !d.mod(q1).equals(dQ) ||
      !qInv.multiply(q).mod(p).equals(one)
    ) {
      throw new Error("Inconsistent RSA private key components.");
    }
  }
  const publicKey = forge.pki.rsa.setPublicKey(key.n, key.e);
  const spki = forge.asn1
    .toDer(forge.pki.publicKeyToAsn1(publicKey))
    .getBytes();
  const components: Record<string, { hex: string; bits: number }> = {};
  for (const name of isPrivate
    ? ["n", "e", "d", "p", "q", "dP", "dQ", "qInv"]
    : ["n", "e"]) {
    const number = key[name as keyof typeof key] as forge.jsbn.BigInteger;
    const hex = number.toString(16);
    components[name] = {
      hex: hex.length % 2 ? `0${hex}` : hex,
      bits: number.bitLength(),
    };
  }
  return {
    kind: isPrivate ? "private" : "public",
    bits: key.n.bitLength(),
    format: match[1],
    components,
    publicKeyPem: forge.pki.publicKeyToPem(publicKey),
    publicKeyBase64: encodeBytes(
      Uint8Array.from(spki, (char) => char.charCodeAt(0)),
      "base64",
    ),
    fingerprints: {
      sha256: forge.md.sha256.create().update(spki).digest().toHex(),
      sha1: forge.md.sha1.create().update(spki).digest().toHex(),
      md5: forge.md.md5.create().update(spki).digest().toHex(),
    },
  };
}
export type RsaInfo = ReturnType<typeof analyzeRsa>;
