<template>
  <ComponentViewer title="Regex Tester">
    <BaseCard>
      <div class="regex-tester-content">
        <div class="input-section">
          <BasePanel title="Regular Expression">
            <div class="regex-input-wrapper">
              <span class="delimiter">/</span>
              <BaseInput v-model="pattern" placeholder="Enter your regular expression" class="regex-input" />
              <span class="delimiter">/</span>
              <input v-model="flags" placeholder="flags" class="flags-input" maxlength="6" />
            </div>
          </BasePanel>

          <div class="action-buttons">
            <BaseButton @click="testRegex" :disabled="!pattern">Test</BaseButton>
            <div v-if="error" class="error-message">{{ error }}</div>
          </div>

          <BasePanel title="Test Text">
            <BaseInput v-model="testText" placeholder="Enter text to test the regular expression" multiline :rows="5" />
          </BasePanel>
        </div>
        <div class="results-section">
          <BasePanel title="Results">
            <div v-if="testResults.length === 0 && !error" class="placeholder-message">No matches found.</div>
            <div v-else class="match-results">
              <div v-for="(match, idx) in testResults" :key="idx" class="match-item">
                <div class="match-header">
                  <span class="match-index">Match {{ idx + 1 }}</span>
                  <span class="match-position">at {{ match.index }}</span>
                </div>
                <div class="match-content">{{ match.text }}</div>
                <div v-if="match.groups && Object.keys(match.groups).length" class="match-groups">
                  <div class="group-header">Captured groups:</div>
                  <div v-for="(group, name) in match.groups" :key="name" class="group-item">
                    <span class="group-name">{{ isNaN(Number(name)) ? name : `Group ${name}` }}:</span>
                    <pre class="group-content">{{ group }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </BasePanel>

          <BasePanel title="Highlighted Preview">
            <div v-if="!testText" class="placeholder-message">The text with highlighted matches will appear here</div>
            <div v-else class="highlight-preview" v-html="highlightedText"></div>
          </BasePanel>

          <BasePanel title="Quick Reference">
            <div class="reference-content">
              <div class="reference-section">
                <h3>Special Characters</h3>
                <div class="reference-grid">
                  <div class="reference-item"><code>.</code> - Any character except newline</div>
                  <div class="reference-item"><code>\d</code> - Digit (0-9)</div>
                  <div class="reference-item"><code>\D</code> - Not a digit</div>
                  <div class="reference-item"><code>\w</code> - Word character (a-z, A-Z, 0-9, _)</div>
                  <div class="reference-item"><code>\W</code> - Not a word character</div>
                  <div class="reference-item"><code>\s</code> - Whitespace</div>
                  <div class="reference-item"><code>\S</code> - Not whitespace</div>
                  <div class="reference-item"><code>\b</code> - Word boundary</div>
                </div>
              </div>

              <div class="reference-section">
                <h3>Quantifiers</h3>
                <div class="reference-grid">
                  <div class="reference-item"><code>*</code> - 0 or more</div>
                  <div class="reference-item"><code>+</code> - 1 or more</div>
                  <div class="reference-item"><code>?</code> - 0 or 1</div>
                  <div class="reference-item"><code>{n}</code> - Exactly n</div>
                  <div class="reference-item"><code>{n,}</code> - n or more</div>
                  <div class="reference-item"><code>{n,m}</code> - Between n and m</div>
                </div>
              </div>

              <div class="reference-section">
                <h3>Flags</h3>
                <div class="reference-grid">
                  <div class="reference-item"><code>g</code> - Global (all matches)</div>
                  <div class="reference-item"><code>i</code> - Case-insensitive</div>
                  <div class="reference-item"><code>m</code> - Multiline</div>
                  <div class="reference-item"><code>s</code> - Dot includes newlines</div>
                  <div class="reference-item"><code>u</code> - Unicode</div>
                  <div class="reference-item"><code>y</code> - Sticky (from current position)</div>
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
import BaseButton from "./BaseButton.vue";
import BaseCard from "./BaseCard.vue";
import BaseInput from "./BaseInput.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";

const pattern = ref("");
const flags = ref("g");
const testText = ref("");
const error = ref("");
const testResults = ref<Array<{ index: number; text: string; groups: Record<string, string> }>>([]);

function testRegex() {
  error.value = "";
  testResults.value = [];

  if (!pattern.value) {
    error.value = "Please enter a regular expression";
    return;
  }

  if (!testText.value) {
    error.value = "Please enter text to test";
    return;
  }

  try {
    const regex = new RegExp(pattern.value, flags.value);

    if (!flags.value.includes("g")) {
      const match = regex.exec(testText.value);
      if (match) {
        const groups: Record<string, string> = {};

        if (match.groups) {
          Object.assign(groups, match.groups);
        } else {
          for (let i = 1; i < match.length; i++) {
            if (match[i] !== undefined) {
              groups[i] = match[i];
            }
          }
        }

        testResults.value.push({
          index: match.index,
          text: match[0],
          groups,
        });
      }
    } else {
      const matches = Array.from(testText.value.matchAll(regex));

      matches.forEach((match) => {
        const groups: Record<string, string> = {};

        if (match.groups) {
          Object.assign(groups, match.groups);
        } else {
          for (let i = 1; i < match.length; i++) {
            if (match[i] !== undefined) {
              groups[i] = match[i];
            }
          }
        }

        testResults.value.push({
          index: match.index || 0,
          text: match[0],
          groups,
        });
      });
    }
  } catch (e: any) {
    error.value = `Error: ${e.message}`;
  }
}

const highlightedText = computed(() => {
  if (!testText.value || !pattern.value || testResults.value.length === 0) {
    return escapeHtml(testText.value);
  }

  let result = escapeHtml(testText.value);

  const sortedMatches = [...testResults.value].sort((a, b) => b.index - a.index);

  for (const match of sortedMatches) {
    const beforeMatch = result.substring(0, match.index);
    const afterMatch = result.substring(match.index + match.text.length);
    const highlightedMatch = `<span class="highlight">${escapeHtml(match.text)}</span>`;

    result = beforeMatch + highlightedMatch + afterMatch;
  }

  return result.replace(/\n/g, "<br>");
});

function escapeHtml(str: string): string {
  if (!str) return "";

  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
</script>

<style scoped lang="scss">
.regex-tester-content {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  width: 100%;
  height: 100%;
  gap: 1.5rem;
  overflow-y: auto;

  @media (min-width: 768px) {
    flex-direction: row;
  }
}

.input-section,
.results-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

.regex-input-wrapper {
  display: flex;
  align-items: center;
  background-color: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 0 0.6em;
  transition: all 0.2s ease;

  &:focus-within {
    border-color: var(--button-bg);
    box-shadow: 0 0 0 2px rgba(36, 200, 219, 0.2);
  }
}

.regex-input {
  border: none !important;
  box-shadow: none !important;
  flex: 1;

  &:focus {
    box-shadow: none !important;
  }
}

.delimiter {
  color: var(--text-secondary);
  font-family: "Monaco", "Menlo", "Courier New", monospace;
  font-size: 1.2rem;
  padding: 0 0.25em;
}

.flags-input {
  width: 60px;
  background-color: transparent;
  border: none;
  color: var(--text-primary);
  padding: 0.6em 0.5em;
  font-family: "Monaco", "Menlo", "Courier New", monospace;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: var(--placeholder-color);
  }
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1rem 0;
}

.error-message {
  color: var(--error-color);
  font-size: 0.9rem;
  background-color: var(--error-bg);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  max-width: 70%;
}

.placeholder-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 150px;
  color: var(--placeholder-color);
  text-align: center;
  font-size: 0.9rem;
}

