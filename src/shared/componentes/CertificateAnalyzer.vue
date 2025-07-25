<template>
  <ComponentViewer title="Certificate Analyzer">
    <BaseCard>
      <section class="col-12 p-3">
        <BasePanel title="Certificate Input" class="mb-3">
          <div class="input-section">
            <label for="cert-input" class="input-label">Paste your certificate (PEM or DER format):</label>
            <textarea
              id="cert-input"
              v-model="certificateInput"
              class="certificate-input"
              placeholder="Paste your certificate here...
              
Examples:

PEM Format:
-----BEGIN CERTIFICATE-----
MIIDjTCCAnWgAwIBAgIURe3SvcO0Bw7nL8EGczrS7LNWX+YwDQYJKoZIhvcNAQEL
BQAwVjELMAkGA1UEBhMCVVMxEzARBgNVBAgMCkNhbGlmb3JuaWExFjAUBgNVBAcM
DU1vdW50YWluIFZpZXcxGjAYBgNVBAoMEVl1dXIgT3JnYW5pemF0aW9uMB4XDTIz
...
-----END CERTIFICATE-----

DER Format (as Base64):
MIIDjTCCAnWgAwIBAgIURe3SvcO0Bw7nL8EGczrS7LNWX+YwDQYJKoZIhvcNAQEL..."
              rows="8"
            ></textarea>

            <div class="button-group mt-3">
              <BaseButton @click="analyzeCertificate" :disabled="!certificateInput.trim() || isAnalyzing">
                {{ isAnalyzing ? "Analyzing..." : "Analyze Certificate" }}
              </BaseButton>
              <BaseButton @click="clear" variant="secondary">Clear</BaseButton>
            </div>

            <div v-if="error" class="error mt-2">{{ error }}</div>
            <div v-if="certificateInfo && !error" class="success mt-2">✅ Certificate parsed successfully</div>
          </div>
        </BasePanel>

        <div v-if="certificateInfo" class="certificate-results">
          <BasePanel title="Certificate Information" class="mb-3">
            <div class="cert-info-grid">
              <div class="info-section">
                <h4>Basic Information</h4>
                <div class="info-item">
                  <strong>Subject:</strong>
                  <code class="cert-field">{{ certificateInfo.subject }}</code>
                </div>
                <div class="info-item">
                  <strong>Issuer:</strong>
                  <code class="cert-field">{{ certificateInfo.issuer }}</code>
                </div>
                <div class="info-item">
                  <strong>Serial Number:</strong>
                  <code class="cert-field">{{ certificateInfo.serialNumber }}</code>
                </div>
                <div class="info-item"><strong>Version:</strong> {{ certificateInfo.version }}</div>
              </div>

              <div class="info-section">
                <h4>Validity Period</h4>
                <div class="info-item"><strong>Valid From:</strong> {{ formatDate(certificateInfo.notBefore) }}</div>
                <div class="info-item"><strong>Valid To:</strong> {{ formatDate(certificateInfo.notAfter) }}</div>
                <div class="info-item">
                  <strong>Status:</strong>
                  <span :class="{ 'status-valid': !certificateInfo.isExpired, 'status-expired': certificateInfo.isExpired }">
                    {{ certificateInfo.isExpired ? "❌ Expired" : "✅ Valid" }}
                  </span>
                </div>
                <div class="info-item">
                  <strong>Days Until Expiry:</strong>
                  <span :class="{ 'status-warning': certificateInfo.daysUntilExpiry < 30, 'status-expired': certificateInfo.daysUntilExpiry < 0 }">
                    {{ certificateInfo.daysUntilExpiry }}
                  </span>
                </div>
              </div>

              <div class="info-section">
                <h4>Cryptographic Details</h4>
                <div class="info-item"><strong>Signature Algorithm:</strong> {{ certificateInfo.signatureAlgorithm }}</div>
                <div class="info-item"><strong>Public Key Algorithm:</strong> {{ certificateInfo.publicKeyAlgorithm }}</div>
                <div class="info-item" v-if="certificateInfo.publicKeySize">
                  <strong>Public Key Size:</strong> {{ certificateInfo.publicKeySize }} bits
                </div>
              </div>

              <div class="info-section">
                <h4>Fingerprints</h4>
                <div class="info-item">
                  <strong>SHA-256:</strong>
                  <code class="fingerprint">{{ formatFingerprint(certificateInfo.fingerprintSha256) }}</code>
                </div>
                <div class="info-item">
                  <strong>SHA-1:</strong>
                  <code class="fingerprint">{{ formatFingerprint(certificateInfo.fingerprintSha1) }}</code>
                </div>
                <div class="info-item">
                  <strong>MD5:</strong>
                  <code class="fingerprint">{{ formatFingerprint(certificateInfo.fingerprintMd5) }}</code>
                </div>
              </div>
            </div>
          </BasePanel>

          <BasePanel v-if="certificateInfo.extensions.length > 0" title="Extensions" class="mb-3">
            <div class="extensions-list">
              <div v-for="(extension, index) in certificateInfo.extensions" :key="index" class="extension-item">
                <div class="extension-header">
                  <strong>{{ extension.name }}</strong>
                  <span v-if="extension.critical" class="critical-badge">Critical</span>
                </div>
                <div class="extension-value">{{ extension.value }}</div>
              </div>
            </div>
          </BasePanel>

          <BasePanel title="Certificate Actions" class="mb-3">
            <div class="actions-section">
              <BaseButton @click="copyToClipboard(certificateInput)" variant="secondary" class="action-btn">
                {{ copySuccess ? "✅ Copied!" : "📋 Copy Certificate" }}
              </BaseButton>
              <BaseButton @click="downloadCertificate" variant="secondary" class="action-btn"> 📥 Download as PEM </BaseButton>
              <BaseButton @click="exportInfo" variant="secondary" class="action-btn"> 📄 Export Info as JSON </BaseButton>
            </div>
          </BasePanel>
        </div>
      </section>
    </BaseCard>
  </ComponentViewer>
