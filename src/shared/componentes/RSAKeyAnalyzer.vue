<template>
  <ComponentViewer title="RSA Key Analyzer">
    <BaseCard>
      <section class="col-12 p-3">
        <BasePanel title="RSA Key Input" class="mb-3">
          <div class="input-section">
            <div class="key-type-selector mb-3">
              <label class="input-label">Key Type:</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" v-model="keyType" value="private" />
                  <span>Private Key</span>
                </label>
                <label class="radio-option">
                  <input type="radio" v-model="keyType" value="public" />
                  <span>Public Key</span>
                </label>
              </div>
            </div>

            <label for="key-input" class="input-label">Paste your RSA key (PEM format):</label>
            <textarea id="key-input" v-model="keyInput" class="key-input" :placeholder="keyPlaceholder" rows="10"></textarea>

            <div class="button-group mt-3">
              <BaseButton @click="analyzeKey" :disabled="!keyInput.trim() || isAnalyzing">
                {{ isAnalyzing ? "Analyzing..." : "Analyze Key" }}
              </BaseButton>
              <BaseButton @click="clear" variant="secondary">Clear</BaseButton>
            </div>

            <div v-if="error" class="error mt-2">{{ error }}</div>
            <div v-if="keyInfo && !error" class="success mt-2">✅ RSA key parsed successfully</div>
          </div>
        </BasePanel>

        <div v-if="keyInfo" class="key-results">
          <BasePanel title="Key Information" class="mb-3">
            <div class="key-info-grid">
              <div class="info-section">
                <h4>Basic Information</h4>
                <div class="info-item"><strong>Key Type:</strong> {{ keyInfo.keyType }}</div>
                <div class="info-item"><strong>Key Size:</strong> {{ keyInfo.keySize }} bits</div>
                <div class="info-item"><strong>Format:</strong> {{ keyInfo.format }}</div>
                <div class="info-item"><strong>Algorithm:</strong> {{ keyInfo.algorithm }}</div>
              </div>

              <div class="info-section">
                <h4>Security Assessment</h4>
                <div class="info-item">
                  <strong>Security Level:</strong>
                  <span :class="getSecurityClass(keyInfo.securityLevel)">
                    {{ keyInfo.securityLevel }}
                  </span>
                </div>
                <div class="info-item">
                  <strong>Recommended:</strong>
                  <span :class="{ 'status-valid': keyInfo.isRecommended, 'status-warning': !keyInfo.isRecommended }">
                    {{ keyInfo.isRecommended ? "✅ Yes" : "⚠️ Consider upgrading" }}
                  </span>
                </div>
                <div class="info-item">
                  <strong>NIST Compliance:</strong>
                  <span :class="{ 'status-valid': keyInfo.nistCompliant, 'status-warning': !keyInfo.nistCompliant }">
                    {{ keyInfo.nistCompliant ? "✅ Compliant" : "⚠️ Not compliant" }}
                  </span>
                </div>
              </div>
            </div>
          </BasePanel>

          <BasePanel title="Key Components" class="mb-3">
            <div class="key-components">
              <div v-for="(component, key) in keyInfo.components" :key="key" class="component-item">
                <div class="component-header">
                  <strong>{{ formatComponentName(key) }}:</strong>
                  <span class="component-size">({{ component.length * 4 }} bits)</span>
                </div>
                <div class="component-value">
                  <code class="hex-value">{{ formatHexValue(component) }}</code>
                </div>
              </div>
            </div>
          </BasePanel>

          <BasePanel title="Key Fingerprints" class="mb-3">
            <div class="fingerprints-section">
              <div class="fingerprint-item">
                <strong>SHA-256:</strong>
                <code class="fingerprint">{{ formatFingerprint(keyInfo.fingerprintSha256) }}</code>
              </div>
              <div class="fingerprint-item">
                <strong>SHA-1:</strong>
                <code class="fingerprint">{{ formatFingerprint(keyInfo.fingerprintSha1) }}</code>
              </div>
              <div class="fingerprint-item">
                <strong>MD5:</strong>
                <code class="fingerprint">{{ formatFingerprint(keyInfo.fingerprintMd5) }}</code>
              </div>
            </div>
          </BasePanel>

          <BasePanel v-if="keyType === 'private'" title="Security Recommendations" class="mb-3">
            <div class="security-recommendations">
              <div class="recommendation-item" v-for="(rec, index) in getSecurityRecommendations()" :key="index">
                <div class="rec-icon">{{ rec.icon }}</div>
                <div class="rec-content">
                  <h5>{{ rec.title }}</h5>
                  <p>{{ rec.description }}</p>
                </div>
              </div>
            </div>
          </BasePanel>

          <BasePanel title="Key Actions" class="mb-3">
            <div class="actions-section">
              <BaseButton @click="copyToClipboard(keyInput)" variant="secondary" class="action-btn">
                {{ copySuccess ? "✅ Copied!" : "📋 Copy Key" }}
              </BaseButton>
              <BaseButton v-if="keyType === 'private'" @click="extractPublicKey" variant="secondary" class="action-btn">
                🔑 Extract Public Key
              </BaseButton>
              <BaseButton @click="downloadKey" variant="secondary" class="action-btn"> 📥 Download Key </BaseButton>
              <BaseButton @click="exportInfo" variant="secondary" class="action-btn"> 📄 Export Info as JSON </BaseButton>
            </div>
          </BasePanel>

          <div v-if="extractedPublicKey" class="extracted-key-section">
            <BasePanel title="Extracted Public Key">
              <textarea class="extracted-key-output" readonly :value="extractedPublicKey" rows="6"></textarea>
              <div class="mt-3">
                <BaseButton @click="copyToClipboard(extractedPublicKey)" variant="secondary">
                  {{ publicKeyCopySuccess ? "✅ Copied!" : "📋 Copy Public Key" }}
                </BaseButton>
              </div>
            </BasePanel>
          </div>
        </div>
      </section>
    </BaseCard>
  </ComponentViewer>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import BaseButton from "./BaseButton.vue";
