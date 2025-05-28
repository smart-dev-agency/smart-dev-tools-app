<template>
  <section class="component-viewer col col-12">
    <h1 class="title mt-3 mx-3">{{ title }}</h1>
    <div class="content">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<style scoped>
.component-viewer {
  background: var(--card-bg);
  color: var(--card-color);
  height: 100%;
  overflow: hidden;
}

.title {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--card-color);
}

.content {
  overflow: auto;
}
</style>
