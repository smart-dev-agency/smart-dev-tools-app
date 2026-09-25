<template>
  <section class="base-panel" :aria-labelledby="id">
    <header class="panel-header">
      <h2 :id="id" class="panel-title">{{ title }}</h2>
      <slot name="actions" /><button
        v-if="content !== undefined"
        class="copy-button quiet-button"
        :aria-label="`Copy ${title}`"
        @click="copy"
      >
        <Icon name="copy" />{{ copied ? "Copied" : "Copy" }}
      </button>
    </header>
    <div class="panel-content">
      <slot />
      <p v-if="copyError" class="error" role="alert">{{ copyError }}</p>
      <span class="sr-only" role="status">{{
        copied ? `${title} copied` : ""
      }}</span>
    </div>
  </section>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref, useId } from "vue";
import { copyText } from "../lib/output";
import Icon from "./Icon.vue";
const props = defineProps<{ title: string; content?: string }>();
const id = useId(),
  copied = ref(false),
  copyError = ref("");
let timer: ReturnType<typeof setTimeout>;
async function copy() {
  copyError.value = "";
  try {
    await copyText(props.content ?? "");
    copied.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => (copied.value = false), 2000);
  } catch {
    copyError.value = "Could not copy. Select the result and copy it manually.";
  }
}
onBeforeUnmount(() => clearTimeout(timer));
</script>
