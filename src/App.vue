<template>
  <div class="main-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <input class="search-input" type="text" v-model="searchText" placeholder="Search..." />
        <button class="expand-btn" @click="toggleAllCategories" title="Expand/Collapse categories">
          <span>{{ allExpanded ? "▲" : "▼" }}</span>
        </button>
        <button
          class="update-btn"
          @click="forceCheckForUpdates"
          :disabled="isCheckingUpdates"
          :title="isCheckingUpdates ? 'Checking for updates...' : 'Check for updates'"
        >
          <span>{{ isCheckingUpdates ? "⏳" : "🔄" }}</span>
        </button>
      </div>
      <div class="sidebar-scroll">
        <div v-for="category in filteredCategories" :key="category.name" class="category">
          <div class="category-title" @click="toggleCategory(category.name)">
            <span>{{ category.name }}</span>
            <span>{{ isCategoryExpanded(category.name) ? "▼" : "▶" }}</span>
          </div>
          <div v-show="isCategoryExpanded(category.name)" class="category-items">
            <button
              v-for="item in category.items"
              :key="item.key"
              :class="['sidebar-btn', { active: activeKey === item.key }]"
              @click="onSelect(item.key as ComponentKey)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
      </div>
    </aside>
    <section class="component-viewer row m-0 g-0">
      <component :is="currentComponent" />
    </section>
    <UpdateNotification
      v-if="updateInfo"
      v-model="showUpdateNotification"
      :update-info="updateInfo"
      @ignore-version="onIgnoreVersion"
      @remind-later="onRemindLater"
    />
  </div>
</template>

<script setup lang="ts">
import Base64Converter from "@/shared/componentes/Base64Converter.vue";
import DateConverter from "@/shared/componentes/DateConverter.vue";
import FileHasher from "@/shared/componentes/FileHasher.vue";
import JwtDecode from "@/shared/componentes/JwtDecode.vue";
import MarkdownEditor from "@/shared/componentes/MarkdownEditor.vue";
import QrCodeTool from "@/shared/componentes/QrCodeTool.vue";
import RegexTester from "@/shared/componentes/RegexTester.vue";
import StringHasher from "@/shared/componentes/StringHasher.vue";
import TextAnalyzer from "@/shared/componentes/TextAnalyzer.vue";
import TextDiff from "@/shared/componentes/TextDiff.vue";
import TlsCertificateChecker from "@/shared/componentes/TlsCertificateChecker.vue";
import { computed, onMounted, ref } from "vue";
import UpdateNotification from "./shared/componentes/UpdateNotification.vue";
import type { UpdateInfo } from "./shared/services/updateService";
import { updateService } from "./shared/services/updateService";

const componentMap = {
  "jwt-decode": JwtDecode,
  "date-converter": DateConverter,
  "base64-converter": Base64Converter,
  "file-hasher": FileHasher,
  "string-hasher": StringHasher,
  "tls-certificate-checker": TlsCertificateChecker,
  "qr-code-tool": QrCodeTool,
  "markdown-editor": MarkdownEditor,
  "regex-tester": RegexTester,
  "text-analyzer": TextAnalyzer,
  "text-diff": TextDiff,
};

type ComponentKey = keyof typeof componentMap;

const categories = [
  {
    name: "Web Tools",
    items: [
      { key: "jwt-decode", label: "JWT Decode" },
      { key: "base64-converter", label: "Base64 Converter" },
      { key: "qr-code-tool", label: "QR Generator" },
    ],
  },
  {
    name: "Security Tools",
    items: [{ key: "tls-certificate-checker", label: "TLS Certificate Checker" }],
  },
  {
    name: "Text Tools",
    items: [
      { key: "regex-tester", label: "Regex Tester" },
      { key: "markdown-editor", label: "Markdown Editor" },
      { key: "text-analyzer", label: "Text Analyzer" },
      { key: "text-diff", label: "Text Diff" },
      { key: "string-hasher", label: "String Hasher" },
    ],
  },
  {
    name: "Date Tools",
    items: [{ key: "date-converter", label: "Date Converter" }],
  },
  {
    name: "File Tools",
    items: [{ key: "file-hasher", label: "File Hasher" }],
  },
];

