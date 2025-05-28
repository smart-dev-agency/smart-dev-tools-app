<template>
  <div class="base-card">
    <slot />
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
.base-card {
  background: var(--panel-bg);
  color: var(--text-primary);
  border-radius: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex: 1;
}
</style>
