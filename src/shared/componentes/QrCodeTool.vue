<template>
  <ComponentViewer title="QR Generator & Scanner">
    <BaseCard>
      <div class="qr-tool-content">
        <div class="tabs">
          <button class="tab-button" :class="{ active: activeTab === 'generate' }" @click="activeTab = 'generate'">Generate QR</button>
          <button class="tab-button" :class="{ active: activeTab === 'scan' }" @click="activeTab = 'scan'">Scan QR</button>
        </div>

        <div v-if="activeTab === 'generate'" class="tab-content">
          <div class="input-section">
            <BaseInput v-model="qrContent" placeholder="Type or paste the content for the QR code" multiline :rows="5" />

            <div class="options-section">
              <div class="input-group">
                <label>Size:</label>
                <select v-model="qrSize" class="form-select">
                  <option value="100">Small (100x100)</option>
                  <option value="200">Medium (200x200)</option>
                  <option value="300">Large (300x300)</option>
                  <option value="400">Extra Large (400x400)</option>
                </select>
              </div>

              <div class="input-group">
                <label>Color:</label>
                <input type="color" v-model="qrColor" class="color-picker" />
              </div>

              <div class="input-group">
                <label>Background:</label>
                <input type="color" v-model="qrBackground" class="color-picker" />
              </div>
            </div>

            <BaseButton @click="generateQR" :disabled="!qrContent"> Generate QR </BaseButton>
          </div>

          <div class="qr-result">
            <div v-if="error" class="error-message">{{ error }}</div>
            <div v-else-if="qrDataUrl" class="qr-image-container">
              <BasePanel title="Generated QR Code">
                <div class="qr-display-container">
                  <img :src="qrDataUrl" alt="QR Code" class="qr-image" />
                </div>
                <div class="qr-actions">
                  <BaseButton @click="copyQR" class="action-btn">
                    {{ copied ? "Copied!" : "Copy QR" }}
                  </BaseButton>
                </div>
              </BasePanel>
            </div>
            <div v-else class="placeholder-message">The generated QR code will be shown here</div>
          </div>
        </div>

        <div v-else class="tab-content">
          <div class="scanner-section">
            <BasePanel title="Upload image with QR code">
              <div class="drop-zone" @click="openFileDialog" :class="{ loading: isLoading }">
                <div v-if="isLoading" class="loader"></div>
                <p v-if="!scanFile && !isLoading">Click here to select an image with QR</p>
                <p v-if="scanFile && !isLoading">Image: {{ scanFile.name }}</p>
                <input type="file" ref="scanFileInput" @change="onScanFileChange" accept="image/*" style="display: none" />
              </div>
            </BasePanel>

            <div v-if="scanResult" class="scan-result">
              <BasePanel title="Detected content">
                <pre class="scan-content">{{ scanResult }}</pre>
                <div class="link-check" v-if="isUrl(scanResult)">
                  <BaseButton @click="openLink(scanResult)" class="open-link-btn"> Open link </BaseButton>
                </div>
              </BasePanel>
            </div>

            <div v-if="scanError" class="error-message">
              {{ scanError }}
            </div>
          </div>
        </div>
      </div>
    </BaseCard>
  </ComponentViewer>
</template>

<script setup lang="ts">
import jsQR from "jsqr";
import QRCode from "qrcode";
import clipboard from "tauri-plugin-clipboard-api";
import { ref } from "vue";
import BaseButton from "./BaseButton.vue";
import BaseCard from "./BaseCard.vue";
import BaseInput from "./BaseInput.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";

const activeTab = ref("generate");
const isLoading = ref(false);

const qrContent = ref("");
const qrSize = ref("200");
const qrColor = ref("#000000");
const qrBackground = ref("#FFFFFF");
const qrDataUrl = ref("");
const error = ref("");
const copied = ref(false);

const scanFileInput = ref<HTMLInputElement | null>(null);
const scanFile = ref<File | null>(null);
const scanResult = ref("");
const scanError = ref("");

async function generateQR() {
  if (!qrContent.value) {
    error.value = "Please enter content to generate the QR code";
    return;
  }

  error.value = "";
  isLoading.value = true;

  try {
    const options = {
      width: parseInt(qrSize.value),
      margin: 1,
      color: {
        dark: qrColor.value,
        light: qrBackground.value,
      },
    };

    qrDataUrl.value = await QRCode.toDataURL(qrContent.value, options);
  } catch (err: any) {
    console.error("Error generating QR:", err);
    error.value = `Error generating QR code: ${err.message}`;
    qrDataUrl.value = "";
  } finally {
    isLoading.value = false;
  }
}

async function copyQR() {
  if (!qrDataUrl.value) return;
  try {
    error.value = "";
    const base64String = qrDataUrl.value.split(",")[1];

    if (!base64String) {
      throw new Error("Invalid image format");
    }

    await clipboard.writeImageBase64(base64String);

    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err: any) {
    console.error("Error copying image to clipboard:", err);
    error.value = `Could not copy image to clipboard: ${err instanceof Error ? err.message : String(err)}`;
  }
}

function openFileDialog() {
  scanFileInput.value?.click();
}

async function onScanFileChange(event: Event) {
  scanError.value = "";
  scanResult.value = "";
  isLoading.value = true;

  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    scanFile.value = target.files[0];
    await scanQRCode(target.files[0]);
  } else {
    isLoading.value = false;
  }

  if (target) {
    target.value = "";
  }
}

async function scanQRCode(file: File) {
  try {
    const imageData = await readFileAsImageData(file);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      scanResult.value = code.data;
    } else {
      scanError.value = "No QR code detected in the image";
    }
  } catch (err: any) {
    console.error("Error scanning QR:", err);
    scanError.value = `Error processing image: ${err.message}`;
  } finally {
    isLoading.value = false;
  }
}

function readFileAsImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target?.result) {
        reject(new Error("Error reading file"));
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Could not create canvas context"));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          resolve(imageData);
        } catch (error) {
          reject(new Error("Error processing image"));
        }
      };

      img.onerror = () => {
        reject(new Error("Error loading image"));
      };

      img.src = e.target.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };

    reader.readAsDataURL(file);
  });
}

function isUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

function openLink(url: string) {
  window.open(url, "_blank");
}
</script>

<style scoped lang="scss">
.qr-tool-content {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--input-border);
  padding-bottom: 1rem;
}

.tab-button {
  padding: 0.6em 1.2em;
  border: 2px solid var(--input-border);
  border-radius: 8px;
  background: var(--panel-content-bg);
  color: var(--text-primary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;

  &.active {
    background: var(--button-bg);
    color: var(--button-color);
    border-color: var(--button-border);
  }

  &:hover:not(.active) {
    border-color: var(--button-bg);
    background: var(--input-bg);
  }
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (min-width: 768px) {
    flex-direction: row;
  }
}

.input-section,
.scanner-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.options-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  label {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
}

.form-select {
  padding: 0.6em 1.2em;
  border-radius: 8px;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--input-color);
  font-size: 1em;
  transition: all 0.2s ease;

  &:focus {
    border-color: var(--button-bg);
    outline: none;
  }
}

.color-picker {
  width: 100%;
  height: 40px;
  padding: 0;
  border: 1px solid var(--input-border);
  border-radius: 8px;
  cursor: pointer;

  &::-webkit-color-swatch {
    border: none;
    border-radius: 6px;
  }
}

.qr-result,
.scan-result {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: 1rem;

  @media (min-width: 768px) {
    margin-top: 0;
  }
}

.qr-image-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  background: var(--panel-content-bg);
  border-radius: 12px;
  padding: 1rem;
  max-width: 100%;
  overflow: hidden;
}

.qr-display-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 300px;
  padding: 1rem;
  background: var(--panel-bg);
  border-radius: 8px;
}

.qr-image {
  max-width: 100%;
  max-height: 100%;
  display: block;
  margin: 0 auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}

.qr-actions {
  display: flex;
  justify-content: center;
  padding: 0 1rem;
  margin-top: 1.5rem;
}

.action-btn {
  min-width: 150px;
  max-width: 200px;
  height: 44px;
}

.placeholder-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  background: var(--panel-content-bg);
  border-radius: 12px;
  color: var(--placeholder-color);
  text-align: center;
  padding: 1rem;
}

.drop-zone {
  border: 2px dashed var(--input-border);
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  background-color: var(--panel-content-bg);
  color: var(--text-primary);
  position: relative;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: var(--button-bg);
    background-color: var(--input-bg);
  }

  &.loading {
    cursor: default;
  }

  p {
    margin: 0;
    font-size: 1.1em;
    color: var(--placeholder-color);
  }
}

.scan-content {
  background: var(--code-bg);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0;
  font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--code-color);
  white-space: pre-wrap;
  word-break: break-all;
}

.link-check {
  margin-top: 1rem;
}

.open-link-btn {
  width: 100%;
}

.error-message {
  color: var(--error-color);
  background-color: var(--error-bg);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  text-align: center;
  font-size: 0.9rem;
  margin-top: 1rem;
}

.loader {
  border: 4px solid var(--input-border);
  border-top: 4px solid var(--button-bg);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