.match-results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.match-stats {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.matches-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 300px;
  overflow-y: auto;
}

.match-item {
  background-color: var(--panel-content-bg);
  border-radius: 6px;
  padding: 1rem;
  border-left: 3px solid var(--button-bg);
}

.match-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.match-index {
  font-weight: 600;
}

.match-position {
  color: var(--text-secondary);
}

.match-content {
  background-color: var(--code-bg);
  padding: 0.75rem;
  border-radius: 6px;
  margin: 0.5rem 0;
  font-family: "Monaco", "Menlo", "Courier New", monospace;
  font-size: 0.9rem;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--code-color);
}

.match-groups {
  margin-top: 0.5rem;
}

.group-header {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

.group-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.5rem;
  padding-left: 1rem;
}

.group-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.group-content {
  background-color: rgba(var(--code-bg-rgb), 0.5);
  padding: 0.5rem;
  border-radius: 4px;
  margin: 0.25rem 0 0.5rem;
  font-family: "Monaco", "Menlo", "Courier New", monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-all;
}

.highlight-preview {
  background-color: var(--panel-content-bg);
  padding: 1rem;
  border-radius: 6px;
  max-height: 300px;
  overflow-y: auto;
  font-family: "Monaco", "Menlo", "Courier New", monospace;
  font-size: 0.9rem;
  white-space: pre-wrap;
  line-height: 1.6;

  :deep(.highlight) {
    background-color: rgba(255, 230, 0, 0.3);
    border-radius: 3px;
    color: inherit;
    display: inline;
    padding: 1px 3px;
  }
}

.reference-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.reference-section {
  h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.reference-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}

.reference-item {
  font-size: 0.85rem;

  code {
    background-color: var(--code-bg);
    color: var(--button-bg);
    padding: 0.15em 0.4em;
    border-radius: 4px;
    font-family: "Monaco", "Menlo", "Courier New", monospace;
    margin-right: 0.25em;
  }
}
</style>
