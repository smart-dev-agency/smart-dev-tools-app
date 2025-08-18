# macOS Installation Guide for Smart Dev Tools

## 🍎 Download the Correct Version

**Choose the right file for your Mac:**

- **Intel Macs**: Download files ending with `_x64.dmg`
- **Apple Silicon Macs (M1/M2/M3)**: Download files ending with `_aarch64.dmg`

**To check your Mac type:**

1. Click Apple menu → About This Mac
2. Look for "Chip" or "Processor"
   - If you see "Apple M1", "Apple M2", or "Apple M3" → Download `_aarch64.dmg`
   - If you see "Intel" → Download `_x64.dmg`

## 🛡️ Bypassing Gatekeeper (Required)

Since this app is not signed or notarized by Apple, you'll need to bypass Gatekeeper. Here are several methods:

### Method 1: Terminal Commands

```bash
# Remove quarantine from the app after installation
sudo xattr -rd com.apple.quarantine /Applications/Smart\ Dev\ Tools\ OSS.app

# Or remove quarantine from the DMG file
sudo xattr -rd com.apple.quarantine /path/to/downloaded.dmg
```

### Method 2: Right-Click Open (Recommended)

1. Download the DMG file
2. **Right-click** the DMG file → Select **"Open"**
3. Click **"Open"** in the warning dialog
4. Mount the DMG and drag the app to Applications
5. In Applications, **right-click** the app → Select **"Open"**
6. Click **"Open"** in the warning dialog

### Method 3: System Settings

1. Try to open the DMG normally (it will be blocked)
2. Go to **System Settings** → **Privacy & Security** → **General**
3. Look for a message about the blocked app
4. Click **"Open Anyway"**

### Method 4: Temporarily Disable Gatekeeper (Advanced)

```bash
# Disable Gatekeeper (requires admin password)
sudo spctl --master-disable

# Install the app, then re-enable Gatekeeper
sudo spctl --master-enable
```

## 🚨 Common Error Messages and Solutions

### "Smart Dev Tools is damaged and can't be opened"

- **Cause**: Gatekeeper blocking unsigned app
- **Solution**: Use Method 1 or 3 above

### "Cannot verify that this app is free from malware"

- **Cause**: App is not notarized
- **Solution**: Use Method 1 (right-click → Open)

### App opens but immediately crashes

- **Cause**: Wrong architecture (Intel app on Apple Silicon or vice versa)
- **Solution**: Download the correct version for your Mac type

### "Smart Dev Tools can't be opened because Apple cannot check it for malicious software"

- **Cause**: Standard Gatekeeper warning
- **Solution**: Use any of the methods above

## 🔍 Verification

After successful installation:

1. The app should appear in Applications folder
2. When you first launch it, you might see one more warning - click "Open"
3. The app should start normally

## 🛠️ If You Still Have Issues

1. **Check your Mac architecture** matches the downloaded file
2. **Try a different method** from the list above
3. **Check Console.app** for error messages (Applications → Utilities → Console)
4. **Verify the download** wasn't corrupted by re-downloading

## 🤔 Why These Steps Are Necessary

This app is built using open-source tools and distributed through GitHub. To avoid the $99/year Apple Developer fee and complex notarization process, the app is unsigned. This is safe for open-source software where you can verify the source code, but requires these extra steps to install.

## 🔒 Security Note

You can always verify the safety of this app by:

1. Checking the source code in this repository
2. Building it yourself using `yarn tauri build`
3. Comparing checksums of releases

The unsigned status doesn't make the app unsafe - it just means Apple hasn't verified it through their paid program.
