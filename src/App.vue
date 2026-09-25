<template>
  <div class="app-shell" :class="{ collapsed }" @dragover="preventFileNavigation" @drop="preventFileNavigation">
    <aside class="app-sidebar" aria-label="Tool navigation">
      <div class="brand">
        <span class="brand-mark"><Icon name="tools" /></span>
        <div v-if="!collapsed"><strong>Smart Dev Tools</strong><span>YOUR DAILY WORKSPACE</span></div>
      </div>
      <div class="nav-search" v-if="!collapsed">
        <Icon name="search" /><input
          ref="searchInput"
          v-model="query"
          aria-label="Search tools"
          placeholder="Find a tool…"
          @keydown.enter.prevent="openFirst"
          @keydown.esc="query = ''"
        /><kbd v-if="!query">{{ shortcut }}</kbd
        ><button v-else class="clear-search" aria-label="Clear search" @click="query = ''">
          <Icon name="close" />
        </button>
      </div>
      <button v-else class="nav-item" title="Find a tool" aria-label="Find a tool" @click="focusSearch">
        <Icon name="search" />
      </button>
      <nav class="nav-scroll">
        <button
          class="nav-item home-link"
          :class="{ selected: active === 'home' }"
          :aria-current="active === 'home' ? 'page' : undefined"
          title="Overview"
          @click="select('home')"
        >
          <Icon name="home" /><span v-if="!collapsed">Overview</span>
        </button>
        <section v-if="favoriteTools.length && !query && !collapsed" class="nav-group">
          <h2>Favorites</h2>
          <button v-for="tool in favoriteTools" :key="tool.id" class="nav-item" :class="{ selected: active === tool.id }" @click="select(tool.id)">
            <span class="tool-symbol">{{ tool.symbol }}</span
            ><span>{{ tool.name }}</span>
          </button>
        </section>
        <section v-for="group in groups" :key="group" class="nav-group">
          <h2 v-if="!collapsed">{{ group }}</h2>
          <button
            v-for="tool in filtered.filter((item) => item.group === group)"
            :key="tool.id"
            class="nav-item"
            :class="{ selected: active === tool.id }"
            :aria-current="active === tool.id ? 'page' : undefined"
            :title="tool.name"
            :aria-label="collapsed ? tool.name : undefined"
            @click="select(tool.id)"
          >
            <span class="tool-symbol">{{ tool.symbol }}</span
            ><span v-if="!collapsed">{{ tool.name }}</span>
          </button>
        </section>
        <p v-if="!filtered.length" class="search-empty" role="status">No tools match “{{ query }}”.</p>
      </nav>
      <div class="sidebar-bottom">
        <button
          class="nav-item"
          :title="collapsed ? 'Expand navigation' : 'Collapse navigation'"
          :aria-label="collapsed ? 'Expand navigation' : 'Collapse navigation'"
          :aria-expanded="!collapsed"
          @click="collapsed = !collapsed"
        >
          <Icon name="menu" /><span v-if="!collapsed">Collapse navigation</span></button
        ><span v-if="!collapsed" class="version">Smart Dev Tools · v{{ version }}</span>
      </div>
    </aside>
    <div class="app-main">
      <header class="app-toolbar">
        <div class="breadcrumb">
          <span>{{ activeTool?.group || "Workspace" }}</span
          ><span class="breadcrumb-slash">/</span><strong>{{ activeTool?.name || "Overview" }}</strong>
        </div>
        <div class="toolbar-actions">
          <button
            v-if="activeTool"
            class="quiet-button favorite-toggle"
            :class="{ starred: favorites.includes(activeTool.id) }"
            :aria-label="favorites.includes(activeTool.id) ? 'Remove from favorites' : 'Add to favorites'"
            :aria-pressed="favorites.includes(activeTool.id)"
            @click="toggleFavorite(activeTool.id)"
          >
            <Icon name="star" /></button
          ><label class="sr-only" for="app-theme">Appearance</label
          ><select id="app-theme" v-model="theme">
            <option value="system">System theme</option>
            <option value="light">Light theme</option>
            <option value="dark">Dark theme</option></select
          ><button class="quiet-button" title="Clear session data" aria-label="Clear session data" @click="clearDialog?.showModal()">
            <Icon name="shield" />
          </button>
        </div>
      </header>
      <main ref="workspace" class="workspace" tabindex="-1">
        <Home v-if="active === 'home'" :favorites="favorites" :recent="recent" @select="select" @favorite="toggleFavorite" @search="focusSearch" />
        <!-- Fixed catalog bounds the cache; heavy editors dispose on deactivation, files are not retained. -->
        <KeepAlive :key="session" :max="tools.length"
          ><component :is="components[active]" v-if="active !== 'home'" :key="active" :mode="active"
        /></KeepAlive>
      </main>
      <footer class="statusbar">
        <span
          ><span class="status-dot"></span
          >{{
            active === "tls-certificate-checker" ? "TLS requests run only when you check a server" : "Inputs stay on your device · session only"
          }}</span
        ><span v-if="updateError" class="status-error" role="status">{{ updateError }}</span
        ><button v-if="native" @click="checkUpdates(true)" :disabled="checking">
          <Icon name="refresh" />{{ checking ? "Checking…" : "Check for updates" }}</button
        ><span v-else>Browser preview</span>
      </footer>
    </div>
    <dialog ref="clearDialog" aria-labelledby="clear-title">
      <h2 id="clear-title">Clear session data?</h2>
      <p class="muted">
        This clears every tool’s input and results and stops background tasks. Export anything you want to keep. Favorites and appearance are kept.
      </p>
      <form method="dialog" class="action-row">
        <button class="base-button button-secondary" value="cancel">Keep working</button
        ><button class="base-button button-danger" value="clear" @click="clearSession">Clear session</button>
      </form>
    </dialog>
    <UpdateNotification
      v-if="updateInfo"
      v-model="showUpdate"
      :update-info="updateInfo"
      @ignore-version="showUpdate = false"
      @remind-later="showUpdate = false"
    />
  </div>
