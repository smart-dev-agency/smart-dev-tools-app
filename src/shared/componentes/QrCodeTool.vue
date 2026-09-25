<template>
  <ComponentViewer title="QR Toolkit">
    <div class="controls qr-tabs">
      <BaseButton
        :variant="tab === 'generate' ? 'primary' : 'secondary'"
        :aria-pressed="tab === 'generate'"
        @click="tab = 'generate'"
        >Generate QR</BaseButton
      ><BaseButton
        :variant="tab === 'scan' ? 'primary' : 'secondary'"
        :aria-pressed="tab === 'scan'"
        @click="tab = 'scan'"
        >Scan image</BaseButton
      >
    </div>
    <div v-if="tab === 'generate'" class="workbench">
      <BasePanel title="Content & appearance">
        <BaseInput
          v-model="content"
          placeholder="Text or URL to encode…"
          multiline
          :rows="8"
        />
        <div class="controls action-row">
          <label class="field"
            >Size<select v-model="size">
              <option :value="100">100 × 100</option>
              <option :value="200">200 × 200</option>
              <option :value="300">300 × 300</option>
              <option :value="400">400 × 400</option>
            </select></label
          ><label class="field"
            >Foreground<input type="color" v-model="foreground" /></label
          ><label class="field"
            >Background<input type="color" v-model="background"
          /></label>
        </div>
        <div class="action-row">
          <BaseButton @click="generate" :disabled="!content || generating">{{
            generating ? "Generating…" : "Generate QR"
          }}</BaseButton
          ><BaseButton variant="secondary" @click="content = ''"
            >Clear</BaseButton
          >
        </div>
        <p class="hint">
          Use contrasting colors and preserve the quiet border for reliable
          scanning. Capacity depends on content; very long input may not fit.
        </p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </BasePanel>
      <BasePanel title="QR image"
        ><template v-if="dataUrl"
          ><div class="qr-image">
            <img :src="dataUrl" alt="Generated QR code" />
          </div>
          <div class="controls">
            <BaseButton @click="copyImage" variant="secondary">{{
              copied ? "Copied" : "Copy image"
            }}</BaseButton
            ><BaseButton @click="download" variant="secondary"
              >Save PNG</BaseButton
            >
          </div></template
        >
        <div v-else class="empty-result">
          <span class="empty-symbol">qr</span>
          <h2>Your code, ready to share</h2>
          <p>Generate a local QR image from text or a link.</p>
        </div></BasePanel
      >
    </div>
    <div v-else class="workbench">
      <BasePanel title="Image to scan"
        ><input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
          hidden
          @change="choose"
        /><button
          class="drop-zone"
          @click="fileInput?.click()"
          @dragover.prevent
          @drop.prevent="drop"
        >
          {{
            decoding || busy
              ? "Reading QR image…"
              : fileName || "Choose or drop an image"
          }}
        </button>
        <p class="hint">
          PNG, JPEG, WebP, GIF or BMP · up to 20 MiB. Large images are scaled to
          2,000 pixels per side. Scanning runs in a cancellable worker.
        </p>
        <BaseButton
          v-if="busy || decoding"
          class="action-row"
          variant="secondary"
          @click="cancelScan"
          >Cancel</BaseButton
        >
        <p v-if="scanError" class="error" role="alert">
          {{ scanError }}
        </p></BasePanel
      >
      <BasePanel title="Detected content" :content="result ?? undefined"
        ><template v-if="result !== null">
          <pre>{{ result }}</pre>
          <BaseButton
            v-if="linkAllowed"
            class="action-row"
            variant="secondary"
            @click="openLink"
            >Open link</BaseButton
          >
          <p v-if="linkAllowed" class="hint">
            Opening a link leaves this app. Check the destination first.
          </p></template
        >
        <div v-else class="empty-result">
          <span class="empty-symbol">↗</span>
          <h2>Read before you open</h2>
          <p>Decoded content appears here; links never open automatically.</p>
        </div></BasePanel
      >
    </div>
  </ComponentViewer>
</template>
<script setup lang="ts">
import QRCode from "qrcode";
import { isTauri } from "@tauri-apps/api/core";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { decodeBytes } from "../lib/binary";
import { droppedFile } from "../lib/fileDrop";
import { openExternal, saveBytes } from "../lib/output";
import { useWorker } from "../lib/useWorker";
import BaseInput from "./BaseInput.vue";
import BaseButton from "./BaseButton.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";
const tab = ref("generate"),
  content = ref(""),
  size = ref(200),
  foreground = ref("#000000"),
  background = ref("#ffffff"),
  dataUrl = ref(""),
  error = ref(""),
  generating = ref(false),
  copied = ref(false);
