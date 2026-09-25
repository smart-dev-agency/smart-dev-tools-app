<template>
  <ComponentViewer title="Base64 & Hex"
    ><div class="workbench">
      <div class="stack">
        <BasePanel title="Input"
          ><label class="field"
            >Input encoding<select v-model="inputFormat">
              <option value="text">Text · UTF-8</option>
              <option value="hex">Hexadecimal</option>
              <option value="base64">Base64</option>
              <option value="base64url">Base64URL</option>
            </select></label
          ><label class="field spaced"
            >Content<BaseInput
              v-model="input"
              multiline
              :rows="10"
              placeholder="Enter the value to convert…" /></label></BasePanel
        ><BasePanel title="Convert to"
          ><div class="controls">
            <label class="field"
              >Output encoding<select v-model="outputFormat">
                <option value="text">Text · UTF-8</option>
                <option value="hex">Hexadecimal</option>
                <option value="base64">Base64</option>
                <option value="base64url">Base64URL</option>
              </select></label
            ><label v-if="outputFormat === 'hex'" class="field"
              >Letter case<select v-model="uppercase">
                <option :value="false">Lowercase</option>
                <option :value="true">Uppercase</option>
              </select></label
            ><label v-if="outputFormat === 'hex'" class="field"
              >Byte separator<select v-model="separator">
                <option value="">None</option>
                <option value=" ">Space</option>
                <option value=":">Colon</option>
                <option value="-">Dash</option>
              </select></label
            >
          </div></BasePanel
        >
        <div class="controls">
          <BaseButton :disabled="busy" @click="convert">{{
            busy ? "Converting…" : "Convert"
          }}</BaseButton
          ><BaseButton variant="secondary" @click="clear">Clear</BaseButton>
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p class="hint">
          Strict byte validation. Invalid hexadecimal, Base64 and UTF-8 are
          reported, never silently repaired.
        </p>
      </div>
      <BasePanel title="Result" :content="result?.text"
        ><template v-if="result">
          <pre>{{ result.text.slice(0, 100000) }}</pre>
          <p class="hint" v-if="result.text.length > 100000">
            Preview shows the first 100,000 characters. Copy and export include
            the full result.
          </p>
          <div class="action-row">
            <span class="tag">{{ result.bytes.toLocaleString() }} bytes</span
            ><BaseButton variant="secondary" @click="swap"
              >Use as input</BaseButton
            ><BaseButton variant="secondary" @click="download"
              >Export</BaseButton
            >
          </div></template
        >
        <div v-else class="empty-result">
          <span class="empty-symbol">64</span>
          <h2>A different representation. Same bytes.</h2>
          <p>Convert text, hexadecimal, Base64 and Base64URL locally.</p>
        </div></BasePanel
      >
    </div></ComponentViewer
  >
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import type { Encoding } from "../lib/binary";
import { useWorker } from "../lib/useWorker";
import { saveText } from "../lib/output";
import BaseButton from "./BaseButton.vue";
import BasePanel from "./BasePanel.vue";
import BaseInput from "./BaseInput.vue";
import ComponentViewer from "./ComponentViewer.vue";
const input = ref(""),
  inputFormat = ref<Encoding>("text"),
  outputFormat = ref<Encoding>("base64"),
  uppercase = ref(false),
  separator = ref("");
const { result, busy, error, run, reset } = useWorker<{
  text: string;
  bytes: number;
}>();
watch([input, inputFormat, outputFormat, uppercase, separator], reset, {
  flush: "sync",
});
function convert() {
  run({
    kind: "convert",
    text: input.value,
    input: inputFormat.value,
    output: outputFormat.value,
    uppercase: uppercase.value,
    separator: separator.value,
  });
}
function clear() {
  input.value = "";
  reset();
}
function swap() {
  if (!result.value) return;
  const text = result.value.text,
    from = inputFormat.value;
  input.value = text;
  inputFormat.value = outputFormat.value;
  outputFormat.value = from;
}
async function download() {
  if (!result.value) return;
  try {
    await saveText(result.value.text, "converted.txt");
  } catch {
    error.value = "Could not save the result.";
  }
}
</script>
<style scoped>
.spaced {
  margin-top: 16px;
}
</style>
