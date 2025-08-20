# Changelog

## [1.6.2] - 2025-08-19

### Fixed

- Build fixes for macOS and Tauri
- Version synchronization in package.json and tauri.conf.json
- Minor improvements in icon generation and cleanup of temporary files

### Updated

- Regenerated icons using square source for multiplatform compatibility
- Documentation and changelog updated to reflect recent changes

## [1.6.0] - 2025-08-17

### Updated

- **Application Icons**: Regenerated all application icons from updated source
  - Regenerated macOS app icons (icon.icns) 
  - Updated Windows app icons (icon.ico)
  - Refreshed PNG icons for all platforms (32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024)
  - Updated Windows Store logos (Square30x30, Square44x44, Square71x71, etc.)
  - Refreshed Android adaptive icons (all mipmap densities)
  - Updated iOS app icons (all required sizes and scales)
  - Ensured consistent branding across all platforms

## [1.5.0] - 2025-07-25

### Added

- **Certificate Analyzer**: New security tool for analyzing X.509 certificates
  - Real certificate parsing using node-forge library
  - Support for PEM and DER formats
  - Comprehensive certificate information display (subject, issuer, validity, etc.)
  - Security assessment and validation status
  - Cryptographic details (signature algorithm, public key info)
  - Fingerprint generation (SHA-256, SHA-1, MD5)
  - Extension parsing (Key Usage, Subject Alt Names, Basic Constraints, etc.)
  - Export functionality (copy, download, JSON export)
  - Dark mode support

- **RSA Key Analyzer**: New security tool for analyzing RSA keys
  - Support for both private and public RSA keys
  - PEM format parsing and validation
  - Key component extraction (modulus, exponents, primes)
  - Security level assessment based on key size
  - NIST compliance checking
  - Public key extraction from private keys
  - Key fingerprint generation
  - Security recommendations based on key properties
  - Export functionality and dark mode support

### Improved

- **JWT/Token Decoder**: Enhanced to support multiple token formats
  - Automatic format detection (standard JWT vs Base64-encoded JSON)
  - Support for Base64-encoded JSON tokens (like server certificate bundles)
  - Improved error handling and user feedback
  - Better token type identification
  - Enhanced payload analysis for different token structures

- **Security Tools Category**: Expanded with comprehensive certificate and key analysis tools
  - TLS Certificate Checker (existing)
  - Certificate Analyzer (new)
  - RSA Key Analyzer (new)

- **Certificate Extensions Parsing**: Advanced parsing for complex certificate extensions
  - Authority Information Access with URL extraction
  - Certificate Policies with OID mapping
  - CRL Distribution Points
  - Subject and Authority Key Identifiers
  - Improved handling of binary extension data

### Technical Improvements

- **Dependencies**: Added node-forge library for robust cryptographic operations
- **TypeScript**: Enhanced type definitions for better development experience
- **Error Handling**: Improved error messages and validation across security tools

## [1.4.1] - 2025-07-06

### FIX

* Fix base64 to hex converter

## [1.4.0] - 2025-06-28

### Added

- **Home Component**: New welcome screen with application overview and usage instructions
  - Comprehensive introduction to Smart Dev Tools
  - Step-by-step usage guide for new users
  - Useful tips about privacy, performance, and features
  - Responsive design with dark mode support

### Improved

- **Dark Mode Support**: Enhanced dark mode compatibility across all components

  - TLS Certificate Checker: Improved tabs and raw certificate display in dark mode
  - Update Notification: Better contrast and readability in dark mode
  - Consistent color schemes across all UI elements
- **User Experience**:

  - Home button prominently placed at top of sidebar
  - Simplified release notes in GitHub releases

## [1.3.1] - 2025-06-28

### FIX

* Fix component selector

## [1.3.0] - 2025-06-28

### Added

* Calculate strings hasher
* Check TSL Certificates Info

## [1.2.0] - 2025-06-17

### Added

- **Text Diff Component**: Compare two texts with character-by-character highlighting
  - Side-by-side comparison view
  - "Ignore Whitespace" and "Ignore Case" filters
  - Real-time difference statistics
  - Color-coded difference indicators

## [1.1.0] - 2025-06-10

### Added

- **JWT Decoder**: Decode and validate JSON Web Tokens
- **File Hasher**: Generate file hashes (MD5, SHA-1, SHA-256)
- **QR Code Tool**: Generate and decode QR codes
- **Markdown Editor**: Live preview markdown editor

### Improved

- Enhanced UI consistency across all components
- Better responsive design for mobile devices

## [1.0.0] - 2025-06-01

### Added

- **Base64 Converter**: Encode and decode Base64 strings
- **Date Converter**: Convert between different date formats
- **Text Analyzer**: Analyze text statistics (words, characters, lines)
- **Regex Tester**: Test regular expressions with live results
- Modern sidebar navigation
- Dark/light theme support
- Tauri desktop application framework
