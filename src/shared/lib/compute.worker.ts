import { decodeBytes, encodeBytes, type Encoding } from "./binary";
import type { HashAlgorithm } from "./hashes";

export type Task =
  | {
      kind: "hash";
      file?: File;
      text: string;
      encoding: Encoding;
      algorithms: HashAlgorithm[];
    }
  | {
      kind: "hmac";
      text: string;
      encoding: Encoding;
      key: string;
      keyEncoding: Encoding;
      algorithm: "sha256" | "sha512";
    }
  | { kind: "rsa"; pem: string }
  | { kind: "regex"; pattern: string; flags: string; text: string }
  | {
      kind: "diff";
      before: string;
      after: string;
      ignoreWhitespace: boolean;
      ignoreCase: boolean;
    }
  | { kind: "json"; text: string; indent: number }
  | { kind: "markdown"; text: string }
  | { kind: "jwt"; text: string }
  | { kind: "statistics"; text: string }
  | { kind: "scan"; pixels: Uint8ClampedArray; width: number; height: number }
  | {
      kind: "convert";
      text: string;
      input: Encoding;
      output: Encoding;
      uppercase: boolean;
      separator: string;
    };

self.onmessage = async ({ data }: MessageEvent<Task>) => {
  try {
    if (
      Object.values(data).some(
        (value) => typeof value === "string" && value.length > 4 * 1024 * 1024,
      )
    )
      throw new Error("Text input exceeds 4 MiB. Use a smaller input.");
    let result: unknown;
    if (data.kind === "scan") {
      if (data.width * data.height > 4_000_000)
        throw new Error("QR image exceeds the 4 megapixel scan limit.");
      const { default: jsQR } = await import("jsqr");
      const code = jsQR(data.pixels, data.width, data.height);
      if (!code)
        throw new Error(
          "No QR code found. Try a clearer or more tightly cropped image.",
        );
      result = code.data;
    } else if (data.kind === "convert") {
      const bytes = decodeBytes(data.text, data.input);
      result = {
        text: encodeBytes(bytes, data.output, data.uppercase, data.separator),
        bytes: bytes.length,
      };
    } else if (data.kind === "hash") {
      const { hashBlob } = await import("./hashes");
      const source = data.file ?? new Blob([
        (() => {
          const bytes = decodeBytes(data.text, data.encoding);
          const buffer = new ArrayBuffer(bytes.byteLength);
          new Uint8Array(buffer).set(bytes);
          return buffer;
        })(),
      ]);
      result = {
        hashes: await hashBlob(source, data.algorithms, (progress) =>
          self.postMessage({ progress }),
        ),
        bytes: source.size,
      };
    } else if (data.kind === "hmac") {
      const { hmac } = await import("./hashes");
      result = {
        [data.algorithm]: hmac(
          decodeBytes(data.text, data.encoding),
          decodeBytes(data.key, data.keyEncoding),
          data.algorithm,
        ),
      };
    } else if (data.kind === "markdown") {
      if (data.text.length > 1024 * 1024)
        throw new Error(
          "Markdown preview is limited to 1 MiB. Your source can still be copied or exported.",
        );
      const { marked } = await import("marked");
      result = marked.parse(data.text, {
        async: false,
        gfm: true,
        breaks: true,
      });
      if ((result as string).length > 2 * 1024 * 1024)
        throw new Error("Rendered HTML exceeds the 2 MiB preview limit.");
    } else if (data.kind === "rsa") {
      const { analyzeRsa } = await import("./rsa");
      result = analyzeRsa(data.pem);
    } else {
      const { testPattern, diffText, formatJson, decodeToken, analyzeText } =
        await import("./textTools");
      if (data.kind === "regex")
        result = testPattern(data.pattern, data.flags, data.text);
      else if (data.kind === "diff")
        result = diffText(
          data.before,
          data.after,
          data.ignoreWhitespace,
          data.ignoreCase,
        );
      else if (data.kind === "jwt") result = decodeToken(data.text);
      else if (data.kind === "statistics") result = analyzeText(data.text);
      else result = formatJson(data.text, data.indent);
    }
    self.postMessage({ result });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "The operation failed.",
    });
  }
};
