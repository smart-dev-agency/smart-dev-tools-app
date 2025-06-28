<template>
  <ComponentViewer title="TLS Certificate Checker">
    <BaseCard>
      <section class="col-12 p-3">
        <BasePanel title="Server Details" class="mb-3">
          <div class="input-row">
            <BaseInput v-model="hostname" placeholder="Enter hostname (e.g., google.com)" class="hostname-input" />
            <BaseInput v-model="port" placeholder="443" type="number" class="port-input" />
          </div>

          <div class="button-group mt-3">
            <BaseButton @click="checkCertificate" :disabled="!hostname.trim() || isLoading">
              {{ isLoading ? "Checking..." : "Check Certificate" }}
            </BaseButton>
            <BaseButton @click="clear" variant="secondary">Clear</BaseButton>
          </div>

          <div v-if="error" class="error mt-2">{{ error }}</div>
          <div v-if="certificateInfo && !error" class="success mt-2">✅ Certificate information retrieved successfully</div>
        </BasePanel>

        <div v-if="certificateInfo" class="certificate-container">
          <BasePanel title="Connection Information" class="cert-panel mb-3">
            <div class="cert-info">
              <div class="info-item"><strong>Hostname:</strong> {{ certificateInfo.hostname }}</div>
              <div class="info-item"><strong>Port:</strong> {{ certificateInfo.port }}</div>
              <div class="info-item"><strong>TLS Version:</strong> {{ certificateInfo.tls_version }}</div>
              <div class="info-item"><strong>Cipher Suite:</strong> {{ certificateInfo.cipher_suite }}</div>
              <div class="info-item"><strong>Chain Length:</strong> {{ certificateInfo.chain_length }} certificate(s)</div>
              <div class="info-item">
                <strong>Root CA Trusted:</strong>
                <span :class="{ 'cert-valid': certificateInfo.root_ca_trusted, 'cert-invalid': !certificateInfo.root_ca_trusted }">
                  {{ certificateInfo.root_ca_trusted ? "✅ Yes" : "❌ No" }}
                </span>
              </div>
            </div>
          </BasePanel>

          <div v-if="certificateInfo.certificates && certificateInfo.certificates.length > 0">
            <div v-for="(cert, index) in certificateInfo.certificates" :key="index" class="mb-3">
              <BasePanel :title="`${index === 0 ? 'Leaf Certificate' : `Intermediate Certificate ${index}`}`" class="cert-panel">
                <div class="cert-tabs">
                  <div class="tab-buttons">
                    <button
                      v-for="tab in tabs"
                      :key="tab.id"
                      @click="activeTab[index] = tab.id"
                      :class="{ active: activeTab[index] === tab.id }"
                      class="tab-button"
                    >
                      {{ tab.label }}
                    </button>
                  </div>

                  <div v-show="activeTab[index] === 'basic'" class="tab-content">
                    <div class="cert-info">
                      <div class="info-item">
                        <strong>Subject:</strong> <code class="cert-dn">{{ cert.subject }}</code>
                      </div>
                      <div class="info-item">
                        <strong>Issuer:</strong> <code class="cert-dn">{{ cert.issuer }}</code>
                      </div>
                      <div class="info-item">
                        <strong>Serial Number:</strong> <code class="serial">{{ cert.serial_number }}</code>
                      </div>
                      <div class="info-item"><strong>Version:</strong> {{ cert.version }}</div>
                      <div class="info-item"><strong>Valid From:</strong> {{ cert.not_before }}</div>
                      <div class="info-item"><strong>Valid To:</strong> {{ cert.not_after }}</div>
                      <div class="info-item">
                        <strong>Status:</strong>
                        <span :class="{ 'cert-valid': !cert.is_expired, 'cert-invalid': cert.is_expired }">
                          {{ cert.is_expired ? "❌ Expired" : "✅ Valid" }}
                        </span>
                      </div>
                      <div class="info-item">
                        <strong>Days Until Expiry:</strong>
                        <span :class="{ 'cert-warning': cert.days_until_expiry < 30, 'cert-invalid': cert.days_until_expiry < 0 }">
                          {{ cert.days_until_expiry }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div v-show="activeTab[index] === 'security'" class="tab-content">
                    <div class="cert-info">
                      <div class="info-item"><strong>Signature Algorithm:</strong> {{ cert.signature_algorithm }}</div>
                      <div class="info-item"><strong>Public Key Algorithm:</strong> {{ cert.public_key_algorithm }}</div>
                      <div v-if="cert.public_key_size" class="info-item"><strong>Public Key Size:</strong> {{ cert.public_key_size }} bits</div>
                      <div class="info-item">
                        <strong>SHA1 Fingerprint:</strong>
                        <code class="fingerprint">{{ formatFingerprint(cert.fingerprint_sha1) }}</code>
                      </div>
                      <div class="info-item">
                        <strong>SHA256 Fingerprint:</strong>
                        <code class="fingerprint">{{ formatFingerprint(cert.fingerprint_sha256) }}</code>
                      </div>
                      <div class="info-item">
                        <strong>MD5 Fingerprint:</strong>
                        <code class="fingerprint">{{ formatFingerprint(cert.fingerprint_md5) }}</code>
                      </div>
                      <div v-if="cert.subject_key_identifier" class="info-item">
                        <strong>Subject Key ID:</strong>
                        <code class="fingerprint">{{ formatFingerprint(cert.subject_key_identifier) }}</code>
                      </div>
                      <div v-if="cert.authority_key_identifier" class="info-item">
                        <strong>Authority Key ID:</strong>
                        <code class="fingerprint">{{ formatFingerprint(cert.authority_key_identifier) }}</code>
                      </div>
                    </div>
                  </div>

                  <div v-show="activeTab[index] === 'extensions'" class="tab-content">
                    <div class="cert-info">
                      <div v-if="cert.subject_alt_names && cert.subject_alt_names.length > 0" class="info-item">
                        <strong>Subject Alternative Names:</strong>
                        <ul class="san-list">
                          <li v-for="san in cert.subject_alt_names" :key="san">{{ san }}</li>
                        </ul>
                      </div>
                      <div v-if="cert.key_usage && cert.key_usage.length > 0" class="info-item">
                        <strong>Key Usage:</strong>
                        <ul class="usage-list">
                          <li v-for="usage in cert.key_usage" :key="usage">{{ usage }}</li>
                        </ul>
                      </div>
                      <div v-if="cert.extended_key_usage && cert.extended_key_usage.length > 0" class="info-item">
                        <strong>Extended Key Usage:</strong>
                        <ul class="usage-list">
                          <li v-for="usage in cert.extended_key_usage" :key="usage">{{ usage }}</li>
                        </ul>
                      </div>
                      <div v-if="cert.basic_constraints" class="info-item"><strong>Basic Constraints:</strong> {{ cert.basic_constraints }}</div>
                      <div v-if="cert.crl_distribution_points && cert.crl_distribution_points.length > 0" class="info-item">
                        <strong>CRL Distribution Points:</strong>
                        <ul class="url-list">
                          <li v-for="url in cert.crl_distribution_points" :key="url">
                            <a :href="url" target="_blank">{{ url }}</a>
                          </li>
                        </ul>
                      </div>
                      <div v-if="cert.ocsp_servers && cert.ocsp_servers.length > 0" class="info-item">
                        <strong>OCSP Servers:</strong>
                        <ul class="url-list">
                          <li v-for="url in cert.ocsp_servers" :key="url">
                            <a :href="url" target="_blank">{{ url }}</a>
                          </li>
                        </ul>
                      </div>
                      <div v-if="cert.ca_issuers && cert.ca_issuers.length > 0" class="info-item">
                        <strong>CA Issuers:</strong>
                        <ul class="url-list">
                          <li v-for="url in cert.ca_issuers" :key="url">
                            <a :href="url" target="_blank">{{ url }}</a>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div v-show="activeTab[index] === 'raw'" class="tab-content">
                    <div class="cert-raw">
                      <div class="raw-section">
                        <strong>PEM Format:</strong>
                        <textarea readonly class="cert-textarea">{{ cert.pem_certificate }}</textarea>
                        <div class="cert-actions mt-3">
                          <BaseButton
                            @click="copyCertificate(cert.pem_certificate, index)"
                            variant="secondary"
                            :class="['action-btn', { 'copy-success': copySuccess[index] }]"
                          >
                            {{ copySuccess[index] ? "✅ Copied!" : "📋 Copy PEM" }}
                          </BaseButton>
                          <BaseButton @click="downloadSingleCertificate(cert, 'pem', index)" variant="secondary" class="action-btn">
                            📥 Download PEM
                          </BaseButton>
                          <BaseButton @click="downloadSingleCertificate(cert, 'der', index)" variant="secondary" class="action-btn">
                            📥 Download DER
                          </BaseButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </BasePanel>
            </div>
          </div>

          <BasePanel title="Download Complete Chain" class="mt-3">
            <div class="download-section">
              <div class="download-buttons">
                <BaseButton @click="downloadCertificate('json')" variant="secondary" class="download-btn">
                  📥 Download Complete Chain (JSON)
                </BaseButton>
              </div>
              <p class="download-info mt-2">
                Downloads the complete certificate chain information including all certificates, connection details, and validation results.
              </p>
            </div>
          </BasePanel>

          <BasePanel
            v-if="certificateInfo.chain_validation_errors && certificateInfo.chain_validation_errors.length > 0"
            title="Validation Errors"
            class="mt-3 error-panel"
          >
            <ul class="error-list">
              <li v-for="error in certificateInfo.chain_validation_errors" :key="error" class="error-item">
                {{ error }}
              </li>
            </ul>
          </BasePanel>
        </div>
      </section>
    </BaseCard>
  </ComponentViewer>
</template>

<script setup lang="ts">
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { reactive, ref } from "vue";
import BaseButton from "./BaseButton.vue";
import BaseCard from "./BaseCard.vue";
import BaseInput from "./BaseInput.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";

interface CertificateDetails {
  subject: string;
  issuer: string;
  serial_number: string;
  version: number;
  not_before: string;
  not_after: string;
  is_expired: boolean;
  days_until_expiry: number;
  signature_algorithm: string;
  public_key_algorithm: string;
  public_key_size?: number;
  fingerprint_sha1: string;
  fingerprint_sha256: string;
  fingerprint_md5: string;
  subject_alt_names: string[];
  key_usage: string[];
  extended_key_usage: string[];
  basic_constraints?: string;
  authority_key_identifier?: string;
  subject_key_identifier?: string;
  crl_distribution_points: string[];
  ocsp_servers: string[];
  ca_issuers: string[];
  pem_certificate: string;
  der_certificate: string;
}

interface CertificateChainInfo {
  hostname: string;
  port: number;
  connection_successful: boolean;
  tls_version: string;
  cipher_suite: string;
  certificates: CertificateDetails[];
  chain_length: number;
  root_ca_trusted: boolean;
  chain_validation_errors: string[];
}

const hostname = ref("");
const port = ref("443");
const error = ref("");
const isLoading = ref(false);
const certificateInfo = ref<CertificateChainInfo | null>(null);
const copySuccess = ref<Record<number, boolean>>({});

// Tab management
const tabs = [
  { id: "basic", label: "Basic" },
  { id: "security", label: "Security" },
  { id: "extensions", label: "Extensions" },
  { id: "raw", label: "Raw Certificate" },
];

const activeTab = reactive<Record<number, string>>({});

function clear() {
  hostname.value = "";
  port.value = "443";
  error.value = "";
  certificateInfo.value = null;
  Object.keys(activeTab).forEach((key) => delete activeTab[parseInt(key)]);
  Object.keys(copySuccess.value).forEach((key) => delete copySuccess.value[parseInt(key)]);
}

async function checkCertificate() {
  error.value = "";
  certificateInfo.value = null;
  isLoading.value = true;

  if (!hostname.value.trim()) {
    error.value = "Please enter a hostname.";
    isLoading.value = false;
    return;
  }

  try {
    const portNum = parseInt(port.value) || 443;

    const result = await invoke<CertificateChainInfo>("get_tls_certificate_info", {
      hostname: hostname.value.trim(),
      port: portNum,
    });

    certificateInfo.value = result;

    if (result.certificates) {
      result.certificates.forEach((_: CertificateDetails, index: number) => {
        activeTab[index] = "basic";
      });
    }
  } catch (e: any) {
    error.value = `Error checking certificate: ${e || "Unknown error"}`;
    console.error("Certificate check error:", e);
  } finally {
    isLoading.value = false;
  }
}

function formatFingerprint(fingerprint?: string): string {
  if (!fingerprint) return "";
  return fingerprint.match(/.{1,2}/g)?.join(":") || fingerprint;
}

async function copyCertificate(pemData: string, certIndex: number) {
  try {
    await navigator.clipboard.writeText(pemData);
    copySuccess.value[certIndex] = true;

    setTimeout(() => {
      copySuccess.value[certIndex] = false;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy certificate:", err);
    error.value = "Failed to copy certificate to clipboard";
  }
}

async function downloadSingleCertificate(cert: CertificateDetails, format: "pem" | "der", certIndex: number) {
  if (!certificateInfo.value) return;

  try {
    let data: Uint8Array;
    let extension: string;
    let filename: string;

    const certType = certIndex === 0 ? "leaf" : `intermediate-${certIndex}`;

    if (format === "der") {
      try {
        const binaryString = atob(cert.der_certificate);
        data = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          data[i] = binaryString.charCodeAt(i);
        }
        extension = "der";
      } catch (decodeError) {
        console.error("Error decoding base64:", decodeError);
        error.value = "Error decoding certificate data";
        return;
      }
    } else {
      const encoder = new TextEncoder();
      data = encoder.encode(cert.pem_certificate);
      extension = "crt";
    }

    filename = `${certificateInfo.value.hostname}-${certType}-certificate.${extension}`;

    await downloadWithTauri(data, filename);
  } catch (e: any) {
    console.error("Download error:", e);
    error.value = `Error downloading certificate: ${e?.message || "Unknown error"}`;
  }
}

async function downloadCertificate(format: "json") {
  if (!certificateInfo.value) return;

  try {
    const result = await invoke<string>("download_certificate", {
      hostname: certificateInfo.value.hostname,
      port: certificateInfo.value.port,
      format: format,
    });

    const encoder = new TextEncoder();
    const data = encoder.encode(result);
    const filename = `${certificateInfo.value.hostname}-certificate-chain.json`;

    await downloadWithTauri(data, filename);
  } catch (e: any) {
    console.error("Download error:", e);
    error.value = `Error downloading certificate chain: ${e?.message || "Unknown error"}`;
  }
}

// Helper function that works with Tauri's native file system
async function downloadWithTauri(data: Uint8Array, filename: string) {
  try {
    const filePath = await save({
      defaultPath: filename,
      filters: [
        {
          name: "Certificate Files",
          extensions: ["crt", "pem", "der", "json"],
        },
        {
          name: "All Files",
          extensions: ["*"],
        },
      ],
    });

    if (!filePath) {
      return;
    }

    await writeFile(filePath, data);

  } catch (error) {

    throw new Error(`Download failed: ${error}`);
  }
}
</script>

<style scoped lang="scss">
.input-row {
  display: flex;
  gap: 1rem;

  .hostname-input {
    flex: 3;
  }

  .port-input {
    flex: 1;
    min-width: 100px;
  }
}

.button-group {
  display: flex;
  gap: 0.5rem;

  button {
    flex: 1;
  }
}

.certificate-container {
  width: 100%;
}

.cert-panel {
  height: fit-content;
}

.cert-info {
  .info-item {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-color, #e5e5e5);

    &:last-child {
      border-bottom: none;
    }

    strong {
      color: var(--text-primary);
      display: inline-block;
      min-width: 120px;
    }
  }
}

.cert-valid {
  color: var(--success-color, #22c55e);
  font-weight: 500;
}

.cert-invalid {
  color: var(--error-color, #ef4444);
  font-weight: 500;
}

.cert-warning {
  color: var(--warning-color, #f59e0b);
  font-weight: 500;
}

.cert-dn,
.serial {
  font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
  font-size: 0.85rem;
  background: var(--code-bg, #f5f5f5);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  word-break: break-all;
  display: inline-block;
  max-width: 100%;
}

.fingerprint {
  font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
  font-size: 0.85rem;
  background: var(--code-bg, #f5f5f5);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  word-break: break-all;
  display: block;
  margin-top: 0.25rem;
}

.san-list,
.usage-list,
.url-list {
  margin: 0.5rem 0 0 120px;
  padding-left: 1rem;

  li {
    margin: 0.25rem 0;
    font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
    font-size: 0.9rem;
  }
}

.url-list li a {
  color: var(--link-color, #3b82f6);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.cert-tabs {
  .tab-buttons {
    display: flex;
    border-bottom: 1px solid var(--border-color, #e5e5e5);
    margin-bottom: 1rem;
    gap: 0.5rem;
  }

  .tab-button {
    padding: 0.5rem 1rem;
    border: none;
    background: transparent;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary, #6b7280);
    font-weight: 500;
    transition: all 0.2s;

    &:hover {
      background: var(--hover-bg, #f3f4f6);
      color: var(--text-primary, #111827);
    }

    &.active {
      color: var(--primary-color, #3b82f6);
      border-bottom-color: var(--primary-color, #3b82f6);
    }
  }

  .tab-content {
    min-height: 200px;
  }
}

.cert-raw {
  .raw-section {
    margin-bottom: 1rem;

    .cert-textarea {
      width: 100%;
      height: 200px;
      font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
      font-size: 0.8rem;
      background: var(--code-bg, #f5f5f5);
      border: 1px solid var(--border-color, #e5e5e5);
      border-radius: 6px;
      padding: 1rem;
      resize: vertical;
      white-space: pre;
      overflow: auto;
    }

    .cert-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;

      .action-btn {
        min-width: 120px;
        transition: all 0.3s ease;

        &.copy-success {
          background-color: var(--success-color, #22c55e) !important;
          color: white !important;
          border-color: var(--success-color, #22c55e) !important;
        }
      }
    }
  }
}

.download-section {
  text-align: center;

  .download-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .download-btn {
    min-width: 200px;
  }

  .download-info {
    font-size: 0.9rem;
    color: var(--text-secondary, #6b7280);
    font-style: italic;
  }
}

.error-panel {
  border-color: var(--error-color, #ef4444);

  .error-list {
    list-style: none;
    padding: 0;
    margin: 0;

    .error-item {
      padding: 0.5rem;
      background: var(--error-bg, rgba(239, 68, 68, 0.1));
      border-radius: 4px;
      margin-bottom: 0.5rem;
      color: var(--error-color, #ef4444);
      font-size: 0.9rem;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

.error {
  color: var(--error-color, #ef4444);
  font-size: 0.9rem;
  padding: 0.5rem;
  border-radius: 6px;
  background: var(--error-bg, rgba(239, 68, 68, 0.1));
  border: 1px solid var(--error-color, #ef4444);
}

.success {
  color: var(--success-color, #22c55e);
  font-size: 0.9rem;
  padding: 0.5rem;
  border-radius: 6px;
  background: var(--success-bg, rgba(34, 197, 94, 0.1));
  border: 1px solid var(--success-color, #22c55e);
}

// Responsive design
@media (max-width: 768px) {
  .input-row {
    flex-direction: column;
  }

  .cert-tabs .tab-buttons {
    flex-wrap: wrap;
  }

  .download-buttons {
    flex-direction: column;
    align-items: center;
  }

  .cert-actions {
    flex-direction: column;

    .action-btn {
      width: 100%;
    }
  }

  .san-list,
  .usage-list,
  .url-list {
    margin-left: 0;
  }
}
</style>
