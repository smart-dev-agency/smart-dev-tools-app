# Build Configuration

This document explains the GitHub Actions build configuration for Smart Dev Tools.

## Workflows

### 1. Main Build Workflow (`build.yml`)

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch

**Platforms Built:**
- **macOS**: Intel (x86_64) and Apple Silicon (ARM64)
- **Windows**: Intel/AMD64 (x86_64) and ARM64
- **Linux**: Intel/AMD64 (x86_64)

**Artifacts:**
- All builds are uploaded as GitHub artifacts
- Builds from `main` branch create releases automatically
- Each platform gets its own release with appropriate binaries

### 2. Release Workflow (`release.yml`)

**Triggers:**
- Manual workflow dispatch
- Git tags starting with `v*` (e.g., `v1.0.0`)

**Features:**
- Creates formal releases with version tags
- Organizes artifacts by platform and architecture
- Provides detailed release notes

## Cross-Compilation Setup

### Windows ARM64
- Uses MSVC toolchain with `aarch64-pc-windows-msvc` target
- Native Windows runners handle the compilation

### macOS Universal
- Intel builds use `x86_64-apple-darwin` target
- Apple Silicon builds use `aarch64-apple-darwin` target
- Both run on `macos-latest` runners

## File Structure

```
.github/
├── workflows/
│   ├── build.yml       # Main CI/CD workflow
│   └── release.yml     # Release workflow for tags
.cargo/
└── config.toml         # Cargo cross-compilation config
```

## Artifacts

Each successful build produces:

1. **GitHub Artifacts** (available for 30 days)
   - Platform-specific bundles
   - Installation packages (.dmg, .msi, .deb, .AppImage, etc.)

2. **GitHub Releases** (permanent)
   - Created only from `main` branch pushes
   - Contains all platform binaries
   - Detailed installation instructions

## Local Development

To build locally for different targets:

```bash
# Install target
rustup target add aarch64-apple-darwin

# Build for specific target
yarn tauri build --target aarch64-apple-darwin
```

## Troubleshooting

### Common Issues

1. **Windows ARM64 build fails**: Check MSVC toolchain installation
2. **macOS universal builds**: Make sure both targets are installed

### Dependencies

Make sure these are installed in your development environment:

**macOS:**
```bash
xcode-select --install
```

**Linux:**
```bash
sudo apt-get install libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf
```

**Windows:**
```bash
# Install via Visual Studio Installer:
# - MSVC v143 - VS 2022 C++ x64/x86 build tools
# - MSVC v143 - VS 2022 C++ ARM64 build tools
```

## Environment Variables

The following environment variables are set during builds:

- `GITHUB_TOKEN`: For creating releases
- `PKG_CONFIG_ALLOW_CROSS`: Enables cross-compilation
- `CC_aarch64_unknown_linux_gnu`: Cross-compiler for Linux ARM64
- `CARGO_TARGET_*_LINKER`: Platform-specific linkers