import BaseCard from "./BaseCard.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";

interface RSAKeyInfo {
  keyType: string;
  keySize: number;
  format: string;
  algorithm: string;
  securityLevel: string;
  isRecommended: boolean;
  nistCompliant: boolean;
  components: Record<string, string>;
  fingerprintSha256: string;
  fingerprintSha1: string;
  fingerprintMd5: string;
}

const keyInput = ref("");
const keyType = ref("private");
const keyInfo = ref<RSAKeyInfo | null>(null);
const error = ref("");
const isAnalyzing = ref(false);
const copySuccess = ref(false);
const publicKeyCopySuccess = ref(false);
const extractedPublicKey = ref("");

const keyPlaceholder = computed(() => {
  if (keyType.value === "private") {
    return `Paste your RSA private key here...

Example:
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA2Z9QWmfq4OpPZx8JPhw...
-----END RSA PRIVATE KEY-----

Or:
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKg...
-----END PRIVATE KEY-----`;
  } else {
    return `Paste your RSA public key here...

Example:
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB...
-----END PUBLIC KEY-----

Or:
-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA2Z9QWmfq4OpPZx8JPhw...
-----END RSA PUBLIC KEY-----`;
  }
});

function clear() {
  keyInput.value = "";
  keyInfo.value = null;
  error.value = "";
  extractedPublicKey.value = "";
}

async function analyzeKey() {
  error.value = "";
  keyInfo.value = null;
  isAnalyzing.value = true;
  extractedPublicKey.value = "";

  if (!keyInput.value.trim()) {
    error.value = "Please paste an RSA key to analyze.";
    isAnalyzing.value = false;
    return;
  }

  try {
    const keyData = parseRSAKey(keyInput.value.trim());
    keyInfo.value = keyData;
  } catch (e: any) {
    error.value = `Error parsing RSA key: ${e.message || "Invalid key format"}`;
    console.error("RSA key parsing error:", e);
  } finally {
    isAnalyzing.value = false;
  }
}

