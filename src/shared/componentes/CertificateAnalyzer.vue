<template>
  <ComponentViewer title="Certificate Analyzer">
    <BaseCard>
      <section class="col-12 p-3">
        <BasePanel title="Certificate Input" class="mb-3">
          <div class="input-section">
            <label for="certificate-input">Paste your certificate here (PEM format):</label>
            <textarea
              id="certificate-input"
              v-model="certificateInput"
              placeholder="-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/OvD/XcwMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
...
-----END CERTIFICATE-----"
              rows="10"
              class="cert-textarea"
            ></textarea>
          </div>

          <div class="button-group mt-3">
            <BaseButton @click="analyzeCertificate" :disabled="!certificateInput.trim() || isLoading">
              {{ isLoading ? "Analyzing..." : "Analyze Certificate" }}
            </BaseButton>
            <BaseButton @click="clearAnalysis" variant="secondary">Clear</BaseButton>
          </div>

          <div v-if="error" class="error mt-2">{{ error }}</div>
          <div v-if="certificateInfo && !error" class="success mt-2">✅ Certificate analyzed successfully</div>
        </BasePanel>

        <div v-if="certificateInfo" class="certificate-container">
          <BasePanel title="Certificate Information" class="cert-panel">
            <div class="cert-tabs">
              <div class="tab-buttons">
                <button
                  v-for="tab in tabs"
                  :key="tab.id"
                  @click="activeTab = tab.id"
                  :class="{ active: activeTab === tab.id }"
                  class="tab-button"
                >
                  {{ tab.label }}
                </button>
              </div>

              <div v-show="activeTab === 'basic'" class="tab-content">
                <div class="cert-info">
                  <div class="info-item">
                    <strong>Subject:</strong> 
                    <code class="cert-dn">{{ certificateInfo.subject }}</code>
                  </div>
                  <div class="info-item">
                    <strong>Issuer:</strong> 
                    <code class="cert-dn">{{ certificateInfo.issuer }}</code>
                  </div>
                  <div class="info-item">
                    <strong>Serial Number:</strong> 
                    <code class="serial">{{ certificateInfo.serial_number }}</code>
                  </div>
                  <div class="info-item">
                    <strong>Version:</strong> {{ certificateInfo.version }}
                  </div>
                  <div class="info-item">
                    <strong>Valid From:</strong> {{ certificateInfo.not_before }}
                  </div>
                  <div class="info-item">
                    <strong>Valid To:</strong> {{ certificateInfo.not_after }}
                  </div>
                  <div class="info-item">
                    <strong>Status:</strong>
                    <span :class="{ 'cert-valid': !certificateInfo.is_expired, 'cert-invalid': certificateInfo.is_expired }">
                      {{ certificateInfo.is_expired ? "❌ Expired" : "✅ Valid" }}
                    </span>
                  </div>
                  <div class="info-item">
                    <strong>Days Until Expiry:</strong>
                    <span :class="{ 'cert-warning': certificateInfo.days_until_expiry < 30, 'cert-invalid': certificateInfo.days_until_expiry < 0 }">
                      {{ certificateInfo.days_until_expiry }}
                    </span>
                  </div>
                </div>
              </div>

              <div v-show="activeTab === 'security'" class="tab-content">
                <div class="cert-info">
                  <div class="info-item">
                    <strong>Signature Algorithm:</strong> {{ certificateInfo.signature_algorithm }}
                  </div>
                  <div class="info-item">
                    <strong>Public Key Algorithm:</strong> {{ certificateInfo.public_key_algorithm }}
                  </div>
                  <div v-if="certificateInfo.public_key_size" class="info-item">
                    <strong>Public Key Size:</strong> {{ certificateInfo.public_key_size }} bits
                  </div>
                  <div class="info-item">
                    <strong>SHA1 Fingerprint:</strong>
                    <code class="fingerprint">{{ formatFingerprint(certificateInfo.fingerprint_sha1) }}</code>
                  </div>
                  <div class="info-item">
                    <strong>SHA256 Fingerprint:</strong>
                    <code class="fingerprint">{{ formatFingerprint(certificateInfo.fingerprint_sha256) }}</code>
                  </div>
                  <div class="info-item">
                    <strong>MD5 Fingerprint:</strong>
                    <code class="fingerprint">{{ formatFingerprint(certificateInfo.fingerprint_md5) }}</code>
                  </div>
                </div>
              </div>

              <div v-show="activeTab === 'extensions'" class="tab-content">
                <div class="cert-info">
                  <div v-if="certificateInfo.subject_alt_names && certificateInfo.subject_alt_names.length > 0" class="info-item">
                    <strong>Subject Alternative Names:</strong>
                    <ul class="san-list">
                      <li v-for="san in certificateInfo.subject_alt_names" :key="san">{{ san }}</li>
                    </ul>
                  </div>
                  <div v-if="certificateInfo.key_usage && certificateInfo.key_usage.length > 0" class="info-item">
                    <strong>Key Usage:</strong>
                    <ul class="usage-list">
                      <li v-for="usage in certificateInfo.key_usage" :key="usage">{{ usage }}</li>
                    </ul>
                  </div>
                  <div v-if="certificateInfo.extended_key_usage && certificateInfo.extended_key_usage.length > 0" class="info-item">
                    <strong>Extended Key Usage:</strong>
                    <ul class="usage-list">
                      <li v-for="usage in certificateInfo.extended_key_usage" :key="usage">{{ usage }}</li>
                    </ul>
                  </div>
                  <div v-if="certificateInfo.basic_constraints" class="info-item">
                    <strong>Basic Constraints:</strong> {{ certificateInfo.basic_constraints }}
                  </div>
                  <div v-if="certificateInfo.crl_distribution_points && certificateInfo.crl_distribution_points.length > 0" class="info-item">
                    <strong>CRL Distribution Points:</strong>
                    <ul class="url-list">
                      <li v-for="url in certificateInfo.crl_distribution_points" :key="url">
                        <a :href="url" target="_blank">{{ url }}</a>
                      </li>
                    </ul>
                  </div>
                  <div v-if="certificateInfo.ocsp_servers && certificateInfo.ocsp_servers.length > 0" class="info-item">
                    <strong>OCSP Servers:</strong>
                    <ul class="url-list">
                      <li v-for="url in certificateInfo.ocsp_servers" :key="url">
                        <a :href="url" target="_blank">{{ url }}</a>
                      </li>
                    </ul>
                  </div>
                  <div v-if="certificateInfo.ca_issuers && certificateInfo.ca_issuers.length > 0" class="info-item">
                    <strong>CA Issuers:</strong>
                    <ul class="url-list">
                      <li v-for="url in certificateInfo.ca_issuers" :key="url">
                        <a :href="url" target="_blank">{{ url }}</a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

            </div>
          </BasePanel>
        </div>
      </section>
    </BaseCard>
  </ComponentViewer>
