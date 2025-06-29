<template>
  <ComponentViewer title="Compare Text">
    <BaseCard>
      <div class="text-diff-content">
        <div class="controls-section">
          <BasePanel title="Comparison Options">
            <div class="controls">
              <div class="control-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="ignoreWhitespace" />
                  Ignore Whitespace
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="ignoreCase" />
                  Ignore Case
                </label>
              </div>

              <div class="stats">
                <span class="stat"
                  >Added: <strong class="added-count">{{ stats.added }}</strong></span
                >
                <span class="stat"
                  >Removed: <strong class="removed-count">{{ stats.removed }}</strong></span
                >
                <span class="stat"
                  >Modified: <strong class="modified-count">{{ stats.modified }}</strong></span
                >
              </div>
            </div>
          </BasePanel>
        </div>

        <div class="text-inputs">
          <BasePanel title="Text 1">
            <BaseInput v-model="text1" multiline :rows="8" placeholder="Enter the original text to compare..." />
          </BasePanel>

          <BasePanel title="Text 2">
            <BaseInput v-model="text2" multiline :rows="8" placeholder="Enter the modified text to compare..." />
          </BasePanel>
        </div>

        <div class="diff-results" v-if="text1 || text2">
          <BasePanel title="Comparison Results">
            <div v-if="!hasDifferences" class="no-differences">✅ No differences found between the texts</div>
            <div v-else class="diff-view">
              <div class="diff-header">
                <div class="diff-column-header original">Original (Text 1)</div>
                <div class="diff-column-header modified">Modified (Text 2)</div>
              </div>
              <div class="diff-content">
                <div v-for="(diff, index) in diffLines" :key="index" :class="['diff-row', diff.type]">
                  <div class="diff-line-original">
                    <span class="line-number">{{ diff.lineNumber1 }}</span>
                    <span class="line-content" v-html="diff.content1"></span>
                  </div>
                  <div class="diff-line-modified">
                    <span class="line-number">{{ diff.lineNumber2 }}</span>
                    <span class="line-content" v-html="diff.content2"></span>
                  </div>
                </div>
              </div>
            </div>
          </BasePanel>
        </div>
      </div>
    </BaseCard>
  </ComponentViewer>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import BaseCard from "./BaseCard.vue";
import BaseInput from "./BaseInput.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";

interface DiffRow {
  type: "unchanged" | "modified" | "added" | "removed";
  lineNumber1: string;
  lineNumber2: string;
  content1: string;
  content2: string;
}

const text1 = ref("");
const text2 = ref("");
const ignoreWhitespace = ref(false);
const ignoreCase = ref(false);

const stats = computed(() => {
  const diffData = diffLines.value;
  const added = diffData.filter((line) => line.type === "added").length;
  const removed = diffData.filter((line) => line.type === "removed").length;
  const modified = diffData.filter((line) => line.type === "modified").length;

  return { added, removed, modified };
});

const hasDifferences = computed(() => {
  if (!text1.value && !text2.value) {
    return false;
  }

  if ((!text1.value && text2.value) || (text1.value && !text2.value)) {
    return true;
  }

  const normalizedText1 = normalizeText(text1.value);
  const normalizedText2 = normalizeText(text2.value);

  return normalizedText1 !== normalizedText2;
});

const diffLines = computed(() => {
  if (!text1.value && !text2.value) {
    return [];
  }

  const lines1 = text1.value.split("\n");
  const lines2 = text2.value.split("\n");
  const result: DiffRow[] = [];
  const maxLines = Math.max(lines1.length, lines2.length);

  for (let i = 0; i < maxLines; i++) {
    const line1 = lines1[i] || "";
    const line2 = lines2[i] || "";
    const normalizedLine1 = normalizeText(line1);
    const normalizedLine2 = normalizeText(line2);

    if (i >= lines1.length) {
      result.push({
        type: "added",
        lineNumber1: "",
        lineNumber2: `${i + 1}`,
        content1: "",
        content2: `<span class="added-text">${escapeHtml(line2)}</span>`,
      });
    } else if (i >= lines2.length) {
      result.push({
        type: "removed",
        lineNumber1: `${i + 1}`,
        lineNumber2: "",
        content1: `<span class="removed-text">${escapeHtml(line1)}</span>`,
        content2: '<span class="missing-text">[línea eliminada]</span>',
      });
    } else if (normalizedLine1 === normalizedLine2) {
      result.push({
        type: "unchanged",
        lineNumber1: `${i + 1}`,
        lineNumber2: `${i + 1}`,
        content1: escapeHtml(line1),
        content2: escapeHtml(line2),
      });
    } else {
      const charDiff = getCharacterDifferences(line1, line2);
      result.push({
        type: "modified",
        lineNumber1: `${i + 1}`,
        lineNumber2: `${i + 1}`,
        content1: charDiff.content1,
        content2: charDiff.content2,
      });
    }
  }

  return result;
});

