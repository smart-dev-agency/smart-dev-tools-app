<template>
  <div class="base-panel">
    <div class="panel-header">
      <h2 class="panel-title">{{ title }}</h2>
      <button v-if="content" class="copy-button" @click="copyContent" :title="copyStatus">
        <span v-if="!copied">📋</span>
        <span v-else>✓</span>
      </button>
    </div>
    <div class="panel-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  title: string;
  content?: string;
}>();

const copied = ref(false);
const copyStatus = computed(() => copied.value ? 'Copied!' : 'Copy to clipboard');

async function copyContent() {
  if (!props.content) return;
  
  try {
    await navigator.clipboard.writeText(props.content);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Copy error:', err);
  }
}
</script>

<style scoped lang="scss">
.base-panel {
  background: var(--panel-bg);
  color: var(--text-primary);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.panel-header {
  padding: 0.75rem 1rem;
  background: var(--panel-header-bg);
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.panel-title {
  margin: 0;
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.copy-button {
  position: absolute;
  right: 0.75rem;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }
}

.panel-content {
  padding: 1rem;
  background: var(--panel-content-bg);
}
</style>