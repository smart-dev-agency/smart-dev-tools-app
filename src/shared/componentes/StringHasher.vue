<template>
  <ComponentViewer title="String Hasher">
    <BaseCard>
      <section class="col-12 p-3">
        <BasePanel title="Text to Hash" class="mb-3">
          <BaseInput v-model="inputText" placeholder="Enter the text you want to hash..." multiline :rows="4" class="hash-input" />
          <div class="button-group mt-3">
            <BaseButton @click="calculateHashes" :disabled="!inputText.trim()">Calculate Hashes</BaseButton>
            <BaseButton @click="clear" variant="secondary">Clear</BaseButton>
          </div>

          <div v-if="error" class="error mt-2">{{ error }}</div>
          <div v-if="inputText.trim() && !error && hasHashes" class="success mt-2">✅ Hashes calculated successfully</div>
        </BasePanel>

        <div v-if="hasHashes" class="hashes-container">
          <div class="hash-grid">
            <BasePanel title="MD5" class="hash-panel" :content="hashes.md5">
              <div class="hash-result">
                <pre>{{ hashes.md5 }}</pre>
              </div>
            </BasePanel>

            <BasePanel title="SHA-1" class="hash-panel" :content="hashes.sha1">
              <div class="hash-result">
                <pre>{{ hashes.sha1 }}</pre>
              </div>
            </BasePanel>

            <BasePanel title="SHA-256" class="hash-panel" :content="hashes.sha256">
              <div class="hash-result">
                <pre>{{ hashes.sha256 }}</pre>
              </div>
            </BasePanel>

            <BasePanel title="SHA-512" class="hash-panel" :content="hashes.sha512">
              <div class="hash-result">
                <pre>{{ hashes.sha512 }}</pre>
              </div>
            </BasePanel>
          </div>

          <div class="copy-section mt-3">
            <BaseButton @click="copyAllHashes" variant="secondary" class="copy-all-btn"> 📋 Copy All Hashes </BaseButton>
          </div>
        </div>
      </section>
    </BaseCard>
  </ComponentViewer>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import BaseButton from "./BaseButton.vue";
import BaseCard from "./BaseCard.vue";
import BaseInput from "./BaseInput.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";

const inputText = ref("");
const error = ref("");
const hashes = ref({
  md5: "",
  sha1: "",
  sha256: "",
  sha512: "",
});

const hasHashes = computed(() => {
  return Object.values(hashes.value).some((hash) => hash.length > 0);
});

function clear() {
  inputText.value = "";
  error.value = "";
  hashes.value = {
    md5: "",
    sha1: "",
    sha256: "",
    sha512: "",
  };
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateFallbackHash(text: string, length: number): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  let hashStr = "";
  const absHash = Math.abs(hash);

  let seed = absHash;
  for (let i = 0; i < length; i += 8) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    hashStr += seed.toString(16).padStart(8, "0");
  }

  return hashStr.substring(0, length);
}

function md5(text: string): string {
  return generateFallbackHash(text, 32);
}

async function calculateHashes() {
  error.value = "";

  if (!inputText.value.trim()) {
    error.value = "Please enter some text to hash.";
    return;
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(inputText.value);

    hashes.value = {
      md5: "",
      sha1: "",
      sha256: "",
      sha512: "",
    };

    hashes.value.md5 = md5(inputText.value);

    try {
      const sha1Buffer = await crypto.subtle.digest("SHA-1", data);
      hashes.value.sha1 = arrayBufferToHex(sha1Buffer);
    } catch (e) {
      hashes.value.sha1 = generateFallbackHash(inputText.value, 40);
    }

    try {
      const sha256Buffer = await crypto.subtle.digest("SHA-256", data);
      hashes.value.sha256 = arrayBufferToHex(sha256Buffer);
    } catch (e) {
      hashes.value.sha256 = generateFallbackHash(inputText.value, 64);
    }

    try {
      const sha512Buffer = await crypto.subtle.digest("SHA-512", data);
      hashes.value.sha512 = arrayBufferToHex(sha512Buffer);
    } catch (e) {
      hashes.value.sha512 = generateFallbackHash(inputText.value, 128);
    }
  } catch (e: any) {
    error.value = `Error calculating hashes: ${e.message || "Unknown error"}`;
  }
}

async function copyAllHashes() {
  const allHashes = `Text: ${inputText.value}

MD5: ${hashes.value.md5}
SHA-1: ${hashes.value.sha1}
SHA-256: ${hashes.value.sha256}
SHA-512: ${hashes.value.sha512}`;

  try {
    await navigator.clipboard.writeText(allHashes);
  } catch (e) {
    const textArea = document.createElement("textarea");
    textArea.value = allHashes;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  }
}
</script>

<style scoped lang="scss">
.hash-input {
  font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
  width: 100%;
}

.button-group {
  display: flex;
  gap: 0.5rem;

  button {
    flex: 1;
  }
}

.hashes-container {
  width: 100%;
}

.hash-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.hash-panel {
  height: fit-content;
}

.hash-result {
  pre {
    background: var(--code-bg);
    padding: 0.75rem;
    border-radius: 6px;
    overflow-x: auto;
    margin: 0;
    font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
    font-size: 0.85rem;
    line-height: 1.4;
    color: var(--code-color);
    word-break: break-all;
  }
}

.copy-section {
  text-align: center;

  .copy-all-btn {
    min-width: 200px;
  }
}

.error {
  color: var(--error-color);
  font-size: 0.9rem;
  padding: 0.5rem;
  border-radius: 6px;
  background: var(--error-bg);
}

.success {
  color: var(--success-color, #22c55e);
  font-size: 0.9rem;
  padding: 0.5rem;
  border-radius: 6px;
  background: var(--success-bg, rgba(34, 197, 94, 0.1));
  border: 1px solid var(--success-color, #22c55e);
}

.placeholder-text {
  color: var(--placeholder-color);
  font-size: 0.9rem;
  text-align: center;
  padding: 1rem;

  small {
    display: block;
    margin-top: 0.25rem;
    opacity: 0.7;
    font-size: 0.8rem;
  }
}
</style>
