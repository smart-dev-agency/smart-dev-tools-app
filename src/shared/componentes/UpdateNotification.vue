<template>
  <Teleport to="body"
    ><dialog
      ref="dialog"
      aria-labelledby="update-title"
      @close="close"
      @cancel.prevent="close"
    >
      <div class="controls">
        <h2 id="update-title">
          {{
            updateInfo.hasUpdate
              ? "A new version is available"
              : "You’re up to date"
          }}
        </h2>
        <button
          class="quiet-button"
          aria-label="Close update information"
          @click="close"
        >
          ×
        </button>
      </div>
      <p class="muted">
        Installed {{ updateInfo.currentVersion }} · Latest
        {{ updateInfo.latestVersion }}
      </p>
      <p v-if="updateInfo.publishedAt" class="hint">
        Published {{ new Date(updateInfo.publishedAt).toLocaleDateString() }}
      </p>
      <div
        v-if="updateInfo.hasUpdate && updateInfo.releaseNotes"
        class="release-notes"
        v-html="notes"
        @click="followLink"
      ></div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="action-row">
        <template v-if="updateInfo.hasUpdate"
          ><BaseButton @click="download">View release</BaseButton
          ><BaseButton
            variant="secondary"
            @click="
              emit('remind-later');
              close();
            "
            >Later</BaseButton
          ><BaseButton variant="secondary" @click="ignore"
            >Ignore this version</BaseButton
          ></template
        ><BaseButton v-else @click="close">OK</BaseButton>
      </div>
    </dialog></Teleport
  >
</template>
<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { marked } from "marked";
import { sanitizePreview } from "../lib/preview";
import { openExternal } from "../lib/output";
import { updateService, type UpdateInfo } from "../services/updateService";
import BaseButton from "./BaseButton.vue";
const props = defineProps<{ updateInfo: UpdateInfo; modelValue: boolean }>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "ignore-version": [];
  "remind-later": [];
}>();
const dialog = ref<HTMLDialogElement>(),
  error = ref("");
const notes = computed(() =>
  sanitizePreview(
    marked.parse(props.updateInfo.releaseNotes.slice(0, 100000), {
      async: false,
    }),
  ),
);
function sync() {
  if (props.modelValue && !dialog.value?.open) dialog.value?.showModal();
  else if (!props.modelValue) dialog.value?.close();
}
watch(() => props.modelValue, sync);
onMounted(sync);
function close() {
  dialog.value?.close();
  emit("update:modelValue", false);
}
async function download() {
  try {
    await openExternal(props.updateInfo.releaseUrl);
    close();
  } catch (e) {
    error.value = String(e);
  }
}
async function followLink(event: MouseEvent) {
  const anchor = (event.target as Element).closest("a");
  if (!anchor) return;
  event.preventDefault();
  try {
    await openExternal(anchor.href);
  } catch (e) {
    error.value = String(e);
  }
}
function ignore() {
  updateService.ignoreVersion(props.updateInfo.latestVersion);
  emit("ignore-version");
  close();
}
</script>
<style scoped>
dialog {
  width: min(600px, calc(100% - 32px));
  max-height: 85dvh;
  overflow: auto;
}
h2 {
  font-size: 19px;
  margin: 0 auto 0 0;
}
.release-notes {
  margin-top: 20px;
  padding: 16px;
  background: var(--surface-alt);
  border-radius: 8px;
  max-height: 40dvh;
  overflow: auto;
  font-size: 13px;
}
.release-notes :deep(pre) {
  overflow-wrap: anywhere;
}
.release-notes :deep(h1),
.release-notes :deep(h2) {
  font-size: 18px;
}
</style>