const activeKey = ref<ComponentKey>("jwt-decode");
const currentComponent = computed(() => componentMap[activeKey.value]);
const searchText = ref("");
const expandedCategories = ref<Set<string>>(new Set(categories.map((cat) => cat.name)));
const allExpanded = ref(true);

const filteredCategories = computed(() => {
  if (!searchText.value) return categories;
  const searchLower = searchText.value.toLowerCase();
  return categories.filter(
    (category) => category.name.toLowerCase().includes(searchLower) || category.items.some((item) => item.label.toLowerCase().includes(searchLower))
  );
});

function toggleCategory(categoryName: string) {
  if (expandedCategories.value.has(categoryName)) {
    expandedCategories.value.delete(categoryName);
  } else {
    expandedCategories.value.add(categoryName);
  }
  updateAllExpandedState();
}

function toggleAllCategories() {
  allExpanded.value = !allExpanded.value;
  if (allExpanded.value) {
    categories.forEach((cat) => expandedCategories.value.add(cat.name));
  } else {
    expandedCategories.value.clear();
  }
}

function updateAllExpandedState() {
  allExpanded.value = categories.every((cat) => expandedCategories.value.has(cat.name));
}

function isCategoryExpanded(categoryName: string): boolean {
  return expandedCategories.value.has(categoryName);
}

function onSelect(key: ComponentKey) {
  activeKey.value = key;
}

// Update system
const updateInfo = ref<UpdateInfo | null>(null);
const showUpdateNotification = ref(false);
const isCheckingUpdates = ref(false);
const isInitialCheck = ref(true);
const debugMessage = ref("Click the update button to test");

async function checkForUpdates(): Promise<void> {
  if (isInitialCheck.value) {
    isCheckingUpdates.value = true;
  }

  try {
    // Force check for updates at startup - only show notification if update is available
    const update = await updateService.forceCheckForUpdates();
    if (update.hasUpdate && !updateService.isVersionIgnored(update.latestVersion)) {
      updateInfo.value = update;
      showUpdateNotification.value = true;
    }
    // Silent if no updates available (no alert shown)
  } catch (error) {
    console.error("Error checking for updates:", error);
    // In case of error at startup, try silent verification
    try {
      const update = await updateService.checkForUpdatesIfNeeded();
      if (update && update.hasUpdate && !updateService.isVersionIgnored(update.latestVersion)) {
        updateInfo.value = update;
        showUpdateNotification.value = true;
      }
    } catch (fallbackError) {
      console.error("Fallback update check also failed:", fallbackError);
    }
  } finally {
    if (isInitialCheck.value) {
      isCheckingUpdates.value = false;
      isInitialCheck.value = false;
    }
  }
}

async function forceCheckForUpdates(): Promise<void> {
  if (isCheckingUpdates.value) return;

  debugMessage.value = "Button was clicked! Function started...";
  isCheckingUpdates.value = true;

  try {
    debugMessage.value = "Getting current version...";
    const currentVersion = await updateService.getCurrentVersion();

    debugMessage.value = `Current version: ${currentVersion}. Getting latest release...`;
    const latestRelease = await updateService.getLatestRelease();

    debugMessage.value = `Latest release: ${latestRelease.tag_name}. Doing comparison...`;
    const update = await updateService.forceCheckForUpdates();

    debugMessage.value = `Comparison done. Has update: ${update.hasUpdate}`;

    if (update.hasUpdate) {
      updateInfo.value = update;
      showUpdateNotification.value = true;
      debugMessage.value = "Update available! Showing notification.";
    } else {
      // Show notification even when no updates are available for manual checks
      updateInfo.value = update;
      showUpdateNotification.value = true;
      debugMessage.value = "You have the latest version available. Showing confirmation.";
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugMessage.value = `Error: ${errorMessage}`;
  } finally {
    isCheckingUpdates.value = false;
  }
}

function onIgnoreVersion(): void {
  showUpdateNotification.value = false;
}

function onRemindLater(): void {
  showUpdateNotification.value = false;
}

// Check for updates when the app starts
onMounted(() => {
  // Verificar actualizaciones más rápidamente al inicio
  setTimeout(checkForUpdates, 1000);
});
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--card-bg);
}

