<template>
  <ComponentViewer title="RSA Inspector">
    <div class="workbench">
      <div class="stack">
        <BasePanel title="PEM key"
          ><label class="field"
            >Private or public key<BaseInput
              v-model="input"
              multiline
              :rows="14"
              placeholder="-----BEGIN PUBLIC KEY-----"
          /></label>
          <p class="hint">
            PKCS#1, PKCS#8 or SubjectPublicKeyInfo. Unencrypted RSA keys only;
            the format is detected automatically.
          </p>
          <div class="action-row">
            <BaseButton :disabled="busy || !input.trim()" @click="analyze">{{
              busy ? "Inspecting…" : "Inspect key"
            }}</BaseButton
            ><BaseButton v-if="busy" variant="secondary" @click="cancel"
              >Cancel</BaseButton
            ><BaseButton variant="secondary" @click="clear">Clear</BaseButton>
          </div></BasePanel
        >
        <p class="hint">
          Keys are processed locally in an isolated worker. Nothing is stored on
          disk unless you explicitly export it.
        </p>
        <p v-if="error || actionError" class="error" role="alert">
          {{ error || actionError }}
        </p>
      </div>
      <div class="stack" v-if="result">
        <BasePanel title="Key information"
          ><dl class="key-facts">
            <div>
              <dt>Type</dt>
              <dd>RSA {{ result.kind }}</dd>
            </div>
            <div>
              <dt>Modulus</dt>
              <dd>{{ result.bits }} bits</dd>
            </div>
            <div>
              <dt>PEM format</dt>
              <dd>{{ result.format }}</dd>
            </div>
            <div>
              <dt>Public exponent</dt>
              <dd>0x{{ result.components.e.hex }}</dd>
            </div>
          </dl>
          <p class="notice" v-if="result.bits < 2048">
            This key is below 2048 bits. Treat it as legacy.
          </p>
          <p class="hint">
            Parsing and component consistency do not establish key provenance,
            entropy, trust or compliance.
          </p></BasePanel
        >
        <BasePanel title="Public key · SPKI PEM" :content="result.publicKeyPem">
          <pre>{{ result.publicKeyPem }}</pre>
          <div class="action-row">
            <BaseButton variant="secondary" @click="savePublic"
              >Export public key</BaseButton
            ><BaseButton variant="secondary" @click="exportInfo"
              >Export public info</BaseButton
            >
          </div></BasePanel
        >
        <BasePanel title="Key components"
          ><details>
            <summary>
              {{
                result.kind === "private"
                  ? "Reveal private components — sensitive"
                  : "View public components"
              }}
            </summary>
            <div
              v-for="(component, name) in result.components"
              :key="name"
              class="key-component"
            >
              <div>
                <strong>{{ componentNames[name] || name }}</strong
                ><span class="tag">{{ component.bits }} bits</span>
              </div>
              <pre>{{
                encodeBytes(decodeBytes(component.hex, "hex"), "hex", true, " ")
              }}</pre>
            </div>
          </details></BasePanel
        >
        <DigestOutput
          :hashes="result.fingerprints"
          context="Fingerprint of the DER-encoded public key (SubjectPublicKeyInfo)"
        />
        <BasePanel title="Original key"
          ><p class="hint">
            Exporting a private key writes sensitive material to a file you
            choose.
          </p>
          <div class="action-row">
            <BaseButton variant="secondary" @click="copyOriginal"
              >Copy original key</BaseButton
            ><BaseButton variant="secondary" @click="saveOriginal"
              >Export original key</BaseButton
            >
          </div>
          <span class="hint" role="status">{{ status }}</span></BasePanel
        >
      </div>
      <div v-else class="base-panel empty-result">
        <span class="empty-symbol">rsa</span>
        <h2>Inspect what is actually in your key</h2>
        <p>
          Real modulus, exponent, components and public-key fingerprints. No
          estimated or placeholder values.
        </p>
      </div>
    </div>
  </ComponentViewer>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import type { RsaInfo } from "../lib/rsa";
import { decodeBytes, encodeBytes } from "../lib/binary";
import { useWorker } from "../lib/useWorker";
import { copyText, saveText } from "../lib/output";
import BaseButton from "./BaseButton.vue";
import BaseInput from "./BaseInput.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";
import DigestOutput from "./DigestOutput.vue";
const input = ref(""),
  actionError = ref(""),
  status = ref("");
const { result, busy, error, run, cancel, reset } = useWorker<RsaInfo>();
const componentNames: Record<string, string> = {
  n: "Modulus (n)",
  e: "Public exponent (e)",
  d: "Private exponent (d)",
  p: "Prime (p)",
  q: "Prime (q)",
  dP: "Exponent (dP)",
  dQ: "Exponent (dQ)",
  qInv: "Coefficient (qInv)",
};
watch(
  input,
  () => {
    reset();
    actionError.value = "";
    status.value = "";
  },
  { flush: "sync" },
);
function analyze() {
  actionError.value = "";
  run({ kind: "rsa", pem: input.value }, 10_000);
}
function clear() {
  input.value = "";
  reset();
  actionError.value = "";
}
async function output(action: () => Promise<void>) {
  actionError.value = "";
  try {
    await action();
  } catch {
    actionError.value = "Could not copy or save the key. Please retry.";
  }
}
function copyOriginal() {
  output(async () => {
    await copyText(input.value);
    status.value = "Original key copied";
  });
}
function saveOriginal() {
  output(() =>
    saveText(
      input.value,
      result.value?.kind === "private" ? "private-key.pem" : "public-key.pem",
    ),
  );
}
function savePublic() {
  output(() => saveText(result.value!.publicKeyPem, "public-key.pem"));
}
function exportInfo() {
  if (!result.value) return;
  const info = result.value;
  output(() =>
    saveText(
      JSON.stringify(
        {
          kind: info.kind,
          bits: info.bits,
          format: info.format,
          fingerprintEncoding: "SPKI DER",
          fingerprints: info.fingerprints,
          publicKeyPem: info.publicKeyPem,
          components: { n: info.components.n, e: info.components.e },
        },
        null,
        2,
      ),
      "rsa-public-info.json",
      "application/json",
    ),
  );
}
</script>
<style scoped>
.key-facts {
  margin: 0;
}
.key-facts > div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 7px 0;
  font-size: 12px;
}
.key-facts dt {
  color: var(--muted);
}
.key-facts dd {
  margin: 0;
  text-align: right;
  font-family: var(--mono);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.key-component {
  margin-top: 16px;
}
.key-component > div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 12px;
}
.key-component pre {
  padding: 12px;
  background: var(--surface-alt);
  border-radius: 6px;
  max-height: 180px;
  overflow-y: auto;
}
</style>
