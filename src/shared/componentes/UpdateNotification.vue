<template>
  <Teleport to="body">
    <Transition name="update-notification">
      <div v-if="showNotification" class="update-notification-overlay" @click="closeNotification">
        <div class="update-notification" @click.stop>
          <div class="notification-header">
            <h3>{{ notificationTitle }}</h3>
            <button class="close-btn" @click="closeNotification">×</button>
          </div>

          <div class="notification-content">
            <div class="version-info">
              <p><strong>Current version:</strong> {{ updateInfo.currentVersion }}</p>
              <p v-if="updateInfo.hasUpdate"><strong>New version:</strong> {{ updateInfo.latestVersion }}</p>
              <p v-else><strong>Latest version:</strong> {{ updateInfo.latestVersion }}</p>
              <p v-if="updateInfo.hasUpdate && updateInfo.publishedAt" class="published-date">
                <strong>Published:</strong> {{ formatDate(updateInfo.publishedAt) }}
              </p>
            </div>

            <div v-if="!updateInfo.hasUpdate" class="up-to-date-message">
              <p>✅ You are running the latest version of the application.</p>
            </div>

            <div v-if="updateInfo.hasUpdate && updateInfo.releaseNotes" class="release-notes">
              <h4>📝 Release notes:</h4>
              <div class="notes-content" v-html="formattedReleaseNotes"></div>
            </div>
          </div>

          <div class="notification-actions">
            <template v-if="updateInfo.hasUpdate">
              <button class="btn-primary" @click="openDownloadPage">📥 Download update</button>
              <button class="btn-secondary" @click="remindLater">⏰ Remind me later</button>
              <button class="btn-ghost" @click="ignoreVersion">🚫 Ignore this version</button>
            </template>
            <template v-else>
              <button class="btn-primary" @click="closeNotification">👍 OK</button>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { openUrl } from "@tauri-apps/plugin-opener";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { computed } from "vue";
import type { UpdateInfo } from "../services/updateService";
import { updateService } from "../services/updateService";

