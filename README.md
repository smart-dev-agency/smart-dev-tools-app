# 🛠️ Smart Dev Tools

A comprehensive suite of development tools in a modern and efficient desktop application, built with **Tauri**, **Vue 3**, and **TypeScript**.

## ✨ Features

**Smart Dev Tools** is an all-in-one application that provides essential tools for developers, designed to be fast, secure, and easy to use.

### 🌐 Web Tools

- **JWT Decoder** - Securely decode and analyze JWT tokens
- **Base64 Converter** - Encode and decode text to/from Base64
- **QR Generator** - Generate custom QR codes from text

### 📝 Text Tools

- **Regex Tester** - Test and validate regular expressions in real-time
- **Markdown Editor** - Markdown editor with live preview
- **Text Analyzer** - Analyze detailed text metrics (words, characters, etc.)

### 📅 Date Tools

- **Date Converter** - Convert between different date formats and timestamps

### 📁 File Tools

- **File Hasher** - Generate cryptographic hashes (MD5, SHA-1, SHA-256) for files

## 🚀 Technologies

- **Frontend**: Vue 3 + TypeScript + Vite
- **Backend**: Rust + Tauri
- **Styling**: SCSS + CSS Grid
- **Key Libraries**:
  - Monaco Editor (code editor)
  - CodeMirror (specialized editor)
  - Marked (Markdown processing)
  - CryptoJS (cryptographic functions)
  - QRCode.js (QR code generation)

## 📦 Installation

### Download Pre-built Binaries (Recommended)

Pre-built binaries are automatically generated for all platforms:

1. Visit the [Releases page](https://github.com/your-username/smart-dev-tools-app/releases)
2. Download the appropriate version for your platform:
   - **macOS Intel**: Files ending with `_x64.dmg`
   - **macOS Apple Silicon (M1/M2/M3)**: Files ending with `_aarch64.dmg`
   - **Windows**: Files ending with `_x64-setup.exe` or `_x64_en-US.msi`
   - **Linux**: Files ending with `.deb`, `.rpm`, or `.AppImage`
3. Install the downloaded package following your platform's standard installation process

**⚠️ Important for macOS users**: These apps are unsigned and require bypassing Gatekeeper. See our detailed [macOS Installation Guide](MACOS_INSTALLATION.md) for step-by-step instructions.

### Build from Source

#### Prerequisites

- **Node.js** (version 16 or higher)
- **Rust** (latest stable version)
- **Yarn** (recommended) or npm

### Clone the repository

```bash
git clone https://github.com/your-username/smart-dev-tools-app.git
cd smart-dev-tools-app
```

### Install dependencies

```bash
# Install frontend dependencies
yarn install

# Or with npm
npm install
```

### Setup Rust/Tauri environment

```bash
# Install Tauri CLI
cargo install tauri-cli

# Or with npm
npm install -g @tauri-apps/cli
```

## 🏃‍♂️ Development

### Development mode

```bash
# Run in development mode
yarn tauri dev

# Or with npm
npm run tauri dev
```

### Build for production

```bash
# Build the application
yarn tauri build

# Or with npm
npm run tauri build
```

### Available scripts

```bash
yarn dev          # Run frontend in development mode
yarn build        # Build frontend for production
yarn preview      # Preview production build
yarn tauri dev    # Run Tauri application in development
yarn tauri build  # Build Tauri application for production
```

## 🏗️ Project Structure

```
smart-dev-tools-app/
├── src/                          # Frontend source code
│   ├── App.vue                   # Main component
│   ├── main.ts                   # Entry point
│   └── shared/
│       ├── componentes/          # Vue components
│       │   ├── Base64Converter.vue
│       │   ├── DateConverter.vue
│       │   ├── FileHasher.vue
│       │   ├── JwtDecode.vue
│       │   ├── MarkdownEditor.vue
│       │   ├── QrCodeTool.vue
│       │   ├── RegexTester.vue
│       │   └── TextAnalyzer.vue
│       └── styles/               # SCSS styles
├── src-tauri/                    # Tauri source code (Rust)
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs
│   ├── Cargo.toml
│   └── tauri.conf.json          # Tauri configuration
├── public/                       # Static files
├── package.json
└── vite.config.ts               # Vite configuration
```

## 🎯 Technical Features

### Security
- **CSP (Content Security Policy)** configured
- Local data processing (no data sent to external servers)
- Input validation and sanitization

### Performance
- **Optimized bundle size** thanks to Tauri
- **Hot reload** in development
- **Lazy loading** of components

### Interface
- **Responsive design** with CSS Grid
- **Navigable sidebar** with search
- **Intuitive categorization** of tools
- **Modern and accessible** theme

### Automated Builds
- **Cross-platform compilation** via GitHub Actions
- **Multi-architecture support**: Intel, ARM64, Apple Silicon
- **Automatic releases** on main branch updates
- **Artifact storage** for easy distribution

## 🔧 Configuration

### Tauri Configuration

The `src-tauri/tauri.conf.json` file contains the main configuration:

```json
{
  "productName": "Smart Dev Tools",
  "version": "1.0.0",
  "identifier": "com.smartdev.smartdevtools"
}
```

## 🤝 Contributing

1. **Fork** the repository
2. Create a **feature branch** (`git checkout -b feature/new-tool`)
3. **Commit** your changes (`git commit -am 'Add new tool'`)
4. **Push** to the branch (`git push origin feature/new-tool`)
5. Open a **Pull Request**

### Adding a new tool

1. Create a new component in `src/shared/componentes/`
2. Import and register the component in `App.vue`
3. Add the tool to the `categories` array with its corresponding category
4. Make sure to follow existing design patterns

## 📋 Roadmap

- [ ] **Color Tools** (Picker, Palettes, Conversion)
- [ ] **Network Tools** (IP Info, Port Scanner)
- [ ] **JSON Tools** (Formatter, Validator, Minifier)
- [ ] **SQL Tools** (Formatter, Query Builder)
- [ ] **Custom plugins**
- [ ] **Cloud synchronization**

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for more details.

## 👨‍💻 Author

Developed by **Smart Dev Agency**

---

## 🆘 Support

If you encounter any issues or have suggestions:

1. Check [existing Issues](https://github.com/your-username/smart-dev-tools-app/issues)
2. Create a [new Issue](https://github.com/your-username/smart-dev-tools-app/issues/new) if needed
3. Provide details about your operating system, app version, and steps to reproduce the problem

---

**Made with ❤️ for the developer community!**
