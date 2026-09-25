import CryptoJS from "crypto-js";

export const algorithms = ["sha256", "sha512", "sha1", "md5"] as const;
export type HashAlgorithm = (typeof algorithms)[number];
export const hashLabels: Record<HashAlgorithm, string> = {
  sha256: "SHA-256",
  sha512: "SHA-512",
  sha1: "SHA-1",
  md5: "MD5",
};
export type Hashes = Partial<Record<HashAlgorithm, string>>;
const engines = {
  md5: CryptoJS.algo.MD5,
  sha1: CryptoJS.algo.SHA1,
  sha256: CryptoJS.algo.SHA256,
  sha512: CryptoJS.algo.SHA512,
};
const words = (bytes: Uint8Array) => CryptoJS.lib.WordArray.create(bytes);

export async function hashBlob(
  blob: Blob,
  selected: HashAlgorithm[],
  progress: (value: number) => void = () => {},
): Promise<Hashes> {
  if (
    !selected.length ||
    selected.some((algorithm) => !algorithms.includes(algorithm))
  )
    throw new Error("Select at least one supported algorithm.");
  const hashers = selected.map(
    (algorithm) => [algorithm, engines[algorithm].create()] as const,
  );
  const chunkSize = 2 * 1024 * 1024;
  for (let offset = 0; offset < blob.size; offset += chunkSize) {
    const chunk = words(
      new Uint8Array(
        await blob.slice(offset, offset + chunkSize).arrayBuffer(),
      ),
    );
    for (const [, hasher] of hashers) hasher.update(chunk);
    progress(Math.min(1, (offset + chunkSize) / blob.size));
  }
  progress(1);
  return Object.fromEntries(
    hashers.map(([algorithm, hasher]) => [
      algorithm,
      hasher.finalize().toString(CryptoJS.enc.Hex),
    ]),
  );
}

export function hmac(
  message: Uint8Array,
  key: Uint8Array,
  algorithm: "sha256" | "sha512",
): string {
  return (algorithm === "sha256" ? CryptoJS.HmacSHA256 : CryptoJS.HmacSHA512)(
    words(message),
    words(key),
  ).toString(CryptoJS.enc.Hex);
}
