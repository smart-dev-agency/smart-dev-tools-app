<template>
  <textarea
    v-if="multiline"
    class="base-input"
    v-bind="$attrs"
    :value="modelValue"
    :rows="rows"
    @input="(e) => $emit('update:modelValue', (e.target as HTMLTextAreaElement).value)"
  ></textarea>
  <input
    v-else
    class="base-input"
    v-bind="$attrs"
    :value="modelValue"
    @input="(e) => $emit('update:modelValue', (e.target as HTMLInputElement).value)"
  />
</template>

<script setup lang="ts">
defineProps({
  modelValue: String,
  multiline: {
    type: Boolean,
    default: false
  },
  rows: {
    type: Number,
    default: 3
  }
});
</script>

<style scoped lang="scss">
.base-input {
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--input-border);
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-family: inherit;
  color: var(--input-color);
  background-color: var(--input-bg);
  transition: all 0.2s ease;
  box-shadow: var(--input-shadow);
  outline: none;
  resize: vertical;
  min-height: 2.5em;
  
  &:focus {
    border-color: var(--button-bg);
    box-shadow: var(--input-focus-shadow);
  }

  &::placeholder {
    color: var(--placeholder-color);
  }
}

textarea.base-input {
  min-height: 6em;
  line-height: 1.5;
}
</style>
