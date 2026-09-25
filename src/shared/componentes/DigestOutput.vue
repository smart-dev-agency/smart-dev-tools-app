<template>
  <div class="stack digest-output">
    <BasePanel title="Output format">
      <div class="controls">
        <label class="field"
          >Encoding<select v-model="format.encoding">
            <option value="hex">Hexadecimal</option>
            <option value="base64">Base64</option>
            <option value="base64url">Base64URL</option>
          </select></label
        ><label class="field" v-if="format.encoding === 'hex'"
          >Letter case<select v-model="format.uppercase">
            <option :value="false">Lowercase · ab</option>
            <option :value="true">Uppercase · AB</option>
          </select></label
        ><label class="field" v-if="format.encoding === 'hex'"
          >Byte separator<select v-model="format.separator">
            <option value="">None</option>
            <option value=" ">Space</option>
            <option value=":">Colon · :</option>
            <option value="-">Dash · -</option>
          </select></label
        >
      </div>
    </BasePanel>
    <template v-if="entries.length">
      <p v-if="context" class="digest-context">{{ context }}</p>
      <BasePanel
        v-for="[algorithm, digest] in entries"
        :key="algorithm"
        :title="hashLabels[algorithm]"
        :content="digest"
        ><template #actions
          ><span v-if="algorithm === 'md5' || algorithm === 'sha1'" class="tag"
            >Legacy</span
          ><span v-else class="tag tag-accent">{{
            format.encoding
          }}</span></template
        >
        <pre>{{ digest }}</pre>
      </BasePanel>
      <div class="controls">
        <BaseButton variant="secondary" @click="copyAll"
          ><Icon name="copy" />Copy all</BaseButton
        ><BaseButton variant="secondary" @click="exportAll"
          >Export .txt</BaseButton
        ><span class="hint" role="status">{{ status }}</span>
      </div>
      <p v-if="actionError" class="error" role="alert">{{ actionError }}</p>
      <BasePanel title="Verify a digest"
        ><div class="controls">
          <label class="field"
            >Algorithm<select v-model="expectedAlgorithm">
              <option
                v-for="[algorithm] in entries"
                :key="algorithm"
                :value="algorithm"
              >
                {{ hashLabels[algorithm] }}
              </option>
            </select></label
          ><label class="field"
            >Expected encoding<select v-model="expectedEncoding">
              <option value="hex">Hexadecimal</option>
              <option value="base64">Base64</option>
              <option value="base64url">Base64URL</option>
            </select></label
          >
        </div>
        <label class="field expected-field"
          >Expected digest<textarea
            v-model="expected"
            rows="2"
            spellcheck="false"
            placeholder="Paste a checksum to compare…"
          ></textarea>
        </label>
        <p v-if="comparison" :class="comparison.state" role="status">
          {{ comparison.message }}
        </p></BasePanel
      >
      <p class="hint">
        Formatting does not change the digest. MD5 and SHA-1 are for
        compatibility, not new security designs.
      </p>
    </template>
    <div v-else class="base-panel empty-result">
      <span class="empty-symbol">#</span>
      <h2>Your digests will appear here</h2>
      <p>
        Calculate once. Change the format, copy or verify without recalculating.
      </p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { compareDigest, formatDigest, type DigestFormat } from "../lib/binary";
import { hashLabels, type HashAlgorithm, type Hashes } from "../lib/hashes";
import { copyText, saveText } from "../lib/output";
import BasePanel from "./BasePanel.vue";
import BaseButton from "./BaseButton.vue";
import Icon from "./Icon.vue";
const props = withDefaults(
  defineProps<{ hashes?: Hashes; context?: string }>(),
  { hashes: () => ({}) },
);
const format = reactive<DigestFormat>({
  encoding: "hex",
  uppercase: false,
  separator: "",
});
const expected = ref(""),
  expectedAlgorithm = ref<HashAlgorithm>("sha256"),
  expectedEncoding = ref<DigestFormat["encoding"]>("hex");
const status = ref(""),
  actionError = ref("");
const entries = computed(() =>
  Object.entries(props.hashes)
    .filter(
      (entry): entry is [HashAlgorithm, string] => typeof entry[1] === "string",
    )
    .map(
      ([algorithm, hash]) => [algorithm, formatDigest(hash, format)] as const,
    ),
);
watch(
  () => props.hashes,
  (hashes) => {
    if (!hashes[expectedAlgorithm.value])
      expectedAlgorithm.value =
        (Object.keys(hashes)[0] as HashAlgorithm) || "sha256";
    status.value = "";
  },
  { immediate: true },
);
watch(format, () => (status.value = ""));
const comparison = computed(() => {
  const hash = props.hashes[expectedAlgorithm.value];
  if (!expected.value.trim() || !hash) return null;
  try {
    return compareDigest(hash, expected.value, expectedEncoding.value)
      ? { state: "success", message: "Match — the digests are identical." }
      : { state: "error", message: "Mismatch — these digests are different." };
  } catch (error) {
    return {
      state: "notice",
      message:
        error instanceof Error ? error.message : "Invalid expected digest.",
    };
  }
});
const all = computed(() =>
  [
    props.context,
    ...entries.value.map(
      ([algorithm, value]) => `${hashLabels[algorithm]}: ${value}`,
    ),
  ]
    .filter(Boolean)
    .join("\n"),
);
async function copyAll() {
  actionError.value = "";
  try {
    await copyText(all.value);
    status.value = "Copied all digests";
  } catch {
    actionError.value = "Could not copy the digests.";
  }
}
async function exportAll() {
  actionError.value = "";
  try {
    await saveText(all.value, "checksums.txt");
  } catch {
    actionError.value = "Could not save the checksums.";
  }
}
</script>
<style scoped>
.digest-context {
  font-size: 11px;
  color: var(--muted);
  margin: 0;
  overflow-wrap: anywhere;
}
.expected-field {
  margin-top: 16px;
}
.digest-output pre {
  font-size: 12px;
  letter-spacing: 0.02em;
}
.digest-output .hint {
  margin-top: 0;
}
.expected-field + p {
  margin-bottom: 0;
  margin-top: 12px;
}
</style>