</template>

<script setup lang="ts">
import forge from "node-forge";
import { ref } from "vue";
import BaseButton from "./BaseButton.vue";
import BaseCard from "./BaseCard.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";

interface CertificateInfo {
  subject: string;
  issuer: string;
  serialNumber: string;
  version: number;
  notBefore: string;
  notAfter: string;
  isExpired: boolean;
  daysUntilExpiry: number;
  signatureAlgorithm: string;
  publicKeyAlgorithm: string;
  publicKeySize?: number;
  fingerprintSha256: string;
  fingerprintSha1: string;
  fingerprintMd5: string;
  extensions: Array<{
    name: string;
    critical: boolean;
    value: string;
  }>;
}

const certificateInput = ref("");
const certificateInfo = ref<CertificateInfo | null>(null);
const error = ref("");
const isAnalyzing = ref(false);
const copySuccess = ref(false);

function clear() {
  certificateInput.value = "";
  certificateInfo.value = null;
  error.value = "";
}

async function analyzeCertificate() {
  error.value = "";
  certificateInfo.value = null;
  isAnalyzing.value = true;

  if (!certificateInput.value.trim()) {
    error.value = "Please paste a certificate to analyze.";
    isAnalyzing.value = false;
    return;
  }

  try {
    const certData = parseCertificate(certificateInput.value.trim());
    certificateInfo.value = certData;
  } catch (e: any) {
    error.value = `Error parsing certificate: ${e.message || "Invalid certificate format"}`;
    console.error("Certificate parsing error:", e);
  } finally {
    isAnalyzing.value = false;
  }
}