</template>

<script setup lang="ts">
import { isTauri } from "@tauri-apps/api/core";
import { computed, defineAsyncComponent, h, nextTick, onBeforeUnmount, onMounted, provide, ref, watch, type Component } from "vue";
import { version } from "../package.json";
import Home from "./shared/componentes/Home.vue";
import Icon from "./shared/componentes/Icon.vue";
import { preventFileNavigation } from "./shared/lib/fileDrop";
import { searchTools, tools, type ToolId } from "./shared/lib/tools";
import { updateService, type UpdateInfo } from "./shared/services/updateService";

const loaders: Record<ToolId, () => Promise<Component>> = {
  "string-hasher": () => import("./shared/componentes/StringHasher.vue"),
  "file-hasher": () => import("./shared/componentes/FileHasher.vue"),
  "jwt-decode": () => import("./shared/componentes/JwtDecode.vue"),
  "rsa-key-analyzer": () => import("./shared/componentes/RSAKeyAnalyzer.vue"),
  "certificate-analyzer": () => import("./shared/componentes/CertificateAnalyzer.vue"),
  "tls-certificate-checker": () => import("./shared/componentes/TlsCertificateChecker.vue"),
  "base64-converter": () => import("./shared/componentes/Base64Converter.vue"),
  "text-diff": () => import("./shared/componentes/TextDiff.vue"),
  "regex-tester": () => import("./shared/componentes/RegexTester.vue"),
  "markdown-editor": () => import("./shared/componentes/MarkdownEditor.vue"),
  "text-analyzer": () => import("./shared/componentes/TextAnalyzer.vue"),
  "date-converter": () => import("./shared/componentes/DateConverter.vue"),
  "qr-code-tool": () => import("./shared/componentes/QrCodeTool.vue"),
  json: () => import("./shared/componentes/UtilityWorkbench.vue"),
  url: () => import("./shared/componentes/UtilityWorkbench.vue"),
  uuid: () => import("./shared/componentes/UtilityWorkbench.vue"),
  hmac: () => import("./shared/componentes/UtilityWorkbench.vue"),
};
const components = Object.fromEntries(
  Object.entries(loaders).map(([id, loader]) => [
    id,
    defineAsyncComponent({
      loader,
      delay: 120,
      timeout: 15_000,
      loadingComponent: {
        render: () => h("p", { class: "tool-view", role: "status" }, "Loading workspace…"),
      },
      errorComponent: {
        render: () => h("p", { class: "tool-view error", role: "alert" }, "This tool could not load. Please restart the app to retry."),
      },
      onError(_error, retry, fail, attempts) {
        if (attempts < 2) retry();
        else fail();
      },
    }),
  ]),
) as Record<ToolId, Component>;
const UpdateNotification = defineAsyncComponent(() => import("./shared/componentes/UpdateNotification.vue"));
let preferences: Record<string, unknown> = {};
try {
  const value = JSON.parse(localStorage.getItem("ui-preferences") || "{}");
  if (value && typeof value === "object") preferences = value;
} catch {
  /* A damaged preference must not prevent startup. */
}
const isToolId = (value: unknown): value is ToolId => tools.some((tool) => tool.id === value);
const validIds = (value: unknown): ToolId[] => (Array.isArray(value) ? [...new Set(value.filter(isToolId))] : []);
const active = ref<ToolId | "home">("home"),
  query = ref(""),
  collapsed = ref(preferences.collapsed === true),
  session = ref(0);