function getCharacterDifferences(line1: string, line2: string) {
  if (ignoreWhitespace.value) {
    const nonSpace1 = line1.replace(/\s/g, "");
    const nonSpace2 = line2.replace(/\s/g, "");
    const normalizedNonSpace1 = ignoreCase.value ? nonSpace1.toLowerCase() : nonSpace1;
    const normalizedNonSpace2 = ignoreCase.value ? nonSpace2.toLowerCase() : nonSpace2;

    if (normalizedNonSpace1 === normalizedNonSpace2) {
      return {
        content1: escapeHtml(line1),
        content2: escapeHtml(line2),
      };
    }

    return getIntelligentWhitespaceDiff(line1, line2);
  } else {
    return getNormalCharacterDiff(line1, line2);
  }
}

function getIntelligentWhitespaceDiff(line1: string, line2: string) {
  const result1: string[] = [];
  const result2: string[] = [];

  const tokens1 = line1.match(/\S+|\s+/g) || [];
  const tokens2 = line2.match(/\S+|\s+/g) || [];

  let i1 = 0,
    i2 = 0;

  while (i1 < tokens1.length || i2 < tokens2.length) {
    const token1 = tokens1[i1] || "";
    const token2 = tokens2[i2] || "";

    if (/^\s+$/.test(token1) && /^\s+$/.test(token2)) {
      result1.push(escapeHtml(token1));
      result2.push(escapeHtml(token2));
      i1++;
      i2++;
      continue;
    }

    if (/^\s+$/.test(token1) && !token2) {
      result1.push(escapeHtml(token1));
      i1++;
      continue;
    }

    if (/^\s+$/.test(token2) && !token1) {
      result2.push(escapeHtml(token2));
      i2++;
      continue;
    }

    if (/^\s+$/.test(token1) && !/^\s+$/.test(token2)) {
      result1.push(escapeHtml(token1));
      i1++;
      continue;
    }

    if (/^\s+$/.test(token2) && !/^\s+$/.test(token1)) {
      result2.push(escapeHtml(token2));
      i2++;
      continue;
    }

    if (!token1) {
      result1.push(`<span class="missing-char"> </span>`);
      result2.push(`<span class="added-char">${escapeHtml(token2)}</span>`);
      i2++;
    } else if (!token2) {
      result1.push(`<span class="removed-char">${escapeHtml(token1)}</span>`);
      result2.push(`<span class="missing-char"> </span>`);
      i1++;
    } else {
      const normalizedToken1 = ignoreCase.value ? token1.toLowerCase() : token1;
      const normalizedToken2 = ignoreCase.value ? token2.toLowerCase() : token2;

      if (normalizedToken1 === normalizedToken2) {
        result1.push(escapeHtml(token1));
        result2.push(escapeHtml(token2));
      } else {
        const wordDiff = getNormalCharacterDiff(token1, token2);
        result1.push(wordDiff.content1);
        result2.push(wordDiff.content2);
      }
      i1++;
      i2++;
    }
  }

  return {
    content1: result1.join(""),
    content2: result2.join(""),
  };
}

function getNormalCharacterDiff(line1: string, line2: string) {
  const chars1 = line1.split("");
  const chars2 = line2.split("");
  const result1: string[] = [];
  const result2: string[] = [];
  const maxLength = Math.max(chars1.length, chars2.length);

  for (let i = 0; i < maxLength; i++) {
    const char1 = chars1[i] || "";
    const char2 = chars2[i] || "";

    if (i >= chars1.length) {
      result1.push(`<span class="missing-char"> </span>`);
      result2.push(`<span class="added-char">${escapeHtml(char2)}</span>`);
    } else if (i >= chars2.length) {
      result1.push(`<span class="removed-char">${escapeHtml(char1)}</span>`);
      result2.push(`<span class="missing-char"> </span>`);
    } else {
      const normalizedChar1 = ignoreCase.value ? char1.toLowerCase() : char1;
      const normalizedChar2 = ignoreCase.value ? char2.toLowerCase() : char2;

      if (normalizedChar1 === normalizedChar2) {
        result1.push(escapeHtml(char1));
        result2.push(escapeHtml(char2));
      } else {
        result1.push(`<span class="removed-char">${escapeHtml(char1)}</span>`);
        result2.push(`<span class="modified-char">${escapeHtml(char2)}</span>`);
      }
    }
  }

  return {
    content1: result1.join(""),
    content2: result2.join(""),
  };
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function normalizeText(text: string): string {
  let normalized = text;

  if (ignoreWhitespace.value) {
    normalized = normalized.replace(/\s/g, "");
  }

  if (ignoreCase.value) {
    normalized = normalized.toLowerCase();
  }

  return normalized;
}
</script>

<style scoped lang="scss">
.text-diff-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  height: 100%;
  width: 100%;
}