const fileInput = ref<HTMLInputElement>(),
  fileName = ref(""),
  decoding = ref(false);
const { result, busy, error: scanError, run, reset } = useWorker<string>();
let generateId = 0,
  scanId = 0;
watch(
  [content, size, foreground, background],
  () => {
    generateId++;
    dataUrl.value = "";
    error.value = "";
    copied.value = false;
    generating.value = false;
  },
  { flush: "sync" },
);
async function generate() {
  const id = ++generateId;
  error.value = "";
  dataUrl.value = "";
  generating.value = true;
  try {
    if (content.value.length > 5000)
      throw new Error(
        "Content is too long for a QR code. Use fewer than 5,000 characters.",
      );
    const url = await QRCode.toDataURL(content.value, {
      width: size.value,
      margin: 4,
      color: { dark: foreground.value, light: background.value },
    });
    if (id === generateId) dataUrl.value = url;
  } catch (e) {
    if (id === generateId) error.value = String(e);
  } finally {
    if (id === generateId) generating.value = false;
  }
}
function imageBytes() {
  return decodeBytes(dataUrl.value.split(",")[1], "base64");
}
async function copyImage() {
  try {
    if (isTauri()) {
      const { writeImageBase64 } = await import("tauri-plugin-clipboard-api");
      await writeImageBase64(dataUrl.value.split(",")[1]);
    } else
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": (() => {
            const bytes = imageBytes();
            const buffer = new ArrayBuffer(bytes.byteLength);
            new Uint8Array(buffer).set(bytes);
            return new Blob([buffer], { type: "image/png" });
          })(),
        }),
      ]);
    copied.value = true;
  } catch (e) {
    error.value = `Could not copy image: ${e}. Save PNG instead.`;
  }
}
async function download() {
  try {
    await saveBytes(imageBytes(), "qr-code.png", "image/png");
  } catch (e) {
    error.value = String(e);
  }
}
function cancelScan() {
  scanId++;
  decoding.value = false;
  reset();
}
function choose(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.[0]) scan(input.files[0]);
  input.value = "";
}
function drop(event: DragEvent) {
  cancelScan();
  try {
    scan(droppedFile(event.dataTransfer));
  } catch (cause) {
    scanError.value =
      cause instanceof Error
        ? cause.message
        : "Could not read the dropped image.";
  }
}
async function scan(file: File) {
  cancelScan();
  const id = scanId;
  fileName.value = file.name;
  decoding.value = true;
  let url = "";
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error("Image exceeds 20 MiB.");
    if (!/^image\/(png|jpeg|webp|gif|bmp)$/.test(file.type))
      throw new Error("Choose a PNG, JPEG, WebP, GIF or BMP image.");
    url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    if (id !== scanId) return;
    const scale = Math.min(
      1,
      2000 / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image decoding is unavailable.");
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    run(
      {
        kind: "scan",
        pixels: context.getImageData(0, 0, canvas.width, canvas.height).data,
        width: canvas.width,
        height: canvas.height,
      },
      10000,
    );
  } catch (e) {
    if (id === scanId) scanError.value = String(e);
  } finally {
    if (url) URL.revokeObjectURL(url);
    if (id === scanId) decoding.value = false;
  }
}
const linkAllowed = computed(() => {
  try {
    return ["https:", "http:", "mailto:"].includes(
      new URL(result.value ?? "").protocol,
    );
  } catch {
    return false;
  }
});
async function openLink() {
  try {
    await openExternal(result.value!);
  } catch (e) {
    scanError.value = String(e);
  }
}
onBeforeUnmount(() => {
  generateId++;
  cancelScan();
});
</script>
<style scoped>
.qr-tabs {
  margin-bottom: 20px;
}
.qr-image {
  display: grid;
  place-items: center;
  min-height: 260px;
  margin-bottom: 16px;
}
.qr-image img {
  max-width: 100%;
  height: auto;
}
.drop-zone {
  width: 100%;
  min-height: 160px;
  padding: 24px;
  border: 1px dashed var(--border-strong);
  border-radius: 8px;
  color: var(--text);
  background: var(--surface-alt);
  overflow-wrap: anywhere;
}
.drop-zone:hover {
  border-color: var(--accent);
}
</style>