const favorites = ref(validIds(preferences.favorites)),
  recent = ref(validIds(preferences.recent).slice(0, 6));
const theme = ref<"system" | "light" | "dark">(preferences.theme === "light" || preferences.theme === "dark" ? preferences.theme : "system");
const activeTool = computed(() => tools.find((tool) => tool.id === active.value));
provide("toolMeta", activeTool);
const filtered = computed(() => searchTools(query.value)),
  groups = computed(() => [...new Set(filtered.value.map((tool) => tool.group))]);
const favoriteTools = computed(() => tools.filter((tool) => favorites.value.includes(tool.id)));
const searchInput = ref<HTMLInputElement>(),
  workspace = ref<HTMLElement>(),
  clearDialog = ref<HTMLDialogElement>();
const shortcut = navigator.platform.includes("Mac") ? "⌘ K" : "Ctrl K";
const native = isTauri(),
  colorQuery = window.matchMedia("(prefers-color-scheme: dark)");
function applyTheme() {
  document.documentElement.dataset.theme = theme.value === "system" ? (colorQuery.matches ? "dark" : "light") : theme.value;
  document.documentElement.style.colorScheme = document.documentElement.dataset.theme;
  if (native)
    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => getCurrentWindow().setTheme(theme.value === "system" ? null : theme.value))
      .catch(() => {});
}
watch(theme, applyTheme, { immediate: true });
watch(
  [theme, collapsed, favorites, recent],
  () => {
    try {
      localStorage.setItem(
        "ui-preferences",
        JSON.stringify({
          theme: theme.value,
          collapsed: collapsed.value,
          favorites: favorites.value,
          recent: recent.value,
        }),
      );
    } catch {
      /* Preferences are optional; inputs never go to storage. */
    }
  },
  { deep: true },
);
colorQuery.addEventListener("change", applyTheme);
function select(id: ToolId | "home") {
  active.value = id;
  query.value = "";
  if (id !== "home") recent.value = [id, ...recent.value.filter((item) => item !== id)].slice(0, 6);
  nextTick(() => workspace.value?.scrollTo(0, 0));
}
function toggleFavorite(id: ToolId) {
  favorites.value = favorites.value.includes(id) ? favorites.value.filter((item) => item !== id) : [...favorites.value, id];
}
async function focusSearch() {
  collapsed.value = false;
  await nextTick();
  searchInput.value?.focus();
  searchInput.value?.select();
}
function openFirst() {
  if (filtered.value[0]) {
    select(filtered.value[0].id);
    workspace.value?.focus();
  }
}
function keydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    focusSearch();
  }
}
function clearSession() {
  session.value++;
  active.value = "home";
  query.value = "";
}
const checking = ref(false),
  updateInfo = ref<UpdateInfo | null>(null),
  showUpdate = ref(false),
  updateError = ref("");
