<template>
  <ComponentViewer title="Smart Dev Tools">
    <BaseCard>
      <section class="col-12 p-4">
        <div class="welcome-section">
          <div class="welcome-header">
            <h2>🛠️ Welcome to Smart Dev Tools</h2>
            <p class="welcome-subtitle">
              A comprehensive suite of development tools built with <strong>Tauri</strong>, <strong>Vue 3</strong>, and <strong>TypeScript</strong>
            </p>
          </div>

          <div class="intro-description">
            <p>
              Smart Dev Tools is a native desktop application that provides developers with essential utilities for daily development tasks. All tools
              run locally on your device, ensuring privacy and performance.
            </p>
            <p>Explore the sidebar to discover various categories of tools designed to streamline your development workflow.</p>
          </div>
        </div>

        <BasePanel title="🚀 How to Use the Application" class="mt-4">
          <div class="usage-instructions">
            <div class="instruction-step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h4>Navigate through categories</h4>
                <p>Use the left sidebar to explore different categories of available tools.</p>
              </div>
            </div>

            <div class="instruction-step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h4>Search for a specific tool</h4>
                <p>Use the search bar at the top of the sidebar to quickly find the tool you need.</p>
              </div>
            </div>

            <div class="instruction-step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h4>Expand/collapse categories</h4>
                <p>Click the ▼/▲ button to expand or collapse all categories at once, or click on each category individually.</p>
              </div>
            </div>

            <div class="instruction-step">
              <div class="step-number">4</div>
              <div class="step-content">
                <h4>Select and use a tool</h4>
                <p>Click on any tool to open it in the main panel. Each tool includes its own intuitive and user-friendly interface.</p>
              </div>
            </div>

            <div class="instruction-step">
              <div class="step-number">5</div>
              <div class="step-content">
                <h4>Stay updated</h4>
                <p>Use the 🔄 button in the sidebar to check for application updates and get new features.</p>
              </div>
            </div>
          </div>
        </BasePanel>

        <BasePanel title="💡 Useful Tips" class="mt-4">
          <div class="tips-grid">
            <div class="tip-card">
              <div class="tip-icon">⚡</div>
              <div class="tip-content">
                <h4>Native Performance</h4>
                <p>All tools are natively compiled for your platform, ensuring maximum performance and compatibility.</p>
              </div>
            </div>

            <div class="tip-card">
              <div class="tip-icon">🔒</div>
              <div class="tip-content">
                <h4>Privacy Guaranteed</h4>
                <p>All data is processed locally on your device. Nothing is sent to external servers.</p>
              </div>
            </div>

            <div class="tip-card">
              <div class="tip-icon">🌙</div>
              <div class="tip-content">
                <h4>Automatic Dark Mode</h4>
                <p>The application automatically adapts to your operating system's theme configuration.</p>
              </div>
            </div>

            <div class="tip-card">
              <div class="tip-icon">📱</div>
              <div class="tip-content">
                <h4>Responsive Design</h4>
                <p>The interface adapts perfectly to different window sizes for an optimal experience.</p>
              </div>
            </div>
          </div>
        </BasePanel>

        <div class="footer-section mt-4">
          <p class="footer-text"><strong>Smart Dev Tools</strong> - Developed with ❤️ using modern technologies for modern developers.</p>
          <p class="footer-version">Native compilation • Total privacy • Open source</p>
        </div>
      </section>
    </BaseCard>
  </ComponentViewer>
</template>

<script setup lang="ts">
import BaseCard from "./BaseCard.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";
</script>

<style scoped lang="scss">
.welcome-section {
  text-align: center;
  margin-bottom: 2rem;
}

.welcome-header {
  margin-bottom: 2rem;

  h2 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary, #111827);
    margin-bottom: 1rem;
  }

  .welcome-subtitle {
    font-size: 1.1rem;
    color: var(--text-secondary, #6b7280);
    line-height: 1.6;
    max-width: 600px;
    margin: 0 auto;
  }
}

.intro-description {
  max-width: 800px;
  margin: 0 auto;
  text-align: left;

  p {
    font-size: 1rem;
    line-height: 1.6;
    color: var(--text-secondary, #6b7280);
    margin-bottom: 1rem;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.usage-instructions {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.instruction-step {
  display: flex;
  gap: 1rem;
  align-items: flex-start;

  .step-number {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    background: var(--primary-color, #3b82f6);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .step-content {
    flex: 1;

    h4 {
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary, #111827);
    }

    p {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.5;
      color: var(--text-secondary, #6b7280);
    }
  }
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.tip-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--hover-bg, #f8f9fa);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e5e5e5);

  .tip-icon {
    flex-shrink: 0;
    font-size: 1.5rem;
  }

  .tip-content {
    flex: 1;

    h4 {
      margin: 0 0 0.5rem 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary, #111827);
    }

    p {
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.4;
      color: var(--text-secondary, #6b7280);
    }
  }
}

.footer-section {
  text-align: center;
  padding: 2rem 0;
  border-top: 1px solid var(--border-color, #e5e5e5);

  .footer-text {
    font-size: 1rem;
    color: var(--text-primary, #111827);
    margin-bottom: 0.5rem;
  }

  .footer-version {
    font-size: 0.9rem;
    color: var(--text-secondary, #6b7280);
    margin: 0;
  }
}

@media (prefers-color-scheme: dark) {
  .welcome-header {
    h2 {
      color: var(--text-primary, #f9fafb);
    }

    .welcome-subtitle {
      color: var(--text-secondary, #9ca3af);
    }
  }

  .intro-description {
    p {
      color: var(--text-secondary, #9ca3af);
    }
  }

  .instruction-step {
    .step-number {
      background: var(--primary-color, #60a5fa);
    }

    .step-content {
      h4 {
        color: var(--text-primary, #f9fafb);
      }

      p {
        color: var(--text-secondary, #9ca3af);
      }
    }
  }

  .tip-card {
    background: var(--hover-bg, #374151);
    border-color: var(--border-color, #4b5563);

    .tip-content {
      h4 {
        color: var(--text-primary, #f9fafb);
      }

      p {
        color: var(--text-secondary, #9ca3af);
      }
    }
  }

  .footer-section {
    border-top-color: var(--border-color, #374151);

    .footer-text {
      color: var(--text-primary, #f9fafb);
    }

    .footer-version {
      color: var(--text-secondary, #9ca3af);
    }
  }
}

@media (max-width: 768px) {
  .welcome-header h2 {
    font-size: 1.5rem;
  }

  .intro-description {
    text-align: center;
  }

  .tips-grid {
    grid-template-columns: 1fr;
  }

  .instruction-step {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }

  .tip-card {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }
}
</style>
