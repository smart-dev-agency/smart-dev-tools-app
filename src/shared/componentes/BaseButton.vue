<template>
  <button
    :class="['base-button', `button-${variant}`]"
    :type="type"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    variant?: "primary" | "secondary" | "danger";
  }>(),
  { type: "button", variant: "primary" },
);
</script>
