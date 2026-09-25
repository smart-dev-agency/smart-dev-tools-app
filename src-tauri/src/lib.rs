use base64::{engine::general_purpose, Engine as _};
use rustls::{ClientConfig, ServerName};
use serde::{Deserialize, Serialize};
use sha1::Digest as Sha1Digest;
use sha2;
use std::sync::Arc;
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::time::timeout;
use tokio_rustls::TlsConnector;
use x509_parser::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CertificateDetails {
    pub subject: String,
    pub issuer: String,
    pub serial_number: String,
    pub version: u32,
    pub not_before: String,
    pub not_after: String,
    pub is_expired: bool,
    pub days_until_expiry: i64,
    pub signature_algorithm: String,
    pub public_key_algorithm: String,
    pub public_key_size: Option<usize>,
    pub fingerprint_sha1: String,
    pub fingerprint_sha256: String,
    pub fingerprint_md5: String,
    pub subject_alt_names: Vec<String>,
    pub key_usage: Vec<String>,
    pub extended_key_usage: Vec<String>,
    pub basic_constraints: Option<String>,
    pub authority_key_identifier: Option<String>,
    pub subject_key_identifier: Option<String>,
    pub crl_distribution_points: Vec<String>,
    pub ocsp_servers: Vec<String>,
    pub ca_issuers: Vec<String>,
    pub pem_certificate: String,
    pub der_certificate: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CertificateChainInfo {
    pub hostname: String,
    pub port: u16,
    pub connection_successful: bool,
    pub tls_version: String,
    pub cipher_suite: String,
    pub certificates: Vec<CertificateDetails>,
    pub chain_length: usize,
    pub root_ca_trusted: bool,
    pub chain_validation_errors: Vec<String>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn get_tls_certificate_info(
    hostname: String,
    port: Option<u16>,
) -> Result<CertificateChainInfo, String> {
    let port = port.unwrap_or(443);
    if port == 0 || hostname.len() > 253 || hostname.trim() != hostname {
        return Err("Enter a hostname and a port between 1 and 65535".into());
    }
    let domain = ServerName::try_from(hostname.as_str())
        .map_err(|e| format!("Invalid hostname '{}': {}", hostname, e))?;
    let deadline = Duration::from_secs(10);
    let addresses: Vec<_> = timeout(deadline, tokio::net::lookup_host((hostname.as_str(), port)))
        .await
        .map_err(|_| "DNS lookup timed out after 10 seconds".to_string())?
        .map_err(|e| format!("Failed to resolve {}: {}", hostname, e))?
        .collect();
    if addresses.is_empty() {
        return Err("No address found for hostname".into());
    }

    let mut root_store = rustls::RootCertStore::empty();

    for cert in rustls_native_certs::load_native_certs()
        .map_err(|e| format!("Failed to load native certificates: {}", e))?
    {
        root_store.add(&rustls::Certificate(cert.0)).ok();
    }

    root_store.add_trust_anchors(webpki_roots::TLS_SERVER_ROOTS.iter().map(|ta| {
        rustls::OwnedTrustAnchor::from_subject_spki_name_constraints(
            ta.subject,
            ta.spki,
            ta.name_constraints,
        )
    }));

    let config = ClientConfig::builder()
        .with_safe_defaults()
        .with_root_certificates(root_store)
        .with_no_client_auth();

    let connector = TlsConnector::from(Arc::new(config));

    let stream = timeout(deadline, TcpStream::connect(addresses.as_slice()))
        .await
        .map_err(|_| "Connection timed out after 10 seconds".to_string())?
        .map_err(|e| format!("Failed to connect to {}:{}: {}", hostname, port, e))?;
    let tls_stream = timeout(deadline, connector.connect(domain, stream))
        .await
        .map_err(|_| "TLS handshake timed out after 10 seconds".to_string())?
        .map_err(|e| format!("TLS handshake failed with {}:{}: {}", hostname, port, e))?;

    let (_, connection) = tls_stream.into_inner();

    let tls_version = format!(
        "{:?}",
        connection
            .protocol_version()
            .unwrap_or(rustls::ProtocolVersion::TLSv1_2)
    );
    let cipher_suite = format!(
        "{:?}",
        connection.negotiated_cipher_suite().unwrap().suite()
    );

    let peer_certs = connection
        .peer_certificates()
        .ok_or("No peer certificates found")?;

    if peer_certs.is_empty() {
        return Err("Certificate chain is empty".to_string());
    }

    let mut certificates = Vec::new();
    let mut chain_validation_errors = Vec::new();

    for (index, cert_der) in peer_certs.iter().enumerate() {
        match parse_certificate(&cert_der.0) {
            Ok(cert_details) => certificates.push(cert_details),
            Err(e) => {
                chain_validation_errors.push(format!("Certificate {}: {}", index, e));
            }
        }
    }

    let root_ca_trusted = chain_validation_errors.is_empty();

    Ok(CertificateChainInfo {
        hostname,
        port,
        connection_successful: true,
        tls_version,
        cipher_suite,
        certificates,
        chain_length: peer_certs.len(),
        root_ca_trusted,
        chain_validation_errors,
    })
}

fn unsigned_bits(bytes: &[u8]) -> usize {
    match bytes.iter().position(|&b| b != 0) {
        Some(start) => (bytes.len() - start - 1) * 8 + 8 - bytes[start].leading_zeros() as usize,
        None => 0,
    }
}

fn public_key_bits(key: &SubjectPublicKeyInfo<'_>) -> Option<usize> {
    use x509_parser::public_key::PublicKey;
    match key.parsed().ok()? {
        PublicKey::RSA(rsa) => Some(unsigned_bits(rsa.modulus)),
        PublicKey::EC(_) => match key
            .algorithm
            .parameters
            .as_ref()?
            .as_oid()
            .ok()?
            .to_string()
            .as_str()
        {
            "1.2.840.10045.3.1.7" | "1.3.132.0.10" => Some(256),
            "1.3.132.0.34" => Some(384),
            "1.3.132.0.35" => Some(521),
            _ => None, // Unknown curves are not estimated from DER size.
        },
        _ => None,
    }
}

fn parse_certificate(cert_der: &[u8]) -> Result<CertificateDetails, String> {
    let (remaining, cert) = X509Certificate::from_der(cert_der)
        .map_err(|e| format!("Failed to parse certificate: {}", e))?;
    if !remaining.is_empty() {
        return Err("Unexpected data after certificate".into());
    }

    let subject = cert.subject().to_string();
    let issuer = cert.issuer().to_string();
    let serial_number = hex::encode(&cert.serial.to_bytes_be());
    let version = cert.version.0 + 1;

    let not_before = cert.validity().not_before.to_string();
    let not_after = cert.validity().not_after.to_string();

    let now = chrono::Utc::now().timestamp();
    let expiry_timestamp = cert.validity().not_after.timestamp();
    let is_expired = now > expiry_timestamp;
    let days_until_expiry = (expiry_timestamp - now) / 86400;

    let signature_algorithm = format!("{}", cert.signature_algorithm.algorithm);

    let public_key_algorithm = format!("{}", cert.public_key().algorithm.algorithm);
    let public_key_size = public_key_bits(cert.public_key());

    let fingerprint_sha1 = hex::encode(sha1::Sha1::digest(cert_der)).to_uppercase();
    let fingerprint_sha256 = hex::encode(sha2::Sha256::digest(cert_der)).to_uppercase();
    let fingerprint_md5 = hex::encode(md5::compute(cert_der).0).to_uppercase();

    let mut subject_alt_names = Vec::new();
    let mut key_usage = Vec::new();
    let mut extended_key_usage = Vec::new();
    let mut basic_constraints = None;
    let mut authority_key_identifier = None;
    let mut subject_key_identifier = None;
    let mut crl_distribution_points = Vec::new();
    let mut ocsp_servers = Vec::new();
    let mut ca_issuers = Vec::new();

    for ext in cert.extensions() {
        match ext.parsed_extension() {
            ParsedExtension::SubjectAlternativeName(san) => {
                for name in &san.general_names {
                    match name {
                        GeneralName::DNSName(dns) => subject_alt_names.push(format!("DNS:{}", dns)),
                        GeneralName::IPAddress(ip) => {
                            subject_alt_names.push(format!("IP:{}", hex::encode(ip)))
                        }
                        GeneralName::URI(uri) => subject_alt_names.push(format!("URI:{}", uri)),
                        GeneralName::RFC822Name(email) => {
                            subject_alt_names.push(format!("Email:{}", email))
                        }
                        _ => {}
                    }
                }
            }
            ParsedExtension::KeyUsage(ku) => {
                if ku.digital_signature() {
                    key_usage.push("Digital Signature".to_string());
                }
                if ku.non_repudiation() {
                    key_usage.push("Non Repudiation".to_string());
                }
                if ku.key_encipherment() {
                    key_usage.push("Key Encipherment".to_string());
                }
                if ku.data_encipherment() {
                    key_usage.push("Data Encipherment".to_string());
                }
                if ku.key_agreement() {
                    key_usage.push("Key Agreement".to_string());
                }
                if ku.key_cert_sign() {
                    key_usage.push("Certificate Sign".to_string());
                }
                if ku.crl_sign() {
                    key_usage.push("CRL Sign".to_string());
                }
                if ku.encipher_only() {
                    key_usage.push("Encipher Only".to_string());
                }
                if ku.decipher_only() {
                    key_usage.push("Decipher Only".to_string());
                }
            }
            ParsedExtension::ExtendedKeyUsage(eku) => {
                if eku.server_auth {
                    extended_key_usage.push("TLS Web Server Authentication".to_string());
                }
                if eku.client_auth {
                    extended_key_usage.push("TLS Web Client Authentication".to_string());
                }
                if eku.code_signing {
                    extended_key_usage.push("Code Signing".to_string());
                }
                if eku.email_protection {
                    extended_key_usage.push("Email Protection".to_string());
                }
                if eku.time_stamping {
                    extended_key_usage.push("Time Stamping".to_string());
                }
                if eku.ocsp_signing {
                    extended_key_usage.push("OCSP Signing".to_string());
                }
            }
            ParsedExtension::BasicConstraints(bc) => {
                basic_constraints = Some(format!(
                    "CA: {}, Path Length: {:?}",
                    bc.ca, bc.path_len_constraint
                ));
            }
            ParsedExtension::AuthorityKeyIdentifier(aki) => {
                if let Some(key_id) = &aki.key_identifier {
                    authority_key_identifier = Some(hex::encode(key_id.0).to_uppercase());
                }
            }
            ParsedExtension::SubjectKeyIdentifier(ski) => {
                subject_key_identifier = Some(hex::encode(ski.0).to_uppercase());
            }
            ParsedExtension::CRLDistributionPoints(cdp) => {
                for point in &cdp.points {
                    if let Some(name) = &point.distribution_point {
                        if let DistributionPointName::FullName(names) = name {
                            for gn in names {
                                if let GeneralName::URI(uri) = gn {
                                    crl_distribution_points.push(uri.to_string());
                                }
                            }
                        }
                    }
                }
            }
            ParsedExtension::AuthorityInfoAccess(aia) => {
                for access in &aia.accessdescs {
                    match access.access_location {
                        GeneralName::URI(ref uri) => {
                            let method_oid = access.access_method.to_string();
                            if method_oid == "1.3.6.1.5.5.7.48.1" {
                                ocsp_servers.push(uri.to_string());
                            } else if method_oid == "1.3.6.1.5.5.7.48.2" {
                                ca_issuers.push(uri.to_string());
                            }
                        }
                        _ => {}
                    }
                }
            }
            _ => {}
        }
    }

    let pem_certificate = format!(
        "-----BEGIN CERTIFICATE-----\n{}\n-----END CERTIFICATE-----",
        general_purpose::STANDARD
            .encode(cert_der)
            .chars()
            .collect::<Vec<char>>()
            .chunks(64)
            .map(|chunk| chunk.iter().collect::<String>())
            .collect::<Vec<String>>()
            .join("\n")
    );

    let der_certificate = general_purpose::STANDARD.encode(cert_der);

    Ok(CertificateDetails {
        subject,
        issuer,
        serial_number,
        version,
        not_before,
        not_after,
        is_expired,
        days_until_expiry,
        signature_algorithm,
        public_key_algorithm,
        public_key_size,
        fingerprint_sha1,
        fingerprint_sha256,
        fingerprint_md5,
        subject_alt_names,
        key_usage,
        extended_key_usage,
        basic_constraints,
        authority_key_identifier,
        subject_key_identifier,
        crl_distribution_points,
        ocsp_servers,
        ca_issuers,
        pem_certificate,
        der_certificate,
    })
}

#[tauri::command]
async fn download_certificate(
    hostname: String,
    port: Option<u16>,
    format: String,
) -> Result<String, String> {
    let cert_info = get_tls_certificate_info(hostname.clone(), port).await?;

    if cert_info.certificates.is_empty() {
        return Err("No certificates found".to_string());
    }

    let leaf_cert = &cert_info.certificates[0];

    match format.as_str() {
        "pem" => Ok(leaf_cert.pem_certificate.clone()),
        "der" => Ok(leaf_cert.der_certificate.clone()),
        "json" => serde_json::to_string_pretty(&cert_info)
            .map_err(|e| format!("Failed to serialize certificate info: {}", e)),
        _ => Err("Invalid format. Supported formats: pem, der, json".to_string()),
    }
}

#[tauri::command]
async fn analyze_certificate_pem(certificate_pem: String) -> Result<CertificateDetails, String> {
    if certificate_pem.len() > 1024 * 1024 {
        return Err("Certificate input exceeds 1 MiB".into());
    }
    let text = certificate_pem.trim();
    let body = text
        .strip_prefix("-----BEGIN CERTIFICATE-----")
        .and_then(|s| s.strip_suffix("-----END CERTIFICATE-----"))
        .ok_or("Expected one PEM CERTIFICATE block")?;
    let pem_data: String = body
        .chars()
        .filter(|c| c.is_ascii_whitespace() == false)
        .collect();

    let cert_der = general_purpose::STANDARD
        .decode(pem_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    parse_certificate(&cert_der)
}

#[tauri::command]
async fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_tls_certificate_info,
            download_certificate,
            analyze_certificate_pem,
            get_app_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exact_unsigned_bit_lengths() {
        assert_eq!(unsigned_bits(&[]), 0);
        assert_eq!(unsigned_bits(&[0, 0]), 0);
        assert_eq!(unsigned_bits(&[0, 0x80, 0]), 16);
        assert_eq!(unsigned_bits(&[1, 0, 1]), 17);
        assert_eq!(unsigned_bits(&[0, 0x7f]), 7);
    }
    #[tokio::test]
    async fn reject_invalid_certificates_and_ports() {
        assert!(analyze_certificate_pem("not a PEM".into()).await.is_err());
        assert!(analyze_certificate_pem(
            "-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----".into()
        )
        .await
        .is_err());
        assert!(get_tls_certificate_info("example.com".into(), Some(0))
            .await
            .is_err());
        assert!(get_tls_certificate_info("https://example.com".into(), None)
            .await
            .is_err());
    }
    #[tokio::test]
    async fn inspect_generated_public_certificates() {
        // Synthetic, self-signed public certificates only; no private key is stored in the tests.
        let pem = r#"-----BEGIN CERTIFICATE-----
MIIDGzCCAgOgAwIBAgIUB34KnU+II3p4bJx4Gt1uwiqVGcowDQYJKoZIhvcNAQEL
BQAwHTEbMBkGA1UEAwwSbG9jYWwtdGVzdC5pbnZhbGlkMB4XDTI2MDkyNDIzMzM0
OVoXDTI2MDkyNTIzMzM0OVowHTEbMBkGA1UEAwwSbG9jYWwtdGVzdC5pbnZhbGlk
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAk8D88BYnqH46KFjp3nod
RTqEIbVUXfBP2rg6CILxtpqUAUIkUcJz9ap2JbfycXlMwW00RBj83PjpMey5kJpE
MsfreYYDktfM2eR9/vojgJBLFl2ilFUq405v6Gy2QwV5aNSRK4LbwiMw/25cnRo+
JsfJfc5anRW6rH1rXL2GVs+nhf2IyHBc1ZRwl/xbT7cZKk6tzR094DtAMPwMWvLb
KXmmImTFWbCZMN9PoUEPPRTYVfOPE8gL0b0pU+ktp8vN8T7qkFgq5ty4RyMEFtdY
9drT+r89mJiwyuev9vs56OndlgtQpuwXyatThaagQU8EQsV+KWzXGAUV2MeSqqek
9QIDAQABo1MwUTAdBgNVHQ4EFgQUToI7VAjEwNCF0olGbDtxxCgf1GcwHwYDVR0j
BBgwFoAUToI7VAjEwNCF0olGbDtxxCgf1GcwDwYDVR0TAQH/BAUwAwEB/zANBgkq
hkiG9w0BAQsFAAOCAQEAXyT1B/fIXclRDgTskNiAXeo3U6tvNGBpDd2aYEnsfUV5
Gqx6iXHyEfD3HDqPLHqI+/ZY64rF1N3zBx/3bin0C2GKDgCgcczvTPUQtMKgvQ8H
FtSWiT8kUAbHrTo5bHVa4T0JMw7rhwOhVQvwjd7r14HquA/WX5oO65BCx/PdLIji
76IA47vmBdS5BwwO1mxm/tr4/58mIxd3D0ONmKxY0idJhlOT0MwEEQF5EkM1639O
/qxR/eh3h9rR10/lvjM/vSIYMsZ8eVuNCNImNR4sIM4J7MsveyFeRREjw950DeG6
qLdGmG0ANzXZVTJ3bOU2U7ndtX8inBoNacGr1HjOnQ==
-----END CERTIFICATE-----
"#;
        let details = analyze_certificate_pem(pem.into()).await.unwrap();
        assert_eq!(details.public_key_size, Some(2048));
        assert_eq!(details.version, 3);
        assert_eq!(
            details.fingerprint_sha256,
            "C54FFD82238E1CE807807C7893DBCC69820F220FE6689BD7248014066E0FE433"
        );
        let mut der = general_purpose::STANDARD
            .decode(&details.der_certificate)
            .unwrap();
        der.push(0);
        assert!(parse_certificate(&der).is_err());
        let pem = r#"-----BEGIN CERTIFICATE-----
MIICETCCAXKgAwIBAgIUSO2IyMCFvwPo/fldiyMu0ukE1lUwCgYIKoZIzj0EAwIw
GjEYMBYGA1UEAwwPZWMtdGVzdC5pbnZhbGlkMB4XDTI2MDkyNDIzMzM0OVoXDTI2
MDkyNTIzMzM0OVowGjEYMBYGA1UEAwwPZWMtdGVzdC5pbnZhbGlkMIGbMBAGByqG
SM49AgEGBSuBBAAjA4GGAAQBVNKMQdCKNr92TSWiQFTnLpxJKp5xjq0aP152QduQ
ivurVJt9jE+XcWJbr8FwNVAYEBp4umGjCLbstA+1FzOC9N8BTikwU0wOxz6lOFS8
q/S89U2RXRjOdtVVHPUSRHLhKj/FHgh2OaWPt46q/wZ2NqySIYcnncnW9AU1Y6JH
b6DOq9ajUzBRMB0GA1UdDgQWBBQDcSNunqUTSy8m7KQgERjOL07hlTAfBgNVHSME
GDAWgBQDcSNunqUTSy8m7KQgERjOL07hlTAPBgNVHRMBAf8EBTADAQH/MAoGCCqG
SM49BAMCA4GMADCBiAJCAOf+03Xgd1t9qjujz82+LfXMDEenYONPVjEIL8zLH/wL
J4AjxQ02G1+ke3G1iUgCtLZivvmMaTQo2xc1TL7UnopwAkIB07dqr+q9aMEU8z1C
I/kAsaVLofL+2HsB6O7JSplmGh7A8C6GGizHFc8Nmc+eBvh+mhoY8WNk6rlch0r2
8EkBaIo=
-----END CERTIFICATE-----
"#;
        let details = analyze_certificate_pem(pem.into()).await.unwrap();
        assert_eq!(details.public_key_size, Some(521));
        assert_eq!(details.version, 3);
        assert_eq!(
            details.fingerprint_sha256,
            "DC1D26B04DA4BCD2406E45EDD0E6B120DC742DCEE02AC2F088A9D8DDEFA78D6D"
        );
        let mut der = general_purpose::STANDARD
            .decode(&details.der_certificate)
            .unwrap();
        der.push(0);
        assert!(parse_certificate(&der).is_err());
    }
}
