<template>
  <ComponentViewer title="Regex Tester"
    ><div class="workbench">
      <div class="stack">
        <BasePanel title="Expression"
          ><div class="controls">
            <label class="field"
              >Pattern<input
                v-model="pattern"
                spellcheck="false"
                placeholder="(?<name>\\w+)" /></label
            ><label class="field flags-field"
              >Flags<input v-model="flags" spellcheck="false" placeholder="gim"
            /></label>
          </div>
          <label class="field spaced"
            >Test text<BaseInput
              v-model="input"
              multiline
              :rows="12"
              placeholder="Enter text to test…"
          /></label>
          <div class="action-row">
            <BaseButton :disabled="busy" @click="test">{{
              busy ? "Testing…" : "Test expression"
            }}</BaseButton
            ><BaseButton v-if="busy" variant="secondary" @click="cancel"
              >Cancel</BaseButton
            ><BaseButton variant="secondary" @click="clear">Clear</BaseButton>
          </div></BasePanel
        >
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p class="hint">
          Isolated execution · 2-second timeout · 1 MiB input limit. A slow
          pattern cannot lock the interface.
        </p>
        <BasePanel title="Quick reference"
          ><dl class="reference">
            <div v-for="[code, label] in reference" :key="code">
              <dt>
                <code>{{ code }}</code>
              </dt>
              <dd>{{ label }}</dd>
            </div>
          </dl></BasePanel
        >
      </div>
      <div class="stack">
        <BasePanel title="Matches"
          ><template v-if="result"
            ><p class="match-summary" role="status">
              {{ result.matches.length }}
              {{ result.truncated ? "shown" : "matches" }}
            </p>
            <p v-if="result.truncated" class="notice">
              Results are limited to 1,000 matches or 2 MiB of captures.
            </p>
            <p v-if="!result.matches.length" class="hint">No matches found.</p>
            <article
              v-for="(match, index) in result.matches.slice(0, visible)"
              :key="index"
              class="match"
            >
              <header>
                <strong>Match {{ index + 1 }}</strong
                ><span>index {{ match.index }}</span>
              </header>
              <pre>{{ match.text || "(zero-width match)" }}</pre>
              <dl v-if="Object.keys(match.groups).length" class="captures">
                <div v-for="(value, name) in match.groups" :key="name">
                  <dt>{{ name }}</dt>
                  <dd>{{ value }}</dd>
                </div>
              </dl>
            </article>
            <BaseButton
              v-if="result.matches.length > visible"
              class="spaced"
              variant="secondary"
              @click="visible += 100"
              >Show next 100</BaseButton
            ></template
          >
          <div v-else class="empty-result">
            <span class="empty-symbol">.*</span>
            <h2>Find the pattern</h2>
            <p>
              Test a JavaScript regular expression and inspect numbered or named
              captures.
            </p>
          </div></BasePanel
        ><BasePanel v-if="result" title="Highlighted preview">
          <pre
            class="preview"
          ><template v-for="(part, index) in preview" :key="index"><mark v-if="part.match">{{ part.text || '│' }}</mark><template v-else>{{ part.text }}</template></template></pre>
          <p v-if="input.length > 100000" class="hint">
            Preview shows the first 100,000 characters.
          </p></BasePanel
        >
      </div>
    </div></ComponentViewer
  >
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { RegexResult } from "../lib/textTools";
import { useWorker } from "../lib/useWorker";
import BaseButton from "./BaseButton.vue";
import BasePanel from "./BasePanel.vue";
import BaseInput from "./BaseInput.vue";
import ComponentViewer from "./ComponentViewer.vue";
const pattern = ref(""),
  flags = ref("g"),
  input = ref(""),
  visible = ref(100);
const { result, busy, error, run, cancel, reset } = useWorker<RegexResult>();
watch([pattern, flags, input], reset, { flush: "sync" });
function test() {
  visible.value = 100;
  run(
    {
      kind: "regex",
      pattern: pattern.value,
      flags: flags.value,
      text: input.value,
    },
    2000,
  );
}
function clear() {
  pattern.value = "";
  input.value = "";
  reset();
}
const reference = [
  ["\\d / \\w / \\s", "Digit / word character / whitespace"],
  [". / ^ / $", "Any character / start / end"],
  ["* / + / ?", "Zero or more / one or more / optional"],
  ["{n,m}", "Between n and m repetitions"],
  ["(?<name>…)", "Named capturing group"],
  ["g / i / m", "Global / ignore case / multiline"],
  ["s / u / y", "Dot-all / Unicode / sticky"],
];
const preview = computed(() => {
  const text = input.value.slice(0, 100000),
    parts: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;
  for (const match of result.value?.matches ?? []) {
    if (match.index > text.length) break;
    parts.push(
      { text: text.slice(cursor, match.index), match: false },
      {
        text: text.slice(match.index, match.index + match.text.length),
        match: true,
      },
    );
    cursor = Math.min(text.length, match.index + match.text.length);
  }
  parts.push({ text: text.slice(cursor), match: false });
  return parts;
});
</script>
<style scoped>
.spaced {
  margin-top: 16px;
}
.controls .flags-field {
  flex: 0 0 76px;
  min-width: 0;
}
.reference {
  margin: 0;
}
.reference > div {
  display: flex;
  gap: 14px;
  padding: 6px 0;
  font-size: 11px;
}
.reference dt {
  min-width: 110px;
  color: var(--accent);
}
.reference dd {
  margin: 0;
  color: var(--muted);
}
.match-summary {
  font-size: 12px;
  margin-bottom: 12px;
}
.match {
  border-top: 1px solid var(--border);
  padding: 12px 0;
}
.match header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 6px;
}
.match header span {
  color: var(--muted);
}
.captures {
  margin: 10px 0 0;
  font: 11px var(--mono);
}
.captures > div {
  display: flex;
  gap: 8px;
}
.captures dt {
  color: var(--accent);
}
.captures dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.preview {
  max-height: 450px;
  overflow: auto;
}
mark {
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 2px;
}
</style>
