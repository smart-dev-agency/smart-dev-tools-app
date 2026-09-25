import { decodeBytes, encodeBytes } from "./binary";

export function parseDate(input: string, format: string): Date {
  const value = input.trim();
  if (!value) throw new Error("Enter a date or timestamp.");
  const numeric = /^[+-]?\d+(?:\.\d+)?$/.test(value);
  if (["epoch", "timestamp"].includes(format) && !numeric)
    throw new Error(
      "Enter a complete numeric timestamp, without other characters.",
    );
  // ponytail: auto uses magnitude; choose an explicit unit for small millisecond timestamps.
  const seconds =
    format === "epoch" ||
    (format === "auto" && numeric && Math.abs(Number(value)) < 1e11);
  const date = new Date(
    numeric && ["auto", "epoch", "timestamp"].includes(format)
      ? Number(value) * (seconds ? 1000 : 1)
      : value,
  );
  if (!Number.isFinite(date.getTime()))
    throw new Error("Invalid date or timestamp outside the supported range.");
  return date;
}

export function analyzeText(text: string) {
  let characters = 0,
    noWhitespace = 0;
  for (const char of text) {
    characters++;
    if (!/\s/u.test(char)) noWhitespace++;
  }
  return {
    "Characters (Unicode code points)": characters,
    "Characters without whitespace": noWhitespace,
    "UTF-8 bytes": new TextEncoder().encode(text).length,
    Words: text.match(/\S+/gu)?.length ?? 0,
    Lines: text ? text.split(/\r\n|\r|\n/).length : 0,
    Paragraphs: text
      .split(/(?:\r?\n|\r)\s*(?:\r?\n|\r)/)
      .filter((p) => p.trim()).length,
  };
}

export function decodeToken(input: string) {
  if (input.length > 256 * 1024)
    throw new Error("Token input exceeds 256 KiB.");
  const token = input.trim();
  const parts = token.split(".");
  if (![1, 3].includes(parts.length))
    throw new Error(
      "Expected a JWT with three segments, or a Base64 JSON object.",
    );
  const decode = (part: string) =>
    encodeBytes(
      decodeBytes(part, /[+/]/.test(part) ? "base64" : "base64url"),
      "text",
    );
  const payload = decode(parts.length === 1 ? parts[0] : parts[1]);
  const claims = JSON.parse(payload);
  if (!claims || typeof claims !== "object" || Array.isArray(claims))
    throw new Error("Token payload must be a JSON object.");
  const header =
    parts.length === 1
      ? '{"type":"Base64 JSON","note":"Not a signed JWT"}'
      : decode(parts[0]);
  const parsedHeader = JSON.parse(header);
  if (
    !parsedHeader ||
    typeof parsedHeader !== "object" ||
    Array.isArray(parsedHeader)
  )
    throw new Error("JWT header must be a JSON object.");
  if (parts.length === 3) decodeBytes(parts[2], "base64url"); // An empty signature is allowed for inspection, never verified.
  const times: Record<string, string> = {};
  for (const name of ["iat", "exp", "nbf", "auth_time"]) {
    if (claims[name] === undefined) continue;
    const value = claims[name];
    const date = new Date(typeof value === "number" ? value * 1000 : NaN);
    times[name] = Number.isFinite(date.getTime())
      ? date.toISOString()
      : "Invalid numeric date";
  }
  return {
    header: formatJson(header, 2),
    payload: formatJson(payload, 2),
    times,
    expiration:
      typeof claims.exp === "number" && Number.isFinite(claims.exp)
        ? claims.exp <= Date.now() / 1000
          ? "Expired"
          : "Not expired (unverified)"
        : "No valid expiration claim",
  };
}

export function formatJson(input: string, indent: number): string {
  if (![0, 2, 4].includes(indent))
    throw new Error("Choose compact, 2-space or 4-space formatting.");
  if (input.length > 4 * 1024 * 1024)
    throw new Error("JSON input exceeds 4 MiB.");
  JSON.parse(input);
  // Preserve numeric lexemes and duplicate keys; JSON.stringify(JSON.parse()) loses them.
  const tokens = input.match(
    /"(?:\\.|[^"\\])*"|[{}\[\],:]|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
  )!;
  if (!indent) return tokens.join("");
  let depth = 0,
    result = "";
  const newline = () => "\n" + " ".repeat(depth * indent);
  tokens.forEach((token, index) => {
    if (token === "{" || token === "[") {
      result += token;
      depth++;
      if (depth > 256)
        throw new Error(
          "JSON exceeds the 256-level nesting limit. Use compact output for deeply nested data.",
        );
      if (tokens[index + 1] !== (token === "{" ? "}" : "]"))
        result += newline();
    } else if (token === "}" || token === "]") {
      depth--;
      if (tokens[index - 1] !== (token === "}" ? "{" : "["))
        result += newline();
      result += token;
    } else if (token === ",") result += "," + newline();
    else result += token === ":" ? ": " : token;
  });
  return result;
}

