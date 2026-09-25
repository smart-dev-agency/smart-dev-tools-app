<template>
  <section class="tool-view">
    <header class="tool-heading">
      <p class="eyebrow">{{ meta?.group || "Workspace" }}</p>
      <h1>{{ title }}</h1>
      <p class="muted">{{ description || meta?.description }}</p>
    </header>
    <div class="tool-content"><slot /></div>
  </section>
</template>
<script setup lang="ts">
import { inject, type ComputedRef } from "vue";
defineProps<{ title: string; description?: string }>();
const meta =
  inject<ComputedRef<{ group: string; description: string } | undefined>>(
    "toolMeta",
  );
</script>
