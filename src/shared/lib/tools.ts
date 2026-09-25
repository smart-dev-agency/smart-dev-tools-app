export const tools = [
  {
    id: "string-hasher",
    name: "Text Hash",
    group: "Security",
    symbol: "#",
    description: "Reliable digests, your preferred format.",
    keywords: "hash sha md5 texto mayusculas guiones",
  },
  {
    id: "file-hasher",
    name: "File Hash",
    group: "Security",
    symbol: "#f",
    description: "Stream a file, verify its checksum.",
    keywords: "checksum archivo sha md5",
  },
  {
    id: "hmac",
    name: "HMAC",
    group: "Security",
    symbol: "hk",
    description: "Keyed SHA-256 and SHA-512 digests.",
    keywords: "signature firma clave",
  },
  {
    id: "jwt-decode",
    name: "JWT Decoder",
    group: "Security",
    symbol: "jwt",
    description: "Inspect token claims and expiration.",
    keywords: "token decode json",
  },
  {
    id: "rsa-key-analyzer",
    name: "RSA Inspector",
    group: "Security",
    symbol: "rsa",
    description: "Read real key components and fingerprints.",
    keywords: "private public pem llave clave",
  },
  {
    id: "certificate-analyzer",
    name: "Certificate Inspector",
    group: "Security",
    symbol: "crt",
    description: "Inspect a local PEM certificate.",
    keywords: "x509 pem certificado",
  },
  {
    id: "tls-certificate-checker",
    name: "TLS Checker",
    group: "Security",
    symbol: "tls",
    description: "Inspect a server’s TLS certificate chain.",
    keywords: "https ssl servidor certificado network",
  },
  {
    id: "base64-converter",
    name: "Base64 & Hex",
    group: "Encoding",
    symbol: "64",
    description: "Convert text and bytes without guesswork.",
    keywords: "encode decode hexadecimal convertir",
  },
  {
    id: "url",
    name: "URL Toolkit",
    group: "Encoding",
    symbol: "%",
    description: "Encode, decode and inspect parameters.",
    keywords: "uri query parametros enlace",
  },
  {
    id: "json",
    name: "JSON Formatter",
    group: "Text & data",
    symbol: "{}",
    description: "Validate and format without losing precision.",
    keywords: "format compact validar formatear",
  },
  {
    id: "text-diff",
    name: "Text Diff",
    group: "Text & data",
    symbol: "±",
    description: "Compare lines, not just positions.",
    keywords: "compare comparar diferencias",
  },
  {
    id: "regex-tester",
    name: "Regex Tester",
    group: "Text & data",
    symbol: ".*",
    description: "Test expressions in an isolated worker.",
    keywords: "regexp pattern patron",
  },
  {
    id: "markdown-editor",
    name: "Markdown Editor",
    group: "Text & data",
    symbol: "md",
    description: "Write, preview and export Markdown.",
    keywords: "md editor html",
  },
  {
    id: "text-analyzer",
    name: "Text Analyzer",
    group: "Text & data",
    symbol: "Aa",
    description: "Count characters, words and paragraphs.",
    keywords: "count contador palabras",
  },
  {
    id: "uuid",
    name: "UUID Generator",
    group: "Utilities",
    symbol: "id",
    description: "Random v4 identifiers, ready to copy.",
    keywords: "guid generar identificador",
  },
  {
    id: "date-converter",
    name: "Date Converter",
    group: "Utilities",
    symbol: "dt",
    description: "Move between timestamps and dates.",
    keywords: "epoch time fecha unix",
  },
  {
    id: "qr-code-tool",
    name: "QR Toolkit",
    group: "Utilities",
    symbol: "qr",
    description: "Generate a QR code or scan an image.",
    keywords: "image imagen scan generar",
  },
] as const;
export type ToolId = (typeof tools)[number]["id"];
export function searchTools(query: string) {
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const words = normalize(query).trim().split(/\s+/);
  return tools.filter((tool) =>
    words.every((word) =>
      normalize(`${tool.name} ${tool.group} ${tool.keywords}`).includes(word),
    ),
  );
}
