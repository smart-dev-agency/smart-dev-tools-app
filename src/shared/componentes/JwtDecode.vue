<template>
  <ComponentViewer title="JWT Decode">
    <BaseCard>
      <section class="col-5 h-100 p-3">
        <div class="d-flex flex-column h-100">
          <BaseInput v-model="jwt" placeholder="Paste your JWT here" multiline :rows="18" class="jwt-input flex-grow-1" />
          <BaseButton class="mt-3" @click="decode">Decode</BaseButton>
          <div v-if="error" class="error mt-2">{{ error }}</div>
        </div>
      </section>

      <section class="col-7 h-100 p-3">
        <BasePanel title="Header" class="mb-3" :content="header">
          <pre v-if="header">{{ header }}</pre>
          <div v-else class="placeholder-text">The JWT header will be shown here</div>
        </BasePanel>

        <BasePanel title="Payload" class="mb-3" :content="payload">
          <pre v-if="payload">{{ payload }}</pre>
          <div v-else class="placeholder-text">The JWT payload will be shown here</div>
        </BasePanel>
      </section>
    </BaseCard>
  </ComponentViewer>
</template>

<script setup lang="ts">
import { ref } from "vue";
import BaseButton from "./BaseButton.vue";
import BaseCard from "./BaseCard.vue";
import BaseInput from "./BaseInput.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";

const jwt = ref("");
const header = ref("");
const payload = ref("");
const error = ref("");

function decode() {
  error.value = "";
  header.value = "";
  payload.value = "";
  if (!jwt.value) {
    error.value = "Please enter a JWT.";
    return;
  }
  const parts = jwt.value.split(".");
  if (parts.length !== 3) {
    error.value = "Invalid JWT.";
    return;
  }
  try {
    header.value = JSON.stringify(JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/"))), null, 2);
    payload.value = JSON.stringify(JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))), null, 2);
  } catch (e) {
    error.value = "Could not decode the JWT.";
  }
}
</script>

<style scoped lang="scss">
.jwt-input {
  font-family: 'Monaco', 'Menlo', 'Courier New', Courier, monospace;
  height: 100%;
}

pre {
  background: var(--code-bg);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Courier New', Courier, monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--code-color);
}

.error {
  color: var(--error-color);
  font-size: 0.9rem;
  padding: 0.5rem;
  border-radius: 6px;
  background: var(--error-bg);
}

.placeholder-text {
  color: var(--placeholder-color);
  font-size: 0.9rem;
  text-align: center;
  padding: 1rem;
}
</style>
