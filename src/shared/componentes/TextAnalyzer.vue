<template>
  <ComponentViewer title="Text Analyzer"
    ><div class="workbench">
      <BasePanel title="Text"
        ><BaseInput
          v-model="text"
          multiline
          :rows="14"
          placeholder="Enter or paste your text…"
        />
        <p class="hint">
          Counts update after typing stops. Words are whitespace-separated;
          characters are Unicode code points, not grapheme clusters.
        </p>
        <BaseButton class="action-row" variant="secondary" @click="text = ''"
          >Clear</BaseButton
        ></BasePanel
      >
      <BasePanel
        title="Statistics"
        :content="
          result
            ? Object.entries(result)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')
            : undefined
        "
        ><div v-if="result" class="stats-grid">
          <div v-for="(value, key) in result" :key="key" class="stat">
            <span>{{ key }}</span
            ><strong>{{ value.toLocaleString() }}</strong>
          </div>
        </div>
        <p v-else class="muted">
          {{ busy ? "Counting…" : "Enter text to see its statistics." }}
        </p>
        <p v-if="error" role="alert" class="error">{{ error }}</p></BasePanel
      >
    </div></ComponentViewer
  >
</template>
<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from "vue";
import { useWorker } from "../lib/useWorker";
import BaseInput from "./BaseInput.vue";
import BasePanel from "./BasePanel.vue";
import BaseButton from "./BaseButton.vue";
import ComponentViewer from "./ComponentViewer.vue";
const text = ref("");
const { result, busy, error, run, reset } = useWorker<Record<string, number>>();
let timer: ReturnType<typeof setTimeout>;
watch(text, () => {
  clearTimeout(timer);
  reset();
  timer = setTimeout(() => run({ kind: "statistics", text: text.value }), 250);
});
onBeforeUnmount(() => clearTimeout(timer));
</script>
<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.stat {
  border-radius: 7px;
  background: var(--surface-alt);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.stat span {
  font-size: 11px;
  color: var(--muted);
}
.stat strong {
  font: 25px var(--mono);
}
</style>