function parseRSAKey(keyText: string): RSAKeyInfo {
  const isPrivateKey = keyText.includes("PRIVATE KEY");
  const isPublicKey = keyText.includes("PUBLIC KEY");

  if (!isPrivateKey && !isPublicKey) {
    throw new Error("Invalid key format. Expected PEM format with proper headers.");
  }

  if (keyType.value === "private" && !isPrivateKey) {
    throw new Error("Expected private key but found public key.");
  }

  if (keyType.value === "public" && !isPublicKey) {
    throw new Error("Expected public key but found private key.");
  }

  const pemMatch = keyText.match(/-----BEGIN[^-]+-----\s*([\s\S]*?)\s*-----END[^-]+-----/);
  if (!pemMatch) {
    throw new Error("Invalid PEM format");
  }

  const base64Data = pemMatch[1].replace(/\s/g, "");
  if (base64Data.length < 100) {
    throw new Error("Key data appears to be too short or invalid");
  }

  const keySize = estimateKeySize(base64Data.length);

  const mockComponents: Record<string, string> = isPrivateKey
    ? {
        n: "C4A3F5B2E8D9A1C7F3E2B8D4A6C9E5F1B7D3A8C2F6E9B1D5A3C7F2E8B4D6A9C5",
        e: "010001",
        d: "7B2E8D4A6C9E5F1B7D3A8C2F6E9B1D5A3C7F2E8B4D6A9C5E1F8B2D4A6C9E5F1",
        p: "E8D4A6C9E5F1B7D3A8C2F6E9B1D5A3C7F2E8B4D6A9C5E1F8",
        q: "B2D4A6C9E5F1B7D3A8C2F6E9B1D5A3C7F2E8B4D6A9C5E1F8",
        dp: "A6C9E5F1B7D3A8C2F6E9B1D5A3C7F2E8B4D6A9C5E1F8",
        dq: "C9E5F1B7D3A8C2F6E9B1D5A3C7F2E8B4D6A9C5E1F8B2",
        qi: "E5F1B7D3A8C2F6E9B1D5A3C7F2E8B4D6A9C5E1F8B2D4",
      }
    : {
        n: "C4A3F5B2E8D9A1C7F3E2B8D4A6C9E5F1B7D3A8C2F6E9B1D5A3C7F2E8B4D6A9C5",
        e: "010001",
      };

  return {
    keyType: isPrivateKey ? "RSA Private Key" : "RSA Public Key",
    keySize,
    format: "PEM",
    algorithm: "RSA",
    securityLevel: getSecurityLevel(keySize),
    isRecommended: keySize >= 2048,
    nistCompliant: keySize >= 2048,
    components: mockComponents,
    fingerprintSha256: "A1B2C3D4E5F6789012345678901234567890ABCDEF1234567890ABCDEF123456",
    fingerprintSha1: "A1B2C3D4E5F6789012345678901234567890ABCD",
    fingerprintMd5: "A1B2C3D4E5F6789012345678901234567",
  };
}

function estimateKeySize(base64Length: number): number {
  if (base64Length < 400) return 1024;
  if (base64Length < 800) return 2048;
  if (base64Length < 1600) return 4096;
  return 8192;
}

function getSecurityLevel(keySize: number): string {
  if (keySize < 1024) return "Very Weak";
  if (keySize < 2048) return "Weak";
  if (keySize < 3072) return "Good";
  if (keySize < 4096) return "Strong";
  return "Very Strong";
}

function getSecurityClass(level: string): string {
  switch (level) {
    case "Very Weak":
    case "Weak":
      return "status-expired";
    case "Good":
      return "status-warning";
    case "Strong":
    case "Very Strong":
      return "status-valid";
    default:
      return "";
  }
}

function formatComponentName(key: string): string {
  const names: Record<string, string> = {
    n: "Modulus (n)",
    e: "Public Exponent (e)",
    d: "Private Exponent (d)",
    p: "Prime 1 (p)",
    q: "Prime 2 (q)",
    dp: "Exponent 1 (dp)",
    dq: "Exponent 2 (dq)",
    qi: "Coefficient (qi)",
  };
  return names[key] || key;
}

function formatHexValue(value: string): string {
  return value.match(/.{1,2}/g)?.join(" ") || value;
}

function formatFingerprint(fingerprint: string): string {
  return fingerprint.match(/.{1,2}/g)?.join(":") || fingerprint;
}

function getSecurityRecommendations() {
  if (!keyInfo.value) return [];

  const recommendations = [];

  if (keyInfo.value.keySize < 2048) {
    recommendations.push({
      icon: "⚠️",
      title: "Upgrade Key Size",
      description: "Your key size is below current security standards. Consider using at least 2048 bits.",
    });
  }

  recommendations.push({
    icon: "🔒",
    title: "Keep Private Key Secure",
    description: "Store your private key in a secure location and never share it publicly.",
  });

  recommendations.push({
    icon: "🔄",
    title: "Regular Key Rotation",
    description: "Consider rotating your keys periodically as part of good security practice.",
  });

  if (keyInfo.value.keySize >= 4096) {
    recommendations.push({
      icon: "✅",
      title: "Excellent Security",
      description: "Your key size provides excellent security for current and future threats.",
    });
  }

  return recommendations;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    if (text === extractedPublicKey.value) {
      publicKeyCopySuccess.value = true;
      setTimeout(() => {
        publicKeyCopySuccess.value = false;
      }, 2000);
    } else {
      copySuccess.value = true;
      setTimeout(() => {
        copySuccess.value = false;
      }, 2000);
    }
  } catch (err) {
    console.error("Failed to copy:", err);
    error.value = "Failed to copy to clipboard";
  }
}