.controls-section {
  width: 100%;
}

.text-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  width: 100%;
}

.diff-results {
  width: 100%;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  gap: 1.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
  color: var(--text-primary);
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.stats {
  display: flex;
  gap: 1.5rem;
  font-size: 0.9rem;
}

.stat {
  color: var(--text-primary);
}

.added-count {
  color: #22c55e;
}

.removed-count {
  color: #ef4444;
}

.modified-count {
  color: #f59e0b;
}

.no-differences {
  text-align: center;
  padding: 2rem;
  color: var(--text-primary);
  font-size: 1.1rem;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.diff-view {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  overflow: hidden;
}

.diff-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: var(--sidebar-bg);
  border-bottom: 1px solid var(--input-border);
}

.diff-column-header {
  padding: 0.75rem 1rem;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  border-right: 1px solid var(--input-border);

  &.original {
    background: rgba(239, 68, 68, 0.1);
  }

  &.modified {
    background: rgba(34, 197, 94, 0.1);
    border-right: none;
  }
}

.diff-content {
  max-height: 400px;
  overflow-y: auto;
}

.diff-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid var(--input-border);

  &:last-child {
    border-bottom: none;
  }

  &.added {
    background: rgba(34, 197, 94, 0.05);
  }

  &.removed {
    background: rgba(239, 68, 68, 0.05);
  }

  &.modified {
    background: rgba(249, 158, 11, 0.05);
  }
}

.diff-line-original,
.diff-line-modified {
  display: flex;
  align-items: flex-start;
  padding: 0.5rem;
  border-right: 1px solid var(--input-border);
  font-family: "Courier New", monospace;
  font-size: 0.9rem;
  line-height: 1.4;
  min-height: 2rem;
}

.diff-line-modified {
  border-right: none;
}

.line-number {
  min-width: 40px;
  padding-right: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.7;
  font-size: 0.8rem;
  text-align: right;
  user-select: none;
  flex-shrink: 0;
}

.line-content {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-primary);
}

:deep(.added-text) {
  background-color: rgba(34, 197, 94, 0.3);
  border-radius: 3px;
  padding: 1px 3px;
}

:deep(.removed-text) {
  background-color: rgba(239, 68, 68, 0.3);
  border-radius: 3px;
  padding: 1px 3px;
}

:deep(.missing-text) {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 3px;
  padding: 1px 3px;
  font-style: italic;
  color: var(--text-secondary);
}

:deep(.added-char) {
  background-color: rgba(34, 197, 94, 0.5);
  border-radius: 2px;
  padding: 0 1px;
  border: 1px solid rgba(34, 197, 94, 0.7);
}

:deep(.removed-char) {
  background-color: rgba(239, 68, 68, 0.5);
  border-radius: 2px;
  padding: 0 1px;
  border: 1px solid rgba(239, 68, 68, 0.7);
}

:deep(.modified-char) {
  background-color: rgba(249, 158, 11, 0.5);
  border-radius: 2px;
  padding: 0 1px;
  border: 1px solid rgba(249, 158, 11, 0.7);
}

:deep(.missing-char) {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 2px;
  padding: 0 1px;
  border: 1px dashed rgba(156, 163, 175, 0.5);
  opacity: 0.6;
}

:deep(.added-word) {
  background-color: rgba(34, 197, 94, 0.4);
  border-radius: 2px;
  padding: 0 2px;
}

:deep(.removed-word) {
  background-color: rgba(239, 68, 68, 0.4);
  border-radius: 2px;
  padding: 0 2px;
}

:deep(.modified-word) {
  background-color: rgba(249, 158, 11, 0.4);
  border-radius: 2px;
  padding: 0 2px;
}

@media (max-width: 768px) {
  .text-inputs {
    grid-template-columns: 1fr;
  }

  .diff-header,
  .diff-row {
    grid-template-columns: 1fr;
  }

  .diff-line-original {
    border-bottom: 1px solid var(--input-border);
    border-right: none;
  }

  .controls {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .stats {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