.sidebar {
  width: 280px;
  min-width: 240px;
  max-width: 400px;
  background: var(--sidebar-bg);
  color: var(--sidebar-color);
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid var(--sidebar-border);
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--sidebar-bg);
  min-height: 60px;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--input-color);
  font-size: 1em;
  outline: none;
  transition: all 0.25s ease;
  box-shadow: var(--input-shadow);
  height: 36px;
  margin: 0;
  display: block;
  width: calc(100% - 44px);
}

.search-input:focus {
  border-color: var(--button-bg);
  box-shadow: var(--input-focus-shadow);
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--button-bg);
  color: var(--button-color);
  border: none;
  border-radius: 8px;
  width: 36px;
  height: 36px;
  font-size: 1.2em;
  cursor: pointer;
  transition: background 0.2s;
}

.expand-btn:hover {
  background: var(--button-active-bg);
}

.update-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--button-bg);
  color: var(--button-color);
  border: none;
  border-radius: 8px;
  width: 36px;
  height: 36px;
  font-size: 1.2em;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.8;
}

.update-btn:hover:not(:disabled) {
  background: var(--button-active-bg);
  opacity: 1;
}

.update-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.sidebar-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px 16px;
  margin-right: -8px;
  padding-right: calc(16px + 8px);
}

.category {
  margin-bottom: 18px;
}

.category-title {
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 1.1em;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.category-title:hover {
  background-color: var(--button-bg);
}

.category-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.sidebar-btn {
  width: 100%;
  text-align: left;
  padding: 0.7em 1em;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--button-color);
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, border 0.2s, color 0.2s;
}

.sidebar-btn.active,
.sidebar-btn:hover {
  background: var(--button-bg);
  color: var(--button-color);
  border: 1px solid #24c8db;
}

.component-viewer {
  height: 100%;
  overflow-y: auto;
  background: var(--card-bg);
  color: var(--card-color);
  align-items: flex-start;
  margin-right: -8px;
  width: 100%;
}

.sidebar-scroll::-webkit-scrollbar,
.component-viewer::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.sidebar-scroll::-webkit-scrollbar-track,
.component-viewer::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scroll::-webkit-scrollbar-thumb,
.component-viewer::-webkit-scrollbar-thumb {
  background: var(--button-bg);
  border-radius: 4px;
}

.sidebar-scroll::-webkit-scrollbar-thumb:hover,
.component-viewer::-webkit-scrollbar-thumb:hover {
  background: var(--button-active-bg);
}

.sidebar-scroll,
.component-viewer {
  scrollbar-width: thin;
  scrollbar-color: var(--button-bg) transparent;
}
</style>

<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
  color: #0f0f0f;
  background-color: #f6f6f6;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
  --button-color: #0f0f0f;
  --button-bg: #ffffff;
  --button-active-bg: #e8e8e8;
  --input-color: #0f0f0f;
  --input-bg: #ffffff;
  --input-border: #e0e0e0;
  --card-bg: #fff;
  --card-color: #0f0f0f;
  --sidebar-bg: #f6f6f6;
  --sidebar-color: #0f0f0f;
  --sidebar-border: #e0e0e0;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body,
#app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

@media (prefers-color-scheme: dark) {
  :root {
    color: #f6f6f6;
    background-color: #2f2f2f;
    --button-color: #ffffff;
    --button-bg: #0f0f0f98;
    --button-active-bg: #0f0f0f69;
    --input-color: #ffffff;
    --input-bg: #232323;
    --input-border: #4446;
    --card-bg: #232323;
    --card-color: #f6f6f6;
    --sidebar-bg: #18191a;
    --sidebar-color: #fff;
    --sidebar-border: #2226;
  }
}
</style>
