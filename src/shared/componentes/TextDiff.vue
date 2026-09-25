<template>
  <ComponentViewer title="Text Diff"
    ><div class="stack">
      <div class="controls diff-options">
        <label class="check-option"
          ><input type="checkbox" v-model="ignoreWhitespace" />Ignore
          whitespace</label
        ><label class="check-option"
          ><input type="checkbox" v-model="ignoreCase" />Ignore case</label
        ><label class="check-option"
          ><input type="checkbox" v-model="wrap" />Wrap lines</label
        ><BaseButton variant="secondary" @click="clear">Clear</BaseButton>
      </div>
      <div class="workbench diff-inputs">
        <BasePanel title="Original"
          ><BaseInput
            v-model="before"
            multiline
            :rows="8"
            placeholder="Original text…" /></BasePanel
        ><BasePanel title="Modified"
          ><BaseInput
            v-model="after"
            multiline
            :rows="8"
            placeholder="Modified text…"
        /></BasePanel>
      </div>
      <p v-if="large && !result" class="notice">
        Large input. Automatic comparison is paused; compare explicitly to keep
        editing responsive.
      </p>
      <div v-if="large || busy || error" class="controls">
        <BaseButton @click="compare" :disabled="busy">{{
          busy ? "Comparing…" : "Compare text"
        }}</BaseButton
        ><BaseButton v-if="busy" variant="secondary" @click="cancel"
          >Cancel</BaseButton
        >
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <BasePanel title="Comparison"
        ><template #actions
          ><span class="tag" v-if="result" role="status"
            >+{{ stats.added }} added · −{{ stats.removed }} removed ·
            {{ stats.modified }} modified</span
          ></template
        >
        <div v-if="!result" class="empty-result">
          <span class="empty-symbol">±</span>
          <h2>See what changed</h2>
          <p>
            Small inputs compare automatically. Insertions and deletions stay
            aligned.
          </p>
        </div>
        <template v-else
          ><p
            v-if="!stats.added && !stats.removed && !stats.modified"
            class="success"
            role="status"
          >
            No differences found with the current options.
          </p>
          <div v-else class="diff-table" :class="{ wrap }">
            <div class="diff-headers">
              <span>Original</span><span>Modified</span>
            </div>
            <div
              v-for="(row, index) in pageRows"
              :key="page * 100 + index"
              class="diff-row"
              :class="row.type"
            >
              <div class="diff-cell">
                <span class="line-number">{{ row.left ?? "—" }}</span>
                <pre><template v-for="(part, partIndex) in highlight(row.before, row.after, row.type)" :key="partIndex"><mark v-if="part.changed">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></pre>
              </div>
              <div class="diff-cell">
                <span class="line-number">{{ row.right ?? "—" }}</span>
                <pre><template v-for="(part, partIndex) in highlight(row.after, row.before, row.type)" :key="partIndex"><mark v-if="part.changed">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></pre>
              </div>
            </div>
          </div>
          <div v-if="result.length > 100" class="action-row pagination">
            <BaseButton
              variant="secondary"
              :disabled="page === 0"
              @click="page--"
              >Previous</BaseButton
            ><span class="hint"
              >Page {{ page + 1 }} / {{ Math.ceil(result.length / 100) }} · 100
              rows per page</span
            ><BaseButton
              variant="secondary"
              :disabled="(page + 1) * 100 >= result.length"
              @click="page++"
              >Next</BaseButton
            >
          </div></template
        ></BasePanel
      >
      <p class="hint">
        Runs off the UI thread. Large divergent inputs have an explicit work
        limit; no comparison is silently truncated.
      </p>
    </div></ComponentViewer
  >
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { DiffRow } from "../lib/textTools";
import { useWorker } from "../lib/useWorker";
import BaseButton from "./BaseButton.vue";
import BasePanel from "./BasePanel.vue";
import BaseInput from "./BaseInput.vue";
import ComponentViewer from "./ComponentViewer.vue";
const before = ref(""),
  after = ref(""),
  ignoreWhitespace = ref(false),
  ignoreCase = ref(false),
  wrap = ref(false),
  page = ref(0);
