<template>
  <textarea
    v-if="multiline"
    v-bind="$attrs"
    class="base-input"
    :aria-label="
      ($attrs['aria-label'] as string) || ($attrs.placeholder as string)
    "
    :value="modelValue"
    :rows="rows"
    spellcheck="false"
    @input="update"
  ></textarea>
  <input
    v-else
    v-bind="$attrs"
    class="base-input"
    :aria-label="
      ($attrs['aria-label'] as string) || ($attrs.placeholder as string)
    "
    :value="modelValue"
    spellcheck="false"
    @input="update"
  />
</template>
<script setup lang="ts">
defineOptions({ inheritAttrs: false });
withDefaults(
  defineProps<{ modelValue?: string; multiline?: boolean; rows?: number }>(),
  { rows: 5 },
);
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const update = (event: Event) =>
  emit("update:modelValue", (event.target as HTMLInputElement).value);
</script>
