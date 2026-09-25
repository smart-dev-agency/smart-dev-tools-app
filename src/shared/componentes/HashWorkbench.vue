<template>
  <ComponentViewer :title="source === 'file' ? 'File Hash' : 'Text Hash'">
    <div class="workbench">
      <div class="stack">
        <BasePanel :title="source === 'file' ? 'Source file' : 'Input'">
          <template v-if="source === 'text'"
            ><label class="field"
              >Input encoding<select v-model="encoding">
                <option value="text">Text · UTF-8</option>
                <option value="hex">Hexadecimal bytes</option>
                <option value="base64">Base64 bytes</option>
                <option value="base64url">Base64URL bytes</option>
              </select></label
            ><label class="field input-text"
              >Content<BaseInput
                v-model="input"
                multiline
                :rows="10"
                placeholder="Type or paste your content…"
                @keydown.meta.enter.prevent="calculate"
                @keydown.ctrl.enter.prevent="calculate"
            /></label>
            <p class="hint">
              Empty input and whitespace are valid. Your content is never
              trimmed.
            </p></template
          >
          <template v-else
            ><div
              class="file-drop"
              :class="{ dragging }"
              @dragover.prevent="dragging = true"
              @dragleave.prevent="dragging = false"
              @drop.prevent="drop"
            >
              <Icon name="upload" /><strong>{{
                filename || "Drop a file here"
              }}</strong
              ><span>{{
                filename
                  ? fileSizeLabel
                  : "Any file type · processed in 2 MiB chunks"
              }}</span
              ><button
                class="base-button button-secondary"
                @click="fileInput?.click()"
                :disabled="busy"
              >
                Choose file
              </button>
            </div>
            <input
              ref="fileInput"
              class="sr-only"
              type="file"
              aria-label="Choose a file to hash"
              @change="chooseFile"
            />
            <p class="hint">
              The file never leaves your device. Large files do not load
              entirely into memory.
            </p></template
          >
        </BasePanel>
        <BasePanel title="Algorithms"
          ><fieldset>
            <legend class="sr-only">Hash algorithms</legend>
            <div class="algorithm-options">
              <label
                v-for="algorithm in algorithms"
                :key="algorithm"
                class="algorithm-option"
                ><input
                  v-model="selected"
                  type="checkbox"
                  :value="algorithm"
                  :disabled="busy"
                /><span>{{ hashLabels[algorithm] }}</span
                ><span
                  class="tag"
                  v-if="algorithm === 'md5' || algorithm === 'sha1'"
                  >Legacy</span
                ></label
              >
            </div>
          </fieldset></BasePanel
        >
        <div class="controls">
          <BaseButton
            v-if="source === 'text'"
            @click="calculate"
            :disabled="busy || !selected.length"
            >{{ busy ? "Calculating…" : "Calculate hashes"
            }}<Icon v-if="!busy" name="arrow" /></BaseButton
          ><BaseButton v-if="busy" variant="secondary" @click="stop"
            >Cancel</BaseButton
          ><BaseButton variant="secondary" @click="clear">Clear</BaseButton>
        </div>
        <div v-if="busy" class="task-progress" role="status">
          <progress
            :value="progress"
            max="1"
            aria-label="Hash progress"
          ></progress
          ><span
            >{{ Math.round(progress * 100) }}% · Computing in background</span
          >
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p v-if="notice" class="hint" role="status">{{ notice }}</p>
      </div>
      <DigestOutput
        :hashes="result?.hashes"
        :context="
          result
            ? `${filename || (encoding === 'text' ? 'UTF-8 text' : encoding + ' bytes')} · ${result.bytes.toLocaleString()} bytes`
            : ''
        "
      />
    </div>
  </ComponentViewer>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { type Encoding } from "../lib/binary";
import { droppedFile } from "../lib/fileDrop";
import {
  algorithms,
  hashLabels,
  type HashAlgorithm,
  type Hashes,
} from "../lib/hashes";
import { useWorker } from "../lib/useWorker";
import BaseButton from "./BaseButton.vue";
import BaseInput from "./BaseInput.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";
import DigestOutput from "./DigestOutput.vue";
import Icon from "./Icon.vue";
defineProps<{ source: "text" | "file" }>();
const input = ref(""),
  encoding = ref<Encoding>("text"),
  selected = ref<HashAlgorithm[]>(["sha256", "sha512", "sha1", "md5"]);
const filename = ref(""),
  fileSize = ref(0),
  fileInput = ref<HTMLInputElement>(),
  dragging = ref(false),
  notice = ref("");
const { result, busy, error, progress, run, cancel, reset } = useWorker<{
  hashes: Hashes;
  bytes: number;
}>();
const fileSizeLabel = computed(
  () =>
    `${(fileSize.value / 1024 / 1024).toLocaleString(undefined, { maximumFractionDigits: 2 })} MiB`,
);
watch(
  [input, encoding, selected],
  () => {
    reset();
    if (filename.value)
      notice.value =
        "Algorithms changed. Choose the file again to recalculate.";
    else notice.value = "";
  },
  { deep: true, flush: "sync" },
);
function calculate() {
  notice.value = "";
  if (new Blob([input.value]).size > 4 * 1024 * 1024) {
    reset();
    error.value = "Text input exceeds 4 MiB. Use File Hash for larger content.";
    return;
  }
  run({
    kind: "hash",
    text: input.value,
    encoding: encoding.value,
    algorithms: [...selected.value],
  });
}
function startFile(file: File) {
  filename.value = file.name;
  fileSize.value = file.size;
  notice.value = "";
  run(
    {
      kind: "hash",
      file,
      text: "",
      encoding: "text",
      algorithms: [...selected.value],
    },
    60 * 60 * 1000,
  );
}
function chooseFile(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files?.[0]) startFile(target.files[0]);
  target.value = "";
}
function drop(event: DragEvent) {
  dragging.value = false;
  reset();
  notice.value = "";
  try {
    startFile(droppedFile(event.dataTransfer));
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? cause.message
        : "Could not read the dropped file.";
  }
}
function stop() {
  cancel();
  notice.value = "Calculation cancelled. Your previous result was cleared.";
}
function clear() {
  reset();
  input.value = "";
  filename.value = "";
  fileSize.value = 0;
  notice.value = "";
}
</script>
<style scoped>
.input-text {
  margin-top: 16px;
}
.algorithm-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.algorithm-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 5px 0;
}
.algorithm-option .tag {
  font-size: 9px;
}
.file-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 16px;
  border: 1px dashed var(--border-strong);
  border-radius: 7px;
  text-align: center;
}
.file-drop.dragging {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.file-drop > svg {
  width: 28px;
  height: 28px;
  color: var(--accent);
  margin-bottom: 4px;
}
.file-drop strong {
  font-size: 13px;
  word-break: break-all;
}
.file-drop > span {
  font-size: 11px;
  color: var(--muted);
}
.file-drop > button {
  margin-top: 4px;
}
.task-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--muted);
  font-size: 11px;
}
</style>
