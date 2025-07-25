<template>
  <ComponentViewer title="JWT/Token Decoder">
    <BaseCard>
      <section class="col-5 h-100 p-3">
        <div class="d-flex flex-column h-100">
          <BaseInput v-model="jwt" placeholder="Paste your JWT or Base64-encoded token here..." multiline :rows="16" class="jwt-input flex-grow-1" />
          <div class="button-group mt-3">
            <BaseButton @click="decode" :disabled="!jwt.trim()">Decode</BaseButton>
            <BaseButton @click="clear" variant="secondary">Clear</BaseButton>
          </div>
          <div v-if="error" class="error mt-2">{{ error }}</div>
          <div v-if="jwt.trim() && !error && header && payload" class="success mt-2">✅ Token decoded successfully</div>
        </div>
      </section>

      <section class="col-7 h-100 p-3">
        <BasePanel title="Header" class="mb-3" :content="header">
          <pre v-if="header">{{ header }}</pre>
          <div v-else class="placeholder-text">
            The token header/metadata will be shown here<br />
            <small>Contains information about the token type and format</small>
          </div>
        </BasePanel>

        <BasePanel title="Payload" class="mb-3" :content="payload">
          <pre v-if="payload">{{ payload }}</pre>
          <div v-else class="placeholder-text">
            The token payload/content will be shown here<br />
            <small>Contains the main data of the token</small>
          </div>
        </BasePanel>

        <!-- Additional token information -->
        <div v-if="tokenInfo" class="token-info mt-3">
          <BasePanel title="Token Information" :content="JSON.stringify(tokenInfo, null, 2)">
            <div class="info-grid">
              <div v-if="tokenInfo.isExpired !== undefined" class="info-item" :class="{ expired: tokenInfo.isExpired }">
                <strong>Status:</strong> {{ tokenInfo.isExpired ? "🔴 Expired" : "🟢 Valid" }}
              </div>
              <div v-if="tokenInfo.timeToExpiry" class="info-item"><strong>Time remaining:</strong> {{ tokenInfo.timeToExpiry }}</div>
              <div v-if="tokenInfo.issuer" class="info-item"><strong>Issuer:</strong> {{ tokenInfo.issuer }}</div>
              <div v-if="tokenInfo.subject" class="info-item"><strong>Subject:</strong> {{ tokenInfo.subject }}</div>
              <div v-if="tokenInfo.audience" class="info-item"><strong>Audience:</strong> {{ tokenInfo.audience }}</div>
            </div>
          </BasePanel>
        </div>
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
const tokenInfo = ref<any>(null);

function clear() {
  jwt.value = "";
  header.value = "";
  payload.value = "";
  error.value = "";
  tokenInfo.value = null;
}

