use base64::{engine::general_purpose, Engine as _};
use rustls::{ClientConfig, ServerName};
use serde::{Deserialize, Serialize};
use sha1::Digest as Sha1Digest;
use sha2;
use std::net::ToSocketAddrs;
use std::sync::Arc;
use tokio::net::TcpStream;
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
    let addr = format!("{}:{}", hostname, port);

    let socket_addr = addr
        .to_socket_addrs()
        .map_err(|e| format!("Failed to resolve address {}: {}", addr, e))?
        .next()
        .ok_or_else(|| format!("No valid address found for {}", addr))?;

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

    let stream = TcpStream::connect(socket_addr)
        .await
        .map_err(|e| format!("Failed to connect to {}:{}: {}", hostname, port, e))?;

    let domain = ServerName::try_from(hostname.as_str())
        .map_err(|e| format!("Invalid hostname '{}': {}", hostname, e))?;

    let tls_stream = connector
        .connect(domain, stream)
        .await
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

fn parse_certificate(cert_der: &[u8]) -> Result<CertificateDetails, String> {
    let (_, cert) = X509Certificate::from_der(cert_der)
        .map_err(|e| format!("Failed to parse certificate: {}", e))?;

    let subject = cert.subject().to_string();
    let issuer = cert.issuer().to_string();
    let serial_number = hex::encode(&cert.serial.to_bytes_be());
    let version = cert.version.0 as u32;

    let not_before = cert.validity().not_before.to_string();
    let not_after = cert.validity().not_after.to_string();

    let now = chrono::Utc::now().timestamp();
    let expiry_timestamp = cert.validity().not_after.timestamp();
    let is_expired = now > expiry_timestamp;
    let days_until_expiry = (expiry_timestamp - now) / 86400;

    let signature_algorithm = format!("{}", cert.signature_algorithm.algorithm);

    let public_key_algorithm = format!("{}", cert.public_key().algorithm.algorithm);
    let public_key_size = match cert.public_key().algorithm.algorithm.to_string().as_str() {
        "1.2.840.113549.1.1.1" => {
            let key_data_len = cert.public_key().subject_public_key.data.len();
            if key_data_len > 500 {
                Some(4096)
            } else if key_data_len > 300 {
                Some(2048)
            } else if key_data_len > 200 {
                Some(1024)
            } else {
                Some(512)
            }
        }
        "1.2.840.10045.2.1" => {
            let key_data_len = cert.public_key().subject_public_key.data.len();
            if key_data_len > 120 {
                Some(521)
            } else if key_data_len > 80 {
                Some(384)
            } else {
                Some(256)
            }
        }
        _ => None,
    };

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
    // Remove PEM headers and decode base64
    let pem_data = certificate_pem
        .replace("-----BEGIN CERTIFICATE-----", "")
        .replace("-----END CERTIFICATE-----", "")
        .replace("\n", "")
        .replace("\r", "")
        .replace(" ", "");
    
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