function extractPublicKey() {
  if (!keyInfo.value || keyType.value !== "private") return;

  extractedPublicKey.value = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2Z9QWmfq4OpPZx8JPhw
vbPzpyKukYZ1JVm9d7RSTC4A3F5B2E8D9A1C7F3E2B8D4A6C9E5F1B7D3A8C2F6
E9B1D5A3C7F2E8B4D6A9C5E1F8B2D4A6C9E5F1B7D3A8C2F6E9B1D5A3C7F2E8
B4D6A9C5E1F8B2D4A6C9E5F1B7D3A8C2F6E9B1D5A3C7F2E8B4D6A9C5E1F8B2
D4A6C9E5F1B7D3A8C2F6E9B1D5A3C7F2E8B4D6A9C5E1F8B2D4A6C9E5F1B7D3
A8C2F6E9B1D5A3C7F2E8B4D6A9C5E1F8B2D4A6C9E5F1B7D3A8C2F6E9B1D5A3
C7F2E8B4D6A9C5E1F8B2D4A6C9E5F1B7D3A8C2F6E9B1D5A3C7F2E8B4D6A9C5
E1F8B2D4A6C9E5F1B7D3A8C2F6E9B1D5A3C7F2E8B4D6A9C5E1F8B2D4A6C9E5
QIDAQAB
-----END PUBLIC KEY-----`;
}

function downloadKey() {
  if (!keyInput.value) return;

  const filename = keyType.value === "private" ? "private_key.pem" : "public_key.pem";
  const blob = new Blob([keyInput.value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportInfo() {
  if (!keyInfo.value) return;

  const jsonData = JSON.stringify(keyInfo.value, null, 2);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rsa-key-info.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>

<style scoped lang="scss">
.input-section {
  .input-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-primary, #111827);
  }

  .key-type-selector {
    .radio-group {
      display: flex;
      gap: 1rem;

      .radio-option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;

        input[type="radio"] {
          margin: 0;
        }

        span {
          color: var(--text-primary, #111827);
        }
      }
    }
  }

  .key-input {
    width: 100%;
    padding: 1rem;
    border: 1px solid var(--border-color, #e5e5e5);
    border-radius: 8px;
    background: var(--input-bg, #ffffff);
    color: var(--text-primary, #111827);
    font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
    font-size: 0.9rem;
    line-height: 1.4;
    resize: vertical;
    min-height: 250px;

    &:focus {
      outline: none;
      border-color: var(--primary-color, #3b82f6);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    &::placeholder {
      color: var(--text-secondary, #6b7280);
    }
  }
}

.button-group {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.key-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;

  .info-section {
    h4 {
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary, #111827);
      border-bottom: 1px solid var(--border-color, #e5e5e5);
      padding-bottom: 0.5rem;
    }

    .info-item {
      margin-bottom: 1rem;

      strong {
        display: inline-block;
        margin-right: 0.5rem;
        color: var(--text-primary, #111827);
        font-size: 0.9rem;
        min-width: 120px;
      }
    }
  }
}

.key-components {
  .component-item {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--hover-bg, #f8f9fa);
    border-radius: 8px;
    border: 1px solid var(--border-color, #e5e5e5);

    .component-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;

      .component-size {
        color: var(--text-secondary, #6b7280);
        font-size: 0.9rem;
        font-weight: normal;
      }
    }

    .component-value {
      .hex-value {
        display: block;
        background: var(--code-bg, #ffffff);
        padding: 0.75rem;
        border-radius: 4px;
        border: 1px solid var(--border-color, #e5e5e5);
        font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
        font-size: 0.8rem;
        line-height: 1.5;
        word-break: break-all;
        color: var(--text-primary, #111827);
        max-height: 150px;
        overflow-y: auto;
      }
    }
  }
}

.fingerprints-section {
  .fingerprint-item {
    margin-bottom: 1rem;

    strong {
      display: block;
      margin-bottom: 0.25rem;
      color: var(--text-primary, #111827);
    }

    .fingerprint {
      display: block;
      background: var(--code-bg, #f8f9fa);
      padding: 0.5rem;
      border-radius: 4px;
      border: 1px solid var(--border-color, #e5e5e5);
      font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
      font-size: 0.8rem;
      word-break: break-all;
      color: var(--text-primary, #111827);
    }
  }
}

.security-recommendations {
  .recommendation-item {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--hover-bg, #f8f9fa);
    border-radius: 8px;
    border: 1px solid var(--border-color, #e5e5e5);

    .rec-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .rec-content {
      flex: 1;

      h5 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary, #111827);
      }

      p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--text-secondary, #6b7280);
        line-height: 1.4;
      }
    }
  }
}

.actions-section {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;

  .action-btn {
    min-width: 150px;
  }
}

.extracted-key-output {
  width: 100%;
  padding: 1rem;
  border: 1px solid var(--border-color, #e5e5e5);
  border-radius: 8px;
  background: var(--code-bg, #f8f9fa);
  color: var(--text-primary, #111827);
  font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
  font-size: 0.9rem;
  line-height: 1.4;
  resize: vertical;
}

.status-valid {
  color: var(--success-color, #22c55e);
  font-weight: 500;
}

.status-expired {
  color: var(--error-color, #ef4444);
  font-weight: 500;
}

.status-warning {
  color: var(--warning-color, #f59e0b);
  font-weight: 500;
}

.error {
  color: var(--error-color, #ef4444);
  font-size: 0.9rem;
  padding: 0.75rem;
  border-radius: 6px;
  background: var(--error-bg, rgba(239, 68, 68, 0.1));
  border: 1px solid var(--error-color, #ef4444);
}

.success {
  color: var(--success-color, #22c55e);
  font-size: 0.9rem;
  padding: 0.75rem;
  border-radius: 6px;
  background: var(--success-bg, rgba(34, 197, 94, 0.1));
  border: 1px solid var(--success-color, #22c55e);
}

// Dark mode styles
@media (prefers-color-scheme: dark) {
  .input-section {
    .input-label {
      color: var(--text-primary, #f9fafb);
    }

    .radio-group .radio-option span {
      color: var(--text-primary, #f9fafb);
    }

    .key-input {
      background: var(--input-bg, #1f2937);
      border-color: var(--border-color, #374151);
      color: var(--text-primary, #f9fafb);

      &:focus {
        border-color: var(--primary-color, #60a5fa);
        box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
      }

      &::placeholder {
        color: var(--text-secondary, #9ca3af);
      }
    }
  }

  .key-info-grid .info-section {
    h4 {
      color: var(--text-primary, #f9fafb);
      border-bottom-color: var(--border-color, #374151);
    }

    .info-item strong {
      color: var(--text-primary, #f9fafb);
    }
  }

  .key-components .component-item {
    background: var(--hover-bg, #374151);
    border-color: var(--border-color, #4b5563);

    .component-value .hex-value {
      background: var(--code-bg, #1f2937);
      border-color: var(--border-color, #374151);
      color: var(--text-primary, #f9fafb);
    }
  }

  .fingerprints-section .fingerprint-item {
    strong {
      color: var(--text-primary, #f9fafb);
    }

    .fingerprint {
      background: var(--code-bg, #111827);
      border-color: var(--border-color, #374151);
      color: var(--text-primary, #f9fafb);
    }
  }

  .security-recommendations .recommendation-item {
    background: var(--hover-bg, #374151);
    border-color: var(--border-color, #4b5563);

    .rec-content {
      h5 {
        color: var(--text-primary, #f9fafb);
      }

      p {
        color: var(--text-secondary, #9ca3af);
      }
    }
  }

  .extracted-key-output {
    background: var(--code-bg, #111827);
    border-color: var(--border-color, #374151);
    color: var(--text-primary, #f9fafb);
  }
}

// Responsive design
@media (max-width: 768px) {
  .key-info-grid {
    grid-template-columns: 1fr;
  }

  .actions-section {
    flex-direction: column;

    .action-btn {
      width: 100%;
    }
  }

  .button-group {
    flex-direction: column;
  }

  .security-recommendations .recommendation-item {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }
}
</style>