function getTimeToExpiry(exp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = exp - now;

  if (timeLeft <= 0) {
    return "Expired";
  }

  const days = Math.floor(timeLeft / (24 * 60 * 60));
  const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((timeLeft % (60 * 60)) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

function extractTokenInfo(payloadObj: any): any {
  const info: any = {};

  if (payloadObj.exp) {
    const now = Math.floor(Date.now() / 1000);
    info.isExpired = payloadObj.exp < now;
    info.timeToExpiry = getTimeToExpiry(payloadObj.exp);
  }

  if (payloadObj.iss) info.issuer = payloadObj.iss;
  if (payloadObj.sub) info.subject = payloadObj.sub;
  if (payloadObj.aud) {
    info.audience = Array.isArray(payloadObj.aud) ? payloadObj.aud.join(", ") : payloadObj.aud;
  }

  return Object.keys(info).length > 0 ? info : null;
}

function extractTokenInfoFromData(data: any): any {
  const info: any = {};

  if (data.serverCertificates && Array.isArray(data.serverCertificates)) {
    info.type = "Server Certificate Bundle";
    info.certificateCount = data.serverCertificates.length;

    if (data.version) {
      info.version = data.version;
    }

    if (data.serverCertificates.length > 0) {
      info.firstCertificatePreview = data.serverCertificates[0].substring(0, 50) + "...";
    }
  }

  if (data.exp) {
    const now = Math.floor(Date.now() / 1000);
    info.isExpired = data.exp < now;
    info.timeToExpiry = getTimeToExpiry(data.exp);
  }

  if (data.iss) info.issuer = data.iss;
  if (data.sub) info.subject = data.sub;
  if (data.aud) {
    info.audience = Array.isArray(data.aud) ? data.aud.join(", ") : data.aud;
  }

  return Object.keys(info).length > 0 ? info : null;
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");

  const padding = base64.length % 4;
  if (padding === 2) {
    base64 += "==";
  } else if (padding === 3) {
    base64 += "=";
  } else if (padding === 1) {
    throw new Error("Invalid Base64 string length");
  }

  try {
    const decoded = atob(base64);

    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }

    const decoder = new TextDecoder("utf-8");
    return decoder.decode(bytes);
  } catch (e) {
    return atob(base64);
  }
}

function validateAndParseJSON(jsonString: string): any {
  const cleaned = jsonString.trim();

  if (!cleaned) {
    throw new Error("Empty JSON string");
  }

  if (!(cleaned.startsWith("{") && cleaned.endsWith("}")) && !(cleaned.startsWith("[") && cleaned.endsWith("]"))) {
    throw new Error("Invalid JSON format");
  }

  return JSON.parse(cleaned);
}

function decode() {
  error.value = "";
  header.value = "";
  payload.value = "";
  tokenInfo.value = null;

  if (!jwt.value || !jwt.value.trim()) {
    error.value = "Please enter a JWT.";
    return;
  }

  const cleanJwt = jwt.value.trim().replace(/\s+/g, "");

  if (!cleanJwt.includes(".")) {
    try {
      const decoded = base64UrlDecode(cleanJwt);
      const parsedData = validateAndParseJSON(decoded);

      payload.value = JSON.stringify(parsedData, null, 2);
      header.value = JSON.stringify(
        {
          note: "This appears to be a Base64-encoded JSON object, not a standard JWT",
          type: "Base64 JSON",
        },
        null,
        2
      );

      tokenInfo.value = extractTokenInfoFromData(parsedData);
      return;
    } catch (e) {}
  }

  const parts = cleanJwt.split(".");

  if (parts.length !== 3) {
    error.value = `Invalid JWT format. Expected either a Base64-encoded JSON or a JWT with 3 parts separated by '.', but found ${parts.length} parts.`;
    return;
  }

  if (parts.some((part) => !part || part.length === 0)) {
    error.value = "Invalid JWT. One or more parts are empty.";
    return;
  }

  try {
    const headerDecoded = base64UrlDecode(parts[0]);
    const headerObj = validateAndParseJSON(headerDecoded);
    header.value = JSON.stringify(headerObj, null, 2);

    const payloadDecoded = base64UrlDecode(parts[1]);
    const payloadObj = validateAndParseJSON(payloadDecoded);

    const enhancedPayload = { ...payloadObj };

    const timestampFields = ["iat", "exp", "nbf", "auth_time"];
    timestampFields.forEach((field) => {
      if (enhancedPayload[field] && typeof enhancedPayload[field] === "number") {
        enhancedPayload[`${field}_readable`] = new Date(enhancedPayload[field] * 1000).toISOString();
      }
    });

    payload.value = JSON.stringify(enhancedPayload, null, 2);

    tokenInfo.value = extractTokenInfo(payloadObj);
  } catch (e: any) {
    if (e.message.includes("Invalid Base64")) {
      error.value = "Decoding error: The token contains invalid Base64 characters.";
    } else if (e.message.includes("Invalid JSON")) {
      error.value = "Decoding error: The decoded content is not valid JSON.";
    } else {
      error.value = `Error decoding the token: ${e.message || "Unknown error"}`;
    }
    console.error("Token Decode Error:", e);
  }
}
</script>

<style scoped lang="scss">
.jwt-input {
  font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
  height: 100%;
}

.button-group {
  display: flex;
  gap: 0.5rem;

  button {
    flex: 1;
  }
}

.token-info {
  .info-grid {
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
  }

  .info-item {
    padding: 0.5rem;
    border-radius: 4px;
    background: var(--info-bg, rgba(59, 130, 246, 0.1));
    border-left: 3px solid var(--info-color, #3b82f6);

    &.expired {
      background: var(--error-bg, rgba(239, 68, 68, 0.1));
      border-left-color: var(--error-color, #ef4444);
    }

    strong {
      color: var(--text-primary);
    }
  }
}

pre {
  background: var(--code-bg);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0;
  font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
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

.success {
  color: var(--success-color, #22c55e);
  font-size: 0.9rem;
  padding: 0.5rem;
  border-radius: 6px;
  background: var(--success-bg, rgba(34, 197, 94, 0.1));
  border: 1px solid var(--success-color, #22c55e);
}

.placeholder-text {
  color: var(--placeholder-color);
  font-size: 0.9rem;
  text-align: center;
  padding: 1rem;

  small {
    display: block;
    margin-top: 0.25rem;
    opacity: 0.7;
    font-size: 0.8rem;
  }
}
</style>
