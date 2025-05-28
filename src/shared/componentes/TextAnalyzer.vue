<template>
  <ComponentViewer title="Text Analyzer">
    <BaseCard>
      <div class="text-analyzer">
        <div class="input-section">
          <BasePanel title="Text">
            <BaseInput v-model="text" multiline :rows="10" placeholder="Enter or paste your text here..." />
          </BasePanel>
        </div>
        
        <div class="stats-section">
          <BasePanel title="Statistics">
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">Characters:</span>
                <span class="stat-value">{{ characterCount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Characters (no spaces):</span>
                <span class="stat-value">{{ characterCountNoSpaces }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Words:</span>
                <span class="stat-value">{{ wordCount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Lines:</span>
                <span class="stat-value">{{ lineCount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Paragraphs:</span>
                <span class="stat-value">{{ paragraphCount }}</span>
              </div>
            </div>
          </BasePanel>
        </div>
      </div>
    </BaseCard>
  </ComponentViewer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import BaseCard from './BaseCard.vue';
import BaseInput from './BaseInput.vue';
import BasePanel from './BasePanel.vue';
import ComponentViewer from './ComponentViewer.vue';

const text = ref('');

const characterCount = computed(() => text.value.length);
const characterCountNoSpaces = computed(() => text.value.replace(/\s/g, '').length);
const wordCount = computed(() => text.value.trim() ? text.value.trim().split(/\s+/).length : 0);
const lineCount = computed(() => text.value ? text.value.split('\n').length : 0);
const paragraphCount = computed(() => {
  if (!text.value.trim()) return 0;
  return text.value.split(/\n\s*\n/).filter(para => para.trim()).length;
});
</script>

<style scoped lang="scss">
.text-analyzer {
  display: flex;
  flex-direction: row;
  justify-content: stretch;
  align-items: flex-start;
  gap: 2rem;
  padding: 2rem 1rem;
  width: 100%;
}

.input-section {
  flex: 1 1 50%;
  min-width: 0;
  max-width: 100%;
}

.stats-section {
  flex: 1 1 50%;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
  padding: 0.5rem 0.5rem 0 0.5rem;
  width: 100%;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.2rem 0.5rem;
  background: var(--panel-header-bg);
  border-radius: 8px;
  min-width: 120px;
}

.stat-label {
  font-size: 0.95em;
  color: var(--text-secondary);
  text-align: center;
}

.stat-value {
  font-size: 1.6em;
  font-weight: bold;
  color: var(--text-primary);
  text-align: center;
}

@media (max-width: 900px) {
  .text-analyzer {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
  }
  .stats-section, .input-section {
    max-width: 100%;
    min-width: 0;
    flex: 1 1 100%;
    align-items: stretch;
  }
  .stats-section {
    align-items: stretch;
  }
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .stat-item {
    min-width: 0;
  }
}
</style>
