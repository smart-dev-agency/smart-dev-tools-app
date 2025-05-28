<template>
  <button
    class="base-button"
    :type="type"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps({
  type: { type: String as () => "button" | "submit" | "reset", default: 'button' },
  disabled: { type: Boolean, default: false }
});
</script>

<style scoped>
.base-button {
  border-radius: 8px;
  border: 2px solid var(--button-border);
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: var(--button-bg);
  color: var(--button-color);
  transition: all 0.25s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  min-width: 100px;
}
.base-button:hover {
  filter: brightness(110%);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
  border-color: var(--button-border-hover);
}
.base-button:active {
  transform: translateY(0);
  filter: brightness(90%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-color: var(--button-border-hover);
}
</style>