export function inspectUrl(input: string) {
  const url = new URL(input);
  return {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    fragment: url.hash,
    parameters: Array.from(url.searchParams, ([name, value]) => ({
      name,
      value,
    })),
  };
}

export function formatUuid(
  uuid: string,
  uppercase: boolean,
  hyphens: boolean,
  braces: boolean,
): string {
  const value = hyphens ? uuid : uuid.replace(/-/g, "");
  const formatted = uppercase ? value.toUpperCase() : value.toLowerCase();
  return braces ? `{${formatted}}` : formatted;
}

export function testPattern(pattern: string, flags: string, text: string) {
  if (pattern.length > 10000 || text.length > 1024 * 1024)
    throw new Error(
      "Use a pattern under 10,000 characters and text under 1 MiB.",
    );
  const regex = new RegExp(pattern, flags);
  const results: Array<{
    index: number;
    text: string;
    groups: Record<string, string>;
  }> = [];
  let outputSize = 0;
  const first = flags.includes("g") ? null : regex.exec(text);
  const matches = flags.includes("g")
    ? text.matchAll(regex)
    : first
      ? [first]
      : [];
  for (const match of matches) {
    if (results.length === 1000) return { matches: results, truncated: true };
    const groups: Record<string, string> = {};
    for (let i = 1; i < match.length; i++)
      if (match[i] !== undefined) groups[i] = match[i];
    Object.assign(groups, match.groups);
    outputSize +=
      match[0].length +
      Object.values(groups).reduce((sum, group) => sum + group.length, 0);
    if (outputSize > 2 * 1024 * 1024)
      return { matches: results, truncated: true };
    results.push({ index: match.index!, text: match[0], groups });
  }
  return { matches: results, truncated: false };
}
export type RegexResult = ReturnType<typeof testPattern>;

export interface DiffRow {
  type: "unchanged" | "modified" | "added" | "removed";
  left: number | null;
  right: number | null;
  before: string;
  after: string;
}
export function diffText(
  before: string,
  after: string,
  ignoreWhitespace: boolean,
  ignoreCase: boolean,
): DiffRow[] {
  const a = before ? before.split("\n") : [],
    b = after ? after.split("\n") : [];
  if (
    a.length + b.length > 40000 ||
    before.length + after.length > 4 * 1024 * 1024
  )
    throw new Error("Compare up to 40,000 total lines or 4 MiB of text.");
  const normalize = (value: string) => {
    if (ignoreWhitespace) value = value.replace(/\s/g, "");
    return ignoreCase ? value.toLowerCase() : value;
  };
  const na = a.map(normalize),
    nb = b.map(normalize);
  let prefix = 0,
    suffix = 0;
  while (prefix < Math.min(a.length, b.length) && na[prefix] === nb[prefix])
    prefix++;
  while (
    suffix < Math.min(a.length, b.length) - prefix &&
    na[a.length - 1 - suffix] === nb[b.length - 1 - suffix]
  )
    suffix++;
  const n = a.length - prefix - suffix,
    m = b.length - prefix - suffix;
  // ponytail: bounded LCS, at most 4M cells (~16 MiB); use Myers if larger divergent inputs are needed.
  if ((n + 1) * (m + 1) > 4_000_000)
    throw new Error(
      "These texts differ too much for the 4-million-cell comparison limit. Compare a smaller section.",
    );
  const width = m + 1,
    dp = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) {
      dp[i * width + j] =
        na[prefix + i] === nb[prefix + j]
          ? 1 + dp[(i + 1) * width + j + 1]
          : Math.max(dp[(i + 1) * width + j], dp[i * width + j + 1]);
    }
  const rows: DiffRow[] = [];
  const equal = (i: number, j: number) =>
    rows.push({
      type: "unchanged",
      left: i + 1,
      right: j + 1,
      before: a[i],
      after: b[j],
    });
  for (let i = 0; i < prefix; i++) equal(i, i);
  let i = 0,
    j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && na[prefix + i] === nb[prefix + j]) {
      equal(prefix + i++, prefix + j++);
      continue;
    }
    const removed: number[] = [],
      added: number[] = [];
    while (
      (i < n || j < m) &&
      !(i < n && j < m && na[prefix + i] === nb[prefix + j])
    ) {
      if (
        i < n &&
        (j === m || dp[(i + 1) * width + j] >= dp[i * width + j + 1])
      )
        removed.push(prefix + i++);
      else added.push(prefix + j++);
    }
    for (let k = 0; k < Math.max(removed.length, added.length); k++) {
      const left = removed[k],
        right = added[k];
      rows.push({
        type:
          left === undefined
            ? "added"
            : right === undefined
              ? "removed"
              : "modified",
        left: left === undefined ? null : left + 1,
        right: right === undefined ? null : right + 1,
        before: left === undefined ? "" : a[left],
        after: right === undefined ? "" : b[right],
      });
    }
  }
  for (let k = suffix; k > 0; k--) equal(a.length - k, b.length - k);
  return rows;
}