async function checkUpdates(force = false) {
  if (!native || checking.value) return;
  checking.value = true;
  updateError.value = "";
  try {
    const update = await (force ? updateService.forceCheckForUpdates() : updateService.checkForUpdatesIfNeeded());
    if (update && (force || (update.hasUpdate && !updateService.isVersionIgnored(update.latestVersion)))) {
      updateInfo.value = update;
      showUpdate.value = true;
    }
  } catch {
    if (force) updateError.value = "Update check failed. Try again later.";
  } finally {
    checking.value = false;
  }
}
onMounted(() => {
  window.addEventListener("keydown", keydown);
  checkUpdates();
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", keydown);
  colorQuery.removeEventListener("change", applyTheme);
});
</script>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: 236px minmax(0, 1fr);
  height: 100%;
}
.app-shell.collapsed {
  grid-template-columns: 64px minmax(0, 1fr);
}
.app-sidebar {
  background: var(--sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 20px 22px;
  height: 84px;
  flex-shrink: 0;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 32px;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 8px;
  flex-shrink: 0;
}
.brand strong {
  font-size: 14px;
  letter-spacing: -0.03em;
  font-weight: 650;
}
.brand div > span {
  display: block;
  font-size: 8px;
  letter-spacing: 0.12em;
  margin-top: 2px;
  color: var(--muted);
}
.nav-search {
  display: flex;
  align-items: center;
  margin: 0 14px 14px;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  padding: 0 9px;
  color: var(--muted);
}
.nav-search:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.nav-search input {
  width: 100%;
  padding: 8px 0;
  font-size: 12px;
  border: none;
  outline: none;
  background: transparent;
}
kbd {
  font: 9px var(--mono);
  white-space: nowrap;
  color: var(--muted);
}
.clear-search {
  border: 0;
  background: none;
  color: inherit;
  padding: 0;
}
.nav-scroll {
  overflow-y: auto;
  padding: 0 12px 14px;
  flex: 1;
}
.nav-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 5px 9px;
  color: var(--muted);
  font-size: 12px;
  border: none;
  border-radius: 6px;
  text-align: left;
  background: none;
  min-height: 34px;
}
.nav-item:hover {
  background: var(--surface-alt);
  color: var(--text);
}
.nav-item.selected {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.nav-item.selected .tool-symbol {
  color: inherit;
}
.home-link {
  margin-bottom: 18px;
  padding-left: 13px;
}
.home-link svg {
  margin-right: 4px;
}
.nav-group {
  margin-bottom: 18px;
}
.nav-group h2 {
  font-size: 10px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 0 11px;
  margin: 0 0 5px;
  font-weight: 600;
}
.search-empty {
  font-size: 12px;
  color: var(--muted);
  padding: 12px;
  overflow-wrap: anywhere;
}
.sidebar-bottom {
  border-top: 1px solid var(--border);
  padding: 10px 12px 14px;
}
.version {
  display: block;
  font-size: 10px;
  padding: 10px 9px 0;
  color: var(--muted);
}
.collapsed .brand {
  padding: 20px 17px;
}
.collapsed .nav-scroll {
  padding: 0 8px;
}
.collapsed .nav-item {
  justify-content: center;
  padding: 7px;
}
.collapsed .nav-group {
  margin-bottom: 10px;
}
.collapsed .home-link {
  padding: 7px;
}
.collapsed .home-link svg {
  margin: 0;
}
.collapsed .sidebar-bottom {
  padding: 10px 8px;
}
.app-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.app-toolbar {
  height: 58px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 26px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  gap: 12px;
}
.breadcrumb {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 12px;
  min-width: 0;
}
.breadcrumb > span {
  color: var(--muted);
}
.breadcrumb strong {
  font-weight: 550;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.breadcrumb-slash {
  opacity: 0.45;
}
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.toolbar-actions select {
  border: 0;
  font-size: 11px;
  color: var(--muted);
  background: none;
  max-width: 140px;
}
.toolbar-actions .quiet-button {
  padding: 6px 8px;
}
.starred {
  color: var(--accent);
}
.starred svg {
  fill: var(--accent-soft);
}
.workspace {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  container-type: inline-size;
  container-name: workspace;
}
.workspace:focus {
  outline: none;
}
.statusbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  min-height: 30px;
  font-size: 10px;
  color: var(--muted);
  border-top: 1px solid var(--border);
  background: var(--surface);
}
.status-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--success);
  margin-right: 7px;
}
.statusbar button {
  border: none;
  padding: 4px 0;
  background: none;
  color: var(--muted);
  font-size: 10px;
}
.statusbar svg {
  width: 11px;
  height: 11px;
  margin-right: 5px;
}
.status-error {
  color: var(--danger);
}
@media (max-width: 900px) {
  .app-shell:not(.collapsed) {
    grid-template-columns: 210px minmax(0, 1fr);
  }
  .brand {
    padding-left: 15px;
  }
  .app-toolbar {
    padding: 0 16px;
  }
  .breadcrumb > span {
    display: none;
  }
}
@media (max-width: 620px) {
  .app-shell:not(.collapsed) {
    grid-template-columns: 170px minmax(0, 1fr);
  }
  .brand strong {
    font-size: 12px;
  }
  .brand div > span,
  kbd {
    display: none;
  }
  .statusbar {
    flex-wrap: wrap;
    padding: 5px 12px;
  }
  .breadcrumb {
    display: none;
  }
  .app-toolbar {
    justify-content: flex-end;
  }
}
</style>