</template>

<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { ref } from 'vue'
import BaseButton from './BaseButton.vue'
import BaseCard from './BaseCard.vue'
import BasePanel from './BasePanel.vue'
import ComponentViewer from './ComponentViewer.vue'

interface CertificateDetails {
  subject: string
  issuer: string
  version: number
  serial_number: string
  not_before: string
  not_after: string
  is_expired: boolean
  days_until_expiry: number
  signature_algorithm: string
  public_key_algorithm: string
  public_key_size?: number
  fingerprint_sha1: string
  fingerprint_sha256: string
  fingerprint_md5: string
  subject_alt_names?: string[]
  key_usage?: string[]
  extended_key_usage?: string[]
  basic_constraints?: string
  crl_distribution_points?: string[]
  ocsp_servers?: string[]
  ca_issuers?: string[]
}

// Reactive state
const certificateInput = ref('')
const certificateInfo = ref<CertificateDetails | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const activeTab = ref('basic')

// Tabs configuration
const tabs = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'security', label: 'Security' },
  { id: 'extensions', label: 'Extensions' }
]

// Functions
const analyzeCertificate = async () => {
  if (!certificateInput.value.trim()) {
    error.value = 'Please enter a certificate'
    return
  }

  isLoading.value = true
  error.value = null
  certificateInfo.value = null

  try {
    const result = await invoke<CertificateDetails>('analyze_certificate_pem', {
      certificatePem: certificateInput.value.trim()
    })
    
    certificateInfo.value = result
  } catch (err) {
    console.error('Error analyzing certificate:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error analyzing certificate'
  } finally {
    isLoading.value = false
  }
}

const clearAnalysis = () => {
  certificateInput.value = ''
  certificateInfo.value = null
  error.value = null
}

const formatFingerprint = (fingerprint: string): string => {
  return fingerprint.replace(/(.{2})(?=.)/g, '$1:').toUpperCase()
}
</script>

<style lang="scss" scoped>
.input-section {
  margin-bottom: 1rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .cert-textarea {
    width: 100%;
    height: 200px;
    padding: 0.75rem;
    border: 2px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-size: 0.875rem;
    line-height: 1.4;
    resize: vertical;
    transition: border-color 0.2s ease;

    &:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    &::placeholder {
      color: var(--text-muted);
    }
  }
}

.button-group {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
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

.certificate-container {
  margin-top: 2rem;
  width: 100%;
}

.cert-panel {
  background: var(--panel-bg);
  height: fit-content;
}

.cert-tabs {
  .tab-buttons {
    display: flex;
    border-bottom: 1px solid var(--border-color, #e5e5e5);
    margin-bottom: 1rem;
    gap: 0.5rem;
  }

  .tab-button {
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;

    &:hover {
      color: var(--text-primary);
      background: var(--hover-bg);
    }

    &.active {
      color: var(--primary-color);
      border-bottom-color: var(--primary-color);
    }
  }

  .tab-content {
    min-height: 200px;
  }
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
.serial,
.fingerprint {
  font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
  font-size: 0.85rem;
  background: var(--code-bg, #f5f5f5);
  border: 1px solid var(--border-color, #e5e5e5);
  color: var(--text-primary, #111827);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;

  @media (prefers-color-scheme: dark) {
    background: var(--code-bg, #1f2937);
    border-color: var(--border-color, #374151);
    color: var(--text-primary, #f9fafb);
  }
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

@media (max-width: 768px) {
  .button-group {
    flex-direction: column;
  }

  .cert-tabs .tab-buttons {
    flex-wrap: wrap;
  }

  .cert-info .info-item {
    padding: 0.5rem;
  }

  .san-list,
  .usage-list,
  .url-list {
    margin-left: 0;
  }
}
</style>