const { result, busy, error, run, cancel, reset } = useWorker<DiffRow[]>();
const large = computed(
  () =>
    before.value.length + after.value.length > 200000 ||
    before.value.split("\n").length + after.value.split("\n").length > 2000,
);
const pageRows = computed(
  () => result.value?.slice(page.value * 100, (page.value + 1) * 100) ?? [],
);
const stats = computed(() => ({
  added: result.value?.filter((row) => row.type === "added").length ?? 0,
  removed: result.value?.filter((row) => row.type === "removed").length ?? 0,
  modified: result.value?.filter((row) => row.type === "modified").length ?? 0,
}));
let timer: ReturnType<typeof setTimeout>;
watch(
  [before, after, ignoreWhitespace, ignoreCase],
  () => {
    clearTimeout(timer);
    reset();
    page.value = 0;
    if (!large.value && (before.value || after.value))
      timer = setTimeout(compare, 180);
  },
  { flush: "sync" },
);
function compare() {
  clearTimeout(timer);
  page.value = 0;
  run(
    {
      kind: "diff",
      before: before.value,
      after: after.value,
      ignoreWhitespace: ignoreWhitespace.value,
      ignoreCase: ignoreCase.value,
    },
    10_000,
  );
}
function clear() {
  before.value = "";
  after.value = "";
  reset();
}
function highlight(text: string, other: string, type: DiffRow["type"]) {
  if (type !== "modified" || text.length + other.length > 8000)
    return [{ text, changed: false }];
  const a = Array.from(text),
    b = Array.from(other);
  let first = 0,
    last = 0;
  while (first < Math.min(a.length, b.length) && a[first] === b[first]) first++;
  while (
    last < Math.min(a.length, b.length) - first &&
    a[a.length - 1 - last] === b[b.length - 1 - last]
  )
    last++;
  return [
    { text: a.slice(0, first).join(""), changed: false },
    { text: a.slice(first, a.length - last).join(""), changed: true },
    { text: a.slice(a.length - last).join(""), changed: false },
  ];
}
onBeforeUnmount(() => clearTimeout(timer));
</script>
<style scoped>
.diff-inputs {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
.diff-options {
  font-size: 12px;
}
.diff-options > button {
  margin-left: auto;
}
.diff-headers,
.diff-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
.diff-headers {
  padding: 10px 0;
  font-size: 11px;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
}
.diff-headers span {
  padding-left: 10px;
}
.diff-cell {
  display: flex;
  gap: 10px;
  min-width: 0;
  padding: 4px 8px;
  border-bottom: 1px solid var(--border);
}
.diff-cell:first-child {
  border-right: 1px solid var(--border);
}
.line-number {
  width: 34px;
  flex-shrink: 0;
  color: var(--muted);
  font: 10px/21px var(--mono);
  user-select: none;
  text-align: right;
}
.diff-cell pre {
  white-space: pre;
  overflow-x: auto;
  min-width: 0;
  flex: 1;
  font-size: 11px;
}
.wrap .diff-cell pre {
  white-space: pre-wrap;
}
.added .diff-cell:last-child {
  background: var(--success-soft);
}
.removed .diff-cell:first-child {
  background: var(--danger-soft);
}
.modified .diff-cell:first-child mark {
  background: var(--danger-soft);
  color: var(--danger);
}
.modified .diff-cell:last-child mark {
  background: var(--success-soft);
  color: var(--success);
}
.pagination {
  justify-content: space-between;
}
.pagination .hint {
  margin: 0;
}
@container workspace (max-width: 600px) {
  .diff-inputs {
    grid-template-columns: 1fr;
  }
}
</style>
