<template>
  <ComponentViewer :title="title">
    <div class="workbench">
      <div class="stack">
        <BasePanel :title="mode === 'uuid' ? 'Generate identifiers' : 'Input'">
          <template v-if="mode === 'uuid'"
            ><label class="field"
              >Number of UUIDs<input
                type="number"
                v-model.number="count"
                min="1"
                max="1000"
            /></label>
            <div class="uuid-options">
              <label class="check-option"
                ><input type="checkbox" v-model="uuidUpper" />Uppercase</label
              ><label class="check-option"
                ><input type="checkbox" v-model="uuidHyphens" />Hyphens</label
              ><label class="check-option"
                ><input type="checkbox" v-model="uuidBraces" />Braces</label
              >
            </div>
            <p class="hint">
              UUID v4, generated with the operating system’s cryptographic
              random source.
            </p></template
          >
          <template v-else
            ><label class="field" v-if="mode === 'hmac'"
              >Message encoding<select v-model="encoding">
                <option value="text">Text · UTF-8</option>
                <option value="hex">Hexadecimal</option>
                <option value="base64">Base64</option>
                <option value="base64url">Base64URL</option>
              </select></label
            ><label class="field" :class="{ spaced: mode === 'hmac' }"
              >{{
                mode === "url"
                  ? "URL or component"
                  : mode === "json"
                    ? "JSON document"
                    : "Message"
              }}<BaseInput
                v-model="input"
                multiline
                :rows="mode === 'hmac' ? 6 : 12"
                :placeholder="placeholder" /></label
          ></template>
          <div v-if="mode === 'json'" class="controls spaced">
            <label class="field"
              >Output<select v-model.number="indent">
                <option :value="2">Format · 2 spaces</option>
                <option :value="4">Format · 4 spaces</option>
                <option :value="0">Compact</option>
              </select></label
            >
          </div>
          <div v-if="mode === 'url'" class="controls spaced">
            <label class="field"
              >Operation<select v-model="urlAction">
                <option value="inspect">Inspect URL and parameters</option>
                <option value="encode">Encode a URL component</option>
                <option value="decode">Decode a URL component</option>
              </select></label
            >
          </div>
          <p v-if="mode === 'json'" class="hint">
            Validates syntax and preserves large numbers, number notation and
            duplicate keys.
          </p>
          <p v-if="mode === 'url'" class="hint">
            No network requests. Component decoding keeps literal + signs; query
            parameter inspection treats + as a space.
          </p>
        </BasePanel>
        <BasePanel v-if="mode === 'hmac'" title="Secret key"
          ><div class="controls">
            <label class="field"
              >Key encoding<select v-model="keyEncoding">
                <option value="text">Text · UTF-8</option>
                <option value="hex">Hexadecimal</option>
                <option value="base64">Base64</option>
                <option value="base64url">Base64URL</option>
              </select></label
            ><label class="field"
              >Algorithm<select v-model="hmacAlgorithm">
                <option value="sha256">HMAC-SHA-256</option>
                <option value="sha512">HMAC-SHA-512</option>
              </select></label
            >
          </div>
          <label class="field spaced"
            >Key<input
              v-model="key"
              :type="showKey ? 'text' : 'password'"
              autocomplete="off"
              spellcheck="false"
              placeholder="Never saved to disk" /></label
          ><label class="check-option spaced"
            ><input type="checkbox" v-model="showKey" />Show key</label
          >
          <p class="hint" v-if="!key">
            Empty key: use only for test vectors.
          </p></BasePanel
        >
        <div class="controls">
          <BaseButton @click="execute" :disabled="busy">{{
            busy
              ? "Working…"
              : mode === "uuid"
                ? "Generate UUIDs"
                : mode === "json"
                  ? "Validate & format"
                  : mode === "hmac"
                    ? "Calculate HMAC"
                    : "Convert"
          }}</BaseButton
          ><BaseButton v-if="busy" variant="secondary" @click="cancel"
            >Cancel</BaseButton
          ><BaseButton variant="secondary" @click="clear">Clear</BaseButton>
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </div>
      <DigestOutput
        v-if="mode === 'hmac'"
        :hashes="hmacResult || undefined"
        :context="
          hmacResult
            ? `HMAC-${hmacAlgorithm === 'sha256' ? 'SHA-256' : 'SHA-512'} · key not included`
            : ''
        "
      />
      <BasePanel v-else title="Result" :content="hasResult ? output : undefined"
        ><template v-if="hasResult">
          <pre>{{ output.slice(0, 100000) }}</pre>
          <p class="hint" v-if="output.length > 100000">
            Preview limited to 100,000 characters. Copy and export retain the
            complete result.
          </p>
          <div class="action-row">
            <span class="tag tag-accent">{{
              mode === "uuid"
                ? uuids.length + " identifiers"
                : mode === "json"
                  ? "Valid JSON"
                  : "Local conversion"
            }}</span
            ><BaseButton variant="secondary" @click="download"
              >Export</BaseButton
            >
          </div></template
        >
        <div v-else class="empty-result">
          <span class="empty-symbol">{{
            mode === "json" ? "{}" : mode === "uuid" ? "id" : "%"
          }}</span>
          <h2>Ready when you are</h2>
          <p>
            {{
              mode === "uuid"
                ? "Generate one identifier or a batch with a consistent format."
                : "Your result is selectable, copyable and stays on this device."
            }}
          </p>
        </div></BasePanel
      >
    </div>
  </ComponentViewer>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { tools } from "../lib/tools";
