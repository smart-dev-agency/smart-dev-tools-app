<template>
  <ComponentViewer title="Base64 Converter">
    <BaseCard>
      <section class="col-5 h-100 p-3">
        <div class="d-flex flex-column h-100">
          <div class="input-group mb-3">
            <label>Input Format:</label>
            <select v-model="inputFormat" class="form-select">
              <option value="text">Text</option>
              <option value="hex">Hexadecimal</option>
              <option value="base64">Base64</option>
            </select>
          </div>

          <BaseInput
            v-model="input"
            :placeholder="inputPlaceholder"
            multiline
            :rows="8"
            class="flex-grow-1 mb-3"
          />

          <div class="input-group mb-3">
            <label>Convert To:</label>
            <select v-model="outputFormat" class="form-select">
              <option value="text">Text</option>
              <option value="hex">Hexadecimal</option>
              <option value="base64">Base64</option>
            </select>
          </div>

          <div v-if="outputFormat === 'hex'" class="hex-options mb-3">
            <div class="input-group">
              <label>Hexadecimal Format:</label>
              <select v-model="hexCase" class="form-select">
                <option value="lower">Lowercase</option>
                <option value="upper">Uppercase</option>
              </select>
            </div>
            <div class="input-group mt-2">
              <label>Separator:</label>
              <select v-model="hexSeparator" class="form-select">
                <option value="">No Separator</option>
                <option value=" ">Space</option>
                <option value=":">Colon (:)</option>
                <option value="-">Dash (-)</option>
              </select>
            </div>
          </div>

          <BaseButton @click="convert" class="mb-3">Convert</BaseButton>
          <div v-if="error" class="error mb-3">{{ error }}</div>
        </div>
      </section>

      <section class="col-7 h-100 p-3">
        <BasePanel title="Result" :content="result">
          <pre v-if="result" class="result-text">{{ result }}</pre>
          <div v-else class="placeholder-text">
            The conversion result will be shown here
          </div>
        </BasePanel>
      </section>
    </BaseCard>
  </ComponentViewer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import BaseButton from './BaseButton.vue';
import BaseCard from './BaseCard.vue';
import BaseInput from './BaseInput.vue';
import BasePanel from './BasePanel.vue';
import ComponentViewer from './ComponentViewer.vue';

const input = ref('');
const inputFormat = ref('text');
const outputFormat = ref('base64');
const result = ref('');
const error = ref('');
const hexCase = ref('lower');
const hexSeparator = ref('');

const inputPlaceholder = computed(() => {
  switch (inputFormat.value) {
    case 'text':
      return 'Enter the text to convert...';
    case 'hex':
      return 'Enter the hexadecimal string to convert...';
    case 'base64':
      return 'Enter the Base64 string to convert...';
    default:
      return '';
  }
});

function convert() {
  error.value = '';
  result.value = '';

  if (!input.value) {
    error.value = 'Please enter a value to convert';
    return;
  }

  try {
    let bytes: Uint8Array;
    
    switch (inputFormat.value) {
      case 'text':
        bytes = new TextEncoder().encode(input.value);
        break;
      case 'hex':
        bytes = hexToBytes(input.value);
        break;
      case 'base64':
        bytes = base64ToBytes(input.value);
        break;
      default:
        throw new Error('Invalid input format');
    }

    switch (outputFormat.value) {
      case 'text':
        result.value = new TextDecoder().decode(bytes);
        break;
      case 'hex':
        result.value = bytesToHex(bytes);
        break;
      case 'base64':
        result.value = bytesToBase64(bytes);
        break;
      default:
        throw new Error('Invalid output format');
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Conversion error';
  }
}

function hexToBytes(hex: string): Uint8Array {
  hex = hex.replace(/\s/g, '');
  if (hex.length % 2 !== 0) {
    throw new Error('Hexadecimal string must have an even length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.substr(i, 2), 16);
    if (isNaN(byte)) {
      throw new Error('Invalid hexadecimal string');
    }
    bytes[i / 2] = byte;
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  const hexString = Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join(hexSeparator.value);
    
  return hexCase.value === 'upper' ? hexString.toUpperCase() : hexString;
}

function base64ToBytes(base64: string): Uint8Array {
  try {
    const binStr = atob(base64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return bytes;
  } catch {
    throw new Error('Invalid Base64 string');
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  const binStr = String.fromCharCode(...bytes);
  return btoa(binStr);
}
</script>

<style scoped lang="scss">
.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  label {
    font-weight: 500;
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
    box-shadow: var(--input-focus-shadow);
  }
}

.result-text {
  background: var(--code-bg);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Courier New', Courier, monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--code-color);
  white-space: pre-wrap;
  word-break: break-all;
}

.error {
  color: var(--error-color);
  font-size: 0.9rem;
  padding: 0.5rem;
  border-radius: 6px;
  background: var(--error-bg);
}

.placeholder-text {
  color: var(--placeholder-color);
  font-size: 0.9rem;
  text-align: center;
  padding: 1rem;
}

.hex-options {
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 1rem;
  background: var(--code-bg);
  
  .input-group + .input-group {
    margin-top: 0.5rem;
  }
}
</style>