function parseCertificate(certText: string): CertificateInfo {
  try {
    let cert: forge.pki.Certificate;

    if (certText.includes("-----BEGIN CERTIFICATE-----")) {
      cert = forge.pki.certificateFromPem(certText);
    } else {
      try {
        const der = forge.util.decode64(certText.replace(/\s/g, ""));
        cert = forge.pki.certificateFromAsn1(forge.asn1.fromDer(der));
      } catch (derError) {
        throw new Error("Invalid certificate format. Expected PEM or DER format.");
      }
    }

    const now = new Date();
    const notBefore = cert.validity.notBefore;
    const notAfter = cert.validity.notAfter;
    const daysUntilExpiry = Math.floor((notAfter.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    const subject = cert.subject.attributes.map((attr: any) => `${getAttributeName(attr.type)}=${attr.value}`).join(", ");
    const issuer = cert.issuer.attributes.map((attr: any) => `${getAttributeName(attr.type)}=${attr.value}`).join(", ");

    const derBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const fingerprintSha256 = forge.md.sha256.create().update(derBytes).digest().toHex().toUpperCase();
    const fingerprintSha1 = forge.md.sha1.create().update(derBytes).digest().toHex().toUpperCase();
    const fingerprintMd5 = forge.md.md5.create().update(derBytes).digest().toHex().toUpperCase();

    const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;
    let publicKeySize: number | undefined;
    let publicKeyAlgorithm = "Unknown";

    if (publicKey && "n" in publicKey) {
      publicKeySize = publicKey.n.bitLength();
      publicKeyAlgorithm = "RSA";
    } else if (publicKey && "curve" in publicKey) {
      publicKeyAlgorithm = "EC";
    }

    const extensions: Array<{ name: string; critical: boolean; value: string }> = [];

    if (cert.extensions) {
      cert.extensions.forEach((ext: any) => {
        let extName = getExtensionName(ext.id);
        let extValue = "Unknown";

        try {
          switch (ext.id) {
            case forge.pki.oids.keyUsage:
              extValue = parseKeyUsage(ext);
              break;
            case forge.pki.oids.extKeyUsage:
              extValue = parseExtKeyUsage(ext);
              break;
            case forge.pki.oids.subjectAltName:
              extValue = parseSubjectAltName(ext);
              break;
            case forge.pki.oids.basicConstraints:
              extValue = parseBasicConstraints(ext);
              break;
            case forge.pki.oids.authorityKeyIdentifier:
              extValue = parseAuthorityKeyIdentifier(ext);
              break;
            case forge.pki.oids.subjectKeyIdentifier:
              extValue = parseSubjectKeyIdentifier(ext);
              break;
            case forge.pki.oids.authorityInfoAccess:
              extValue = parseAuthorityInfoAccess(ext);
              break;
            case forge.pki.oids.certificatePolicies:
              extValue = parseCertificatePolicies(ext);
              break;
            case forge.pki.oids.cRLDistributionPoints:
              extValue = parseCRLDistributionPoints(ext);
              break;
            default:
              extValue = "Extension present (binary data)";
          }
        } catch (parseError) {
          extValue = "Unable to parse extension value";
        }

        extensions.push({
          name: extName,
          critical: ext.critical || false,
          value: extValue,
        });
      });
    }

    return {
      subject,
      issuer,
      serialNumber: cert.serialNumber,
      version: cert.version + 1, // X.509 versions are 0-indexed
      notBefore: notBefore.toISOString(),
      notAfter: notAfter.toISOString(),
      isExpired: notAfter < now,
      daysUntilExpiry,
      signatureAlgorithm: getSignatureAlgorithmName(cert.siginfo?.algorithmOid || ""),
      publicKeyAlgorithm,
      publicKeySize,
      fingerprintSha256,
      fingerprintSha1,
      fingerprintMd5,
      extensions,
    };
  } catch (error) {
    console.error("Certificate parsing error:", error);
    throw new Error(`Failed to parse certificate: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

function getAttributeName(oid: string): string {
  const oidMap: Record<string, string> = {
    [forge.pki.oids.commonName]: "CN",
    [forge.pki.oids.countryName]: "C",
    [forge.pki.oids.localityName]: "L",
    [forge.pki.oids.stateOrProvinceName]: "ST",
    [forge.pki.oids.organizationName]: "O",
    [forge.pki.oids.organizationalUnitName]: "OU",
    [forge.pki.oids.emailAddress]: "emailAddress",
  };
  return oidMap[oid] || oid;
}

function getExtensionName(oid: string): string {
  const oidMap: Record<string, string> = {
    [forge.pki.oids.keyUsage]: "Key Usage",
    [forge.pki.oids.extKeyUsage]: "Extended Key Usage",
    [forge.pki.oids.subjectAltName]: "Subject Alternative Name",
    [forge.pki.oids.basicConstraints]: "Basic Constraints",
    [forge.pki.oids.authorityKeyIdentifier]: "Authority Key Identifier",
    [forge.pki.oids.subjectKeyIdentifier]: "Subject Key Identifier",
    [forge.pki.oids.cRLDistributionPoints]: "CRL Distribution Points",
    [forge.pki.oids.authorityInfoAccess]: "Authority Information Access",
    [forge.pki.oids.certificatePolicies]: "Certificate Policies",
  };
  return oidMap[oid] || `Unknown Extension (${oid})`;
}

function getSignatureAlgorithmName(oid: string): string {
  const oidMap: Record<string, string> = {
    "1.2.840.113549.1.1.11": "SHA256withRSA",
    "1.2.840.113549.1.1.5": "SHA1withRSA",
    "1.2.840.113549.1.1.4": "MD5withRSA",
    "1.2.840.113549.1.1.12": "SHA384withRSA",
    "1.2.840.113549.1.1.13": "SHA512withRSA",
    "1.2.840.10045.4.3.2": "SHA256withECDSA",
    "1.2.840.10045.4.3.3": "SHA384withECDSA",
    "1.2.840.10045.4.3.4": "SHA512withECDSA",
  };
  return oidMap[oid] || `Unknown (${oid})`;
}

function parseKeyUsage(ext: any): string {
  const keyUsages = [];
  if (ext.digitalSignature) keyUsages.push("Digital Signature");
  if (ext.nonRepudiation) keyUsages.push("Non Repudiation");
  if (ext.keyEncipherment) keyUsages.push("Key Encipherment");
  if (ext.dataEncipherment) keyUsages.push("Data Encipherment");
  if (ext.keyAgreement) keyUsages.push("Key Agreement");
  if (ext.keyCertSign) keyUsages.push("Certificate Sign");
  if (ext.cRLSign) keyUsages.push("CRL Sign");
  if (ext.encipherOnly) keyUsages.push("Encipher Only");
  if (ext.decipherOnly) keyUsages.push("Decipher Only");
  return keyUsages.length > 0 ? keyUsages.join(", ") : "None specified";
}

function parseExtKeyUsage(ext: any): string {
  const extKeyUsages = [];

  if (ext.serverAuth) extKeyUsages.push("Server Authentication");
  if (ext.clientAuth) extKeyUsages.push("Client Authentication");
  if (ext.codeSigning) extKeyUsages.push("Code Signing");
  if (ext.emailProtection) extKeyUsages.push("Email Protection");
  if (ext.timeStamping) extKeyUsages.push("Time Stamping");
  if (ext.ocspSigning) extKeyUsages.push("OCSP Signing");

  return extKeyUsages.length > 0 ? extKeyUsages.join(", ") : "None specified";
}

function parseSubjectAltName(ext: any): string {
  const altNames: string[] = [];

  if (ext.altNames) {
    ext.altNames.forEach((altName: any) => {
      switch (altName.type) {
        case 1: // email
          altNames.push(`email:${altName.value}`);
          break;
        case 2: // DNS
          altNames.push(`DNS:${altName.value}`);
          break;
        case 4: // directoryName
          altNames.push(`directoryName:${altName.value}`);
          break;
        case 6: // URI
          altNames.push(`URI:${altName.value}`);
          break;
        case 7: // IP
          altNames.push(`IP:${altName.value}`);
          break;
        default:
          altNames.push(`type${altName.type}:${altName.value}`);
      }
    });
  }

  return altNames.length > 0 ? altNames.join(", ") : "None";
}

function parseBasicConstraints(ext: any): string {
  const constraints = [];

  if (ext.cA !== undefined) {
    constraints.push(`CA:${ext.cA ? "TRUE" : "FALSE"}`);
  }

  if (ext.pathLenConstraint !== undefined) {
    constraints.push(`pathlen:${ext.pathLenConstraint}`);
  }

  return constraints.length > 0 ? constraints.join(", ") : "None";
}

function parseAuthorityKeyIdentifier(ext: any): string {
  try {
    if (ext.keyIdentifier) {
      const hexId = forge.util.bytesToHex(ext.keyIdentifier).toUpperCase();
      return `keyid:${hexId.match(/.{1,2}/g)?.join(":") || hexId}`;
    }
    return "Authority Key Identifier present";
  } catch (error) {
    return "Authority Key Identifier (unable to parse)";
  }
}

function parseSubjectKeyIdentifier(ext: any): string {
  try {
    if (ext.subjectKeyIdentifier) {
      const hexId = forge.util.bytesToHex(ext.subjectKeyIdentifier).toUpperCase();
      return `${hexId.match(/.{1,2}/g)?.join(":") || hexId}`;
    }
    return "Subject Key Identifier present";
  } catch (error) {
    return "Subject Key Identifier (unable to parse)";
  }
}

function parseAuthorityInfoAccess(ext: any): string {
  try {
    if (ext.authorityInfoAccess) {
      const accessDescriptions: string[] = [];
      ext.authorityInfoAccess.forEach((access: any) => {
        let method = "Unknown Method";
        let location = access.accessLocation || "Unknown Location";

        if (access.accessMethod === "1.3.6.1.5.5.7.48.1") {
          method = "OCSP";
        } else if (access.accessMethod === "1.3.6.1.5.5.7.48.2") {
          method = "CA Issuers";
        }

        accessDescriptions.push(`${method} - ${location}`);
      });
      return accessDescriptions.length > 0 ? accessDescriptions.join(", ") : "No access information";
    }

    if (ext.value && typeof ext.value === "string") {
      const urlMatches = ext.value.match(/https?:\/\/[^\x00-\x1F\x7F-\x9F]+/g);
      if (urlMatches) {
        return urlMatches.map((url: string) => `URL: ${url}`).join(", ");
      }
    }

    return "Authority Information Access present";
  } catch (error) {
    return "Authority Information Access (unable to parse)";
  }
}

function parseCertificatePolicies(ext: any): string {
  try {
    const policies: string[] = [];

    if (ext.certificatePolicies) {
      ext.certificatePolicies.forEach((policy: any) => {
        if (policy.policyIdentifier) {
          let policyName = policy.policyIdentifier;

          const policyMap: Record<string, string> = {
            "2.23.140.1.2.1": "Domain Validated",
            "2.23.140.1.2.2": "Organization Validated",
            "2.23.140.1.2.3": "Extended Validation",
            "1.3.6.1.4.1.11129.2.5.1": "Certificate Transparency",
          };

          if (policyMap[policyName]) {
            policyName = `${policyMap[policyName]} (${policyName})`;
          }

          policies.push(policyName);
        }
      });
    } else if (ext.value && typeof ext.value === "string") {
      const oidPattern = /\d+\.\d+\.\d+[\d\.]*\d+/g;
      const oidMatches = ext.value.match(oidPattern);
      if (oidMatches) {
        oidMatches.forEach((oid: string) => {
          const policyMap: Record<string, string> = {
            "2.23.140.1.2.1": "Domain Validated",
            "2.23.140.1.2.2": "Organization Validated",
            "2.23.140.1.2.3": "Extended Validation",
            "1.3.6.1.4.1.11129.2.5.1": "Certificate Transparency",
          };

          const displayName = policyMap[oid] ? `${policyMap[oid]} (${oid})` : oid;
          if (!policies.includes(displayName)) {
            policies.push(displayName);
          }
        });
      }
    }

    return policies.length > 0 ? policies.join(", ") : "Certificate Policies present";
  } catch (error) {
    return "Certificate Policies (unable to parse)";
  }
}

function parseCRLDistributionPoints(ext: any): string {
  try {
    const distributionPoints: string[] = [];

    if (ext.distributionPoints) {
      ext.distributionPoints.forEach((dp: any) => {
        if (dp.distributionPoint && dp.distributionPoint.fullName) {
          dp.distributionPoint.fullName.forEach((name: any) => {
            if (name.type === 6) {
              // URI
              distributionPoints.push(`URI:${name.value}`);
            } else {
              distributionPoints.push(`Type${name.type}:${name.value}`);
            }
          });
        }
      });
    }

    return distributionPoints.length > 0 ? distributionPoints.join(", ") : "No distribution points";
  } catch (error) {
    return "CRL Distribution Points (unable to parse)";
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return dateString;
  }
}

function formatFingerprint(fingerprint: string): string {
  return fingerprint.match(/.{1,2}/g)?.join(":") || fingerprint;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
    error.value = "Failed to copy to clipboard";
  }
}

function downloadCertificate() {
  if (!certificateInput.value) return;

  const blob = new Blob([certificateInput.value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "certificate.pem";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportInfo() {
  if (!certificateInfo.value) return;

  const jsonData = JSON.stringify(certificateInfo.value, null, 2);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "certificate-info.json";
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

  .certificate-input {
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
    min-height: 200px;

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

.cert-info-grid {
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
        display: block;
        margin-bottom: 0.25rem;
        color: var(--text-primary, #111827);
        font-size: 0.9rem;
      }

      .cert-field {
        display: block;
        background: var(--code-bg, #f8f9fa);
        padding: 0.5rem;
        border-radius: 4px;
        border: 1px solid var(--border-color, #e5e5e5);
        font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
        font-size: 0.85rem;
        word-break: break-all;
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

.extensions-list {
  .extension-item {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--hover-bg, #f8f9fa);
    border-radius: 8px;
    border: 1px solid var(--border-color, #e5e5e5);

    .extension-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;

      .critical-badge {
        background: var(--error-color, #ef4444);
        color: white;
        font-size: 0.7rem;
        font-weight: 500;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        text-transform: uppercase;
      }
    }

    .extension-value {
      font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
      font-size: 0.9rem;
      color: var(--text-secondary, #6b7280);
      background: var(--code-bg, #ffffff);
      padding: 0.5rem;
      border-radius: 4px;
      border: 1px solid var(--border-color, #e5e5e5);
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

    .certificate-input {
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

  .cert-info-grid .info-section {
    h4 {
      color: var(--text-primary, #f9fafb);
      border-bottom-color: var(--border-color, #374151);
    }

    .info-item {
      strong {
        color: var(--text-primary, #f9fafb);
      }

      .cert-field,
      .fingerprint {
        background: var(--code-bg, #111827);
        border-color: var(--border-color, #374151);
        color: var(--text-primary, #f9fafb);
      }
    }
  }

  .extensions-list .extension-item {
    background: var(--hover-bg, #374151);
    border-color: var(--border-color, #4b5563);

    .extension-value {
      background: var(--code-bg, #1f2937);
      border-color: var(--border-color, #374151);
      color: var(--text-secondary, #9ca3af);
    }
  }
}

// Responsive design
@media (max-width: 768px) {
  .cert-info-grid {
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
}
</style>