import type { Encoding } from "../lib/binary";
import type { Hashes } from "../lib/hashes";
import { formatUuid, inspectUrl } from "../lib/textTools";
import { useWorker } from "../lib/useWorker";
import { saveText } from "../lib/output";
import BaseInput from "./BaseInput.vue";
import BaseButton from "./BaseButton.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";
import DigestOutput from "./DigestOutput.vue";
const props = defineProps<{ mode: "json" | "url" | "uuid" | "hmac" }>();
const placeholder = computed(() =>
  props.mode === "json"
    ? '{\n  "hello": "world"\n}'
    : props.mode === "url"
      ? "https://example.com?name=hello%20world"
      : "Message to authenticate…",
);
const title = computed(
  () => tools.find((tool) => tool.id === props.mode)!.name,
);
const input = ref(""),
  encoding = ref<Encoding>("text"),
  key = ref(""),
  keyEncoding = ref<Encoding>("text"),
  hmacAlgorithm = ref<"sha256" | "sha512">("sha256"),
  showKey = ref(false);
const indent = ref(2),
  urlAction = ref("inspect"),
  count = ref(1),
  uuidUpper = ref(false),
  uuidHyphens = ref(true),
  uuidBraces = ref(false),
  uuids = ref<string[]>([]),
  localOutput = ref<string | null>(null),
  localError = ref("");
const jsonTask = useWorker<string>(),
  macTask = useWorker<Hashes>();
const hmacResult = macTask.result;
const busy = computed(() => jsonTask.busy.value || macTask.busy.value),
  error = computed(
    () => localError.value || jsonTask.error.value || macTask.error.value,
  );
const output = computed(() =>
  props.mode === "uuid"
    ? uuids.value
        .map((uuid) =>
          formatUuid(
            uuid,
            uuidUpper.value,
            uuidHyphens.value,
            uuidBraces.value,
          ),
        )
        .join("\n")
    : props.mode === "json"
      ? (jsonTask.result.value ?? "")
      : (localOutput.value ?? ""),
);
const hasResult = computed(() =>
  props.mode === "uuid"
    ? !!uuids.value.length
    : props.mode === "json"
      ? jsonTask.result.value !== null
      : localOutput.value !== null,
);
watch(
  [input, encoding, key, keyEncoding, hmacAlgorithm, indent, urlAction],
  () => {
    jsonTask.reset();
    macTask.reset();
    localOutput.value = null;
    localError.value = "";
  },
  { flush: "sync" },
);
watch(count, () => {
  uuids.value = [];
  localError.value = "";
});
function execute() {
  localError.value = "";
  try {
    if (props.mode === "json")
      jsonTask.run({ kind: "json", text: input.value, indent: indent.value });
    else if (props.mode === "hmac")
      macTask.run({
        kind: "hmac",
        text: input.value,
        encoding: encoding.value,
        key: key.value,
        keyEncoding: keyEncoding.value,
        algorithm: hmacAlgorithm.value,
      });
    else if (props.mode === "uuid") {
      uuids.value = [];
      if (
        !Number.isInteger(count.value) ||
        count.value < 1 ||
        count.value > 1000
      )
        throw new Error("Choose between 1 and 1,000 UUIDs.");
      uuids.value = Array.from({ length: count.value }, () =>
        crypto.randomUUID(),
      );
    } else {
      localOutput.value = null;
      if (input.value.length > 1024 * 1024)
        throw new Error("URL input exceeds 1 MiB.");
      localOutput.value =
        urlAction.value === "inspect"
          ? JSON.stringify(inspectUrl(input.value), null, 2)
          : urlAction.value === "encode"
            ? encodeURIComponent(input.value)
            : decodeURIComponent(input.value);
    }
  } catch (cause) {
    localError.value =
      cause instanceof Error ? cause.message : "The operation failed.";
  }
}
function cancel() {
  jsonTask.cancel();
  macTask.cancel();
}
function clear() {
  input.value = "";
  key.value = "";
  uuids.value = [];
  localOutput.value = null;
  localError.value = "";
  jsonTask.reset();
  macTask.reset();
}
async function download() {
  try {
    await saveText(
      output.value,
      props.mode === "json" ? "formatted.json" : `${props.mode}-result.txt`,
    );
  } catch {
    localError.value = "Could not save the result.";
  }
}
</script>
<style scoped>
.spaced {
  margin-top: 16px;
}
.uuid-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}
</style>
