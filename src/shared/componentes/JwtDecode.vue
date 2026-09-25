<template>
  <ComponentViewer title="JWT Decoder">
    <div class="workbench">
      <BasePanel title="Token">
        <BaseInput
          v-model="jwt"
          aria-label="JWT or Base64 JSON token"
          placeholder="Paste a JWT or Base64 JSON object…"
          multiline
          :rows="10"
          spellcheck="false"
        />
        <div class="action-row">
          <BaseButton @click="decode" :disabled="busy || !jwt.trim()">{{
            busy ? "Decoding…" : "Decode"
          }}</BaseButton
          ><BaseButton
            variant="secondary"
            @click="
              jwt = '';
              reset();
            "
            >Clear</BaseButton
          >
        </div>
        <p class="notice token-disclaimer">
          Decoding is not signature verification. Claims and expiration are
          untrusted; this tool does not validate the issuer, audience or
          authenticity.
        </p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </BasePanel>
      <div v-if="result" class="stack">
        <BasePanel title="Header" :content="result.header">
          <pre>{{ result.header.slice(0, 100000) }}</pre>
        </BasePanel>
        <BasePanel title="Payload · unchanged claims" :content="result.payload">
          <pre>{{ result.payload.slice(0, 100000) }}</pre>
          <p v-if="result.payload.length > 100000" class="hint">
            Preview limited to 100,000 characters. Copy includes all claims.
          </p></BasePanel
        >
        <BasePanel title="Dates · evaluated when decoded"
          ><p>{{ result.expiration }}</p>
          <dl v-for="(value, key) in result.times" :key="key">
            <dt>{{ key }}</dt>
            <dd>{{ value }}</dd>
          </dl></BasePanel
        >
      </div>
      <BasePanel v-else title="Decoded content"
        ><div class="empty-result">
          <span class="empty-symbol">jwt</span>
          <h2>Inspect, don’t trust</h2>
          <p>
            Header and original claims appear here. No token leaves this device.
          </p>
        </div></BasePanel
      >
    </div>
  </ComponentViewer>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import { useWorker } from "../lib/useWorker";
import type { decodeToken } from "../lib/textTools";
import BaseInput from "./BaseInput.vue";
import BaseButton from "./BaseButton.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";
const jwt = ref("");
const { result, busy, error, run, reset } =
  useWorker<ReturnType<typeof decodeToken>>();
watch(jwt, reset);
function decode() {
  run({ kind: "jwt", text: jwt.value });
}
</script>
<style scoped>
.token-disclaimer {
  margin: 16px 0 0;
  padding: 14px 16px;
  line-height: 1.65;
}
dl {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font: 12px var(--mono);
}
dt {
  color: var(--muted);
  min-width: 80px;
}
dd {
  margin: 0;
}
</style>
