import { isTauri } from "@tauri-apps/api/core";

export async function copyText(text: string): Promise<void> {
  if (isTauri()) {
    const { writeText } = await import("tauri-plugin-clipboard-api");
    await writeText(text);
  } else await navigator.clipboard.writeText(text);
}

export async function openExternal(url: string): Promise<void> {
  const parsed = new URL(url);
  if (!["https:", "http:", "mailto:"].includes(parsed.protocol))
    throw new Error("Only HTTP, HTTPS and mail links can be opened.");
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else window.open(url, "_blank", "noopener,noreferrer");
}

export async function saveText(
  text: string,
  filename: string,
  mime = "text/plain",
): Promise<void> {
  return saveBytes(new TextEncoder().encode(text), filename, mime);
}

export async function saveBytes(
  bytes: Uint8Array,
  filename: string,
  mime = "application/octet-stream",
): Promise<void> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({ defaultPath: filename });
    if (!path) return;
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    await writeFile(path, bytes);
  } else {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const url = URL.createObjectURL(new Blob([buffer], { type: mime }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
