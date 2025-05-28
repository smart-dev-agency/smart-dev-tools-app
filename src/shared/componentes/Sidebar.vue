<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <BaseInput v-model="search" placeholder="Search component..." />
      <BaseButton @click="toggleAll" style="width:40px;min-width:40px;padding:0;display:flex;align-items:center;justify-content:center">
  <span v-if="allExpanded">▲</span>
  <span v-else>▼</span>
</BaseButton>
    </div>
    <div v-for="cat in filteredCategories" :key="cat.name" class="category">
      <div class="category-title" @click="toggleCategory(cat.name)">
        <span>{{ cat.name }}</span>
        <span>{{ expanded[cat.name] ? '▼' : '▶' }}</span>
      </div>
      <div v-show="expanded[cat.name]" class="category-list">
        <BaseButton
          v-for="item in cat.items"
          :key="item.key"
          :class="{ active: activeKey === item.key }"
          @click="$emit('select', item.key)"
        >
          {{ item.label }}
        </BaseButton>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BaseButton from './BaseButton.vue';
import BaseInput from './BaseInput.vue';

const props = defineProps<{
  categories: Array<{ name: string; items: Array<{ key: string; label: string }> }>;
  activeKey: string;
}>();
const emit = defineEmits(['select']);

const search = ref('');
const expanded = ref<Record<string, boolean>>({});
const allExpanded = ref(false);

watch(() => props.categories, (cats) => {
  cats.forEach(cat => {
    if (!(cat.name in expanded.value)) expanded.value[cat.name] = true;
  });
}, { immediate: true });

const filteredCategories = computed(() => {
  if (!search.value) return props.categories;
  return props.categories
    .map(cat => ({
      ...cat,
      items: cat.items.filter(item => item.label.toLowerCase().includes(search.value.toLowerCase()))
    }))
    .filter(cat => cat.items.length > 0);
});

function toggleCategory(name: string) {
  expanded.value[name] = !expanded.value[name];
}
function toggleAll() {
  allExpanded.value = !allExpanded.value;
  props.categories.forEach(cat => {
    expanded.value[cat.name] = allExpanded.value;
  });
}
</script>

<style scoped>
.sidebar {
  width: 280px;
  background: var(--card-bg);
  color: var(--card-color);
  border-right: none;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 1rem 0.5rem 0 0.5rem;
  overflow: hidden;
}
.sidebar-header {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
  padding-right: 0.5rem;
}
.category {
  margin-bottom: 1rem;
}
.category-title {
  font-weight: bold;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--input-color);
}
.category-list {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.active {
  border: 1px solid #24c8db;
  background: #24c8db22;
  color: #24c8db;
}
</style>
