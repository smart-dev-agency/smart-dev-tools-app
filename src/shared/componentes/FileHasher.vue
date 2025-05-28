<template>
  <ComponentViewer title="File Hash Calculator">
    <BaseCard>
      <div class="file-hasher-content">
        <div class="drop-zone" @click="openFileDialog" :class="{ loading: isLoading }">
          <div v-if="isLoading" class="loader"></div>
          <p v-if="!fileName && !isLoading">Click here to select a file</p>
          <p v-if="fileName && !isLoading">File: {{ fileName }}</p>
          <input type="file" @change="onFileChange" ref="fileInput" style="display: none" />
        </div>

        <div v-if="hashes && !isLoading" class="hashes-results mt-4">
          <BasePanel v-for="(hash, alg) in hashes" :key="alg" :title="alg.toUpperCase()" :content="hash" class="mb-3">
            <pre class="font-monospace">{{ hash }}</pre>
          </BasePanel>
        </div>

        <div v-if="error" class="error-message mt-3">
          {{ error }}
        </div>
      </div>
    </BaseCard>
  </ComponentViewer>
</template>

<script setup lang="ts">
import CryptoJS from "crypto-js";
import { ref } from "vue";
import BaseCard from "./BaseCard.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";

const fileName = ref<string | null>(null);
const hashes = ref<Record<string, string> | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const error = ref<string | null>(null);
const isLoading = ref(false);

async function onFileChange(event: Event) {
  error.value = null;
  isLoading.value = true;

  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    await processFile(target.files[0]);
  } else {
    isLoading.value = false;
  }
  if (target) {
    target.value = "";
  }
}

function openFileDialog() {
  fileInput.value?.click();
}

async function processFile(file: File) {
  fileName.value = file.name;
  hashes.value = null;
  error.value = null;

  if (file.size > 500 * 1024 * 1024) {
    error.value = "The file is too large (limit 500MB). Hash calculation may take time or fail.";
  }

  try {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const fileBuffer = await readFileAsArrayBuffer(file);
    const wordArray = CryptoJS.lib.WordArray.create(fileBuffer);

    const calculatedHashes: Record<string, string> = {};
    calculatedHashes.md5 = CryptoJS.MD5(wordArray).toString(CryptoJS.enc.Hex);
    calculatedHashes.sha1 = CryptoJS.SHA1(wordArray).toString(CryptoJS.enc.Hex);
    calculatedHashes.sha256 = CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);
    calculatedHashes.sha512 = CryptoJS.SHA512(wordArray).toString(CryptoJS.enc.Hex);

    hashes.value = calculatedHashes;
  } catch (e: any) {
    console.error("Error processing file", e);
    error.value = `Error processing file: ${e.message}`;
    fileName.value = null;
  } finally {
    isLoading.value = false;
  }
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
</script>

<style scoped>
.file-hasher-content {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  width: 100%;
  height: 100%;
  overflow-y: auto;
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
}

.drop-zone.loading {
  cursor: default;
}

.drop-zone p {
  margin: 0;
  font-size: 1.1em;
  color: var(--placeholder-color);
}

.hashes-results {
  margin-top: 20px;
  width: 100%;
}

.font-monospace {
  font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
  word-break: break-all;
  white-space: pre-wrap;
  background-color: var(--code-bg);
  color: var(--code-color);
  padding: 0.5rem;
  border-radius: 6px;
  display: block;
}

.error-message {
  color: var(--error-color);
  background-color: var(--error-bg);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  text-align: center;
  font-size: 0.9rem;
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

.hashes-results :deep(.base-panel .panel-content) {
  padding: 0.5rem;
}

.hashes-results :deep(.base-panel .panel-header) {
  padding: 0.5rem 1rem;
}
</style>