interface Props {
  updateInfo: UpdateInfo;
  modelValue: boolean;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
  (e: "ignore-version"): void;
  (e: "remind-later"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showNotification = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

const notificationTitle = computed(() => {
  return props.updateInfo.hasUpdate ? "🎉 New version available" : "✅ You have the latest version";
});

const formattedReleaseNotes = computed(() => {
  if (!props.updateInfo.releaseNotes) return "";

  try {
    const html = marked(props.updateInfo.releaseNotes) as string;
    return DOMPurify.sanitize(html);
  } catch (error) {
    console.error("Error formatting release notes:", error);
    return props.updateInfo.releaseNotes;
  }
});

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

function closeNotification(): void {
  showNotification.value = false;
}

async function openDownloadPage(): Promise<void> {
  try {
    await openUrl(props.updateInfo.releaseUrl);

    closeNotification();
  } catch (error) {
    console.error("Error opening download page with Tauri:", error);

    try {
      const success = window.open(props.updateInfo.releaseUrl, "_blank");

      if (!success) {
        alert(`Could not open automatically. Please visit manually:\n${props.updateInfo.releaseUrl}`);
      }

      closeNotification();
    } catch (fallbackError) {
      console.error("Fallback window.open also failed:", fallbackError);
      alert(`Error opening page. Please visit manually:\n${props.updateInfo.releaseUrl}`);
      closeNotification();
    }
  }
}

function remindLater(): void {
  emit("remind-later");
  closeNotification();
}

function ignoreVersion(): void {
  updateService.ignoreVersion(props.updateInfo.latestVersion);
  emit("ignore-version");
  closeNotification();
}
</script>

<style scoped lang="scss">
.update-notification-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.update-notification {
  background: var(--bg-color, #ffffff);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  margin: 20px;
  border: 1px solid var(--border-color, #e5e5e5);
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border-color, #e5e5e5);

  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary, #111827);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--text-secondary, #6b7280);
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s;

    &:hover {
      background: var(--hover-bg, #f3f4f6);
      color: var(--text-primary, #111827);
    }
  }
}

.notification-content {
  padding: 20px 24px;
}

.version-info {
  margin-bottom: 20px;

  p {
    margin: 8px 0;
    font-size: 0.95rem;

    strong {
      color: var(--text-primary, #111827);
    }
  }

  .published-date {
    color: var(--text-secondary, #6b7280);
    font-size: 0.9rem;
  }
}

.up-to-date-message {
  margin-bottom: 20px;
  text-align: center;

  p {
    font-size: 1rem;
    color: var(--text-primary, #111827);
    background: var(--success-bg, #f0f9ff);
    border: 1px solid var(--success-border, #0ea5e9);
    border-radius: 8px;
    padding: 16px;
    margin: 0;
  }
}

.release-notes {
  h4 {
    margin: 0 0 12px 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #111827);
  }

  .notes-content {
    background: var(--code-bg, #f8f9fa);
    border: 1px solid var(--border-color, #e5e5e5);
    border-radius: 8px;
    padding: 16px;
    max-height: 200px;
    overflow-y: auto;
    font-size: 0.9rem;
    line-height: 1.5;

    :deep(h1),
    :deep(h2),
    :deep(h3),
    :deep(h4),
    :deep(h5),
    :deep(h6) {
      margin-top: 0;
      margin-bottom: 8px;
      font-size: 1rem;
    }

    :deep(p) {
      margin: 8px 0;
    }

    :deep(ul),
    :deep(ol) {
      margin: 8px 0;
      padding-left: 20px;
    }

    :deep(li) {
      margin: 4px 0;
    }

    :deep(code) {
      background: var(--bg-color, #ffffff);
      padding: 2px 4px;
      border-radius: 4px;
      border: 1px solid var(--border-color, #e5e5e5);
      font-family: "Monaco", "Menlo", "Courier New", Courier, monospace;
      font-size: 0.85rem;
    }

    :deep(pre) {
      background: var(--bg-color, #ffffff);
      border: 1px solid var(--border-color, #e5e5e5);
      border-radius: 4px;
      padding: 12px;
      overflow-x: auto;
      margin: 8px 0;

      code {
        background: none;
        border: none;
        padding: 0;
      }
    }
  }
}

.notification-actions {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--border-color, #e5e5e5);
  flex-wrap: wrap;

  button {
    flex: 1;
    min-width: 120px;
    padding: 10px 14px;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.85rem;

    &.btn-primary {
      background: var(--primary-color, #3b82f6);
      color: white;
      border: 1px solid var(--primary-color, #3b82f6);

      &:hover {
        background: var(--primary-hover, #2563eb);
        border-color: var(--primary-hover, #2563eb);
      }
    }

    &.btn-secondary {
      background: var(--bg-color, #ffffff);
      color: var(--text-primary, #111827);
      border: 1px solid var(--border-color, #e5e5e5);

      &:hover {
        background: var(--hover-bg, #f3f4f6);
      }
    }

    &.btn-ghost {
      background: transparent;
      color: var(--text-secondary, #6b7280);
      border: 1px solid transparent;

      &:hover {
        background: var(--hover-bg, #f3f4f6);
        color: var(--text-primary, #111827);
      }
    }
  }
}

.update-notification-enter-active,
.update-notification-leave-active {
  transition: all 0.3s ease;
}

.update-notification-enter-from,
.update-notification-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.update-notification-enter-active .update-notification,
.update-notification-leave-active .update-notification {
  transition: all 0.3s ease;
}

.update-notification-enter-from .update-notification,
.update-notification-leave-to .update-notification {
  transform: translateY(-20px);
  opacity: 0;
}

@media (max-width: 768px) {
  .update-notification {
    margin: 10px;
    max-width: calc(100vw - 20px);
  }

  .notification-actions {
    flex-direction: column;

    button {
      width: 100%;
      min-width: auto;
    }
  }

  .notification-header {
    padding: 16px 20px 12px;

    h3 {
      font-size: 1.1rem;
    }
  }

  .notification-content {
    padding: 16px 20px;
  }

  .notification-actions {
    padding: 16px 20px;
  }
}
</style>
