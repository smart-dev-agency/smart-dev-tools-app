export type Encoding = "text" | "hex" | "base64" | "base64url";
export type DigestFormat = {
  encoding: Exclude<Encoding, "text">;
  uppercase: boolean;
  separator: "" | " " | ":" | "-";
};

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function decodeBytes(input: string, encoding: Encoding): Uint8Array {
  if (encoding === "text") return new TextEncoder().encode(input);
  const value = input.trim();
  if (!value) return new Uint8Array();
  if (encoding === "hex") {
    if (!/^[\da-f]{2}(?:[\da-f]{2}|[\s:-]+[\da-f]{2})*$/i.test(value)) {
      throw new Error(
        "Enter complete hexadecimal bytes (00–FF), optionally separated by spaces, colons or dashes.",
      );
    }
    return Uint8Array.from(value.replace(/[\s:-]/g, "").match(/../g)!, (byte) =>
      parseInt(byte, 16),
    );
  }
  const compact = value.replace(/\s/g, "");
  const alphabet =
    encoding === "base64url" ? /^[\w-]*={0,2}$/ : /^[A-Za-z0-9+/]*={0,2}$/;
  if (
    !alphabet.test(compact) ||
    compact.length % 4 === 1 ||
    (compact.includes("=") && compact.length % 4 !== 0)
  ) {
    throw new Error(
      `Invalid ${encoding === "base64url" ? "Base64URL" : "Base64"} input.`,
    );
  }
  const standard = compact.replace(/-/g, "+").replace(/_/g, "/");
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(standard), (char) => char.charCodeAt(0));
  } catch {
    throw new Error("Invalid Base64 input.");
  }
  if (bytesToBase64(bytes).replace(/=+$/, "") !== standard.replace(/=+$/, ""))
    throw new Error("Invalid Base64 padding bits.");
  return bytes;
}

export function encodeBytes(
  bytes: Uint8Array,
  encoding: Encoding,
  uppercase = false,
  separator = "",
): string {
  if (encoding === "text")
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (encoding === "hex") {
    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join(separator);
    return uppercase ? hex.toUpperCase() : hex;
  }
  const base64 = bytesToBase64(bytes);
  return encoding === "base64url"
    ? base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
    : base64;
}

export function formatDigest(hex: string, format: DigestFormat): string {
  return encodeBytes(
    decodeBytes(hex, "hex"),
    format.encoding,
    format.uppercase,
    format.separator,
  );
}

export function compareDigest(
  hex: string,
  expected: string,
  encoding: Exclude<Encoding, "text">,
): boolean {
  const bytes = decodeBytes(expected, encoding);
  if (bytes.length * 2 !== hex.length)
    throw new Error(`Expected ${hex.length / 2} bytes for this algorithm.`);
  return encodeBytes(bytes, "hex") === hex.toLowerCase();
}
