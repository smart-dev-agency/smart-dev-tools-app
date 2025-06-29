import { invoke } from "@tauri-apps/api/core";

export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
}

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  releaseNotes: string;
  publishedAt: string;
}

export class UpdateService {
  private readonly GITHUB_API_URL = "https://api.github.com/repos";
  private readonly REPO_OWNER = "smart-dev-agency";
  private readonly REPO_NAME = "smart-dev-tools-app";
  private readonly CHECK_INTERVAL = 24 * 60 * 60 * 1000;

  async getCurrentVersion(): Promise<string> {
    try {
      return await invoke<string>("get_app_version");
    } catch (error) {
      throw new Error("No se pudo obtener la versión actual de la aplicación");
    }
  }

  private isConfigured(): boolean {
    return this.REPO_OWNER.trim() !== "" && this.REPO_NAME.trim() !== "";
  }

  async getLatestRelease(): Promise<GitHubRelease> {
    if (!this.isConfigured()) {
      throw new Error("Update service not configured. Please set REPO_OWNER and REPO_NAME in updateService.ts");
    }

    try {
      const response = await fetch(`${this.GITHUB_API_URL}/${this.REPO_OWNER}/${this.REPO_NAME}/releases/latest`);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error("No se pudo consultar la última versión disponible");
    }
  }

  private compareVersions(current: string, latest: string): boolean {
    const currentParts = current.replace("v", "").split(".").map(Number);
    const latestParts = latest.replace("v", "").split(".").map(Number);

    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const latestPart = latestParts[i] || 0;

      if (latestPart > currentPart) {
        return true;
      } else if (latestPart < currentPart) {
        return false;
      }
    }

    return false;
  }

  async checkForUpdates(): Promise<UpdateInfo> {
    const hasConnection = await this.hasInternetConnection();
    if (!hasConnection) {
      throw new Error("No hay conexión a internet disponible");
    }

    try {
      const [currentVersion, latestRelease] = await Promise.all([this.getCurrentVersion(), this.getLatestRelease()]);

      const hasUpdate = this.compareVersions(currentVersion, latestRelease.tag_name);

      return {
        hasUpdate,
        currentVersion,
        latestVersion: latestRelease.tag_name,
        releaseUrl: latestRelease.html_url,
        releaseNotes: latestRelease.body,
        publishedAt: latestRelease.published_at,
      };
    } catch (error) {
      throw error;
    }
  }

  private setLastCheckDate(): void {
    localStorage.setItem("lastUpdateCheck", Date.now().toString());
  }

  private getLastCheckDate(): number {
    const lastCheck = localStorage.getItem("lastUpdateCheck");
    return lastCheck ? parseInt(lastCheck, 10) : 0;
  }

  private shouldCheckForUpdates(): boolean {
    const lastCheck = this.getLastCheckDate();
    const now = Date.now();
    return now - lastCheck > this.CHECK_INTERVAL;
  }

  async checkForUpdatesIfNeeded(): Promise<UpdateInfo | null> {
    if (!this.shouldCheckForUpdates()) {
      return null;
    }

    try {
      const updateInfo = await this.checkForUpdates();
      this.setLastCheckDate();
      return updateInfo;
    } catch (error) {
      return null;
    }
  }

  async forceCheckForUpdates(): Promise<UpdateInfo> {
    const updateInfo = await this.checkForUpdates();
    this.setLastCheckDate();
    return updateInfo;
  }

  ignoreVersion(version: string): void {
    localStorage.setItem("ignoredVersion", version);
  }

  isVersionIgnored(version: string): boolean {
    const ignoredVersion = localStorage.getItem("ignoredVersion");
    return ignoredVersion === version;
  }

  clearIgnoredVersion(): void {
    localStorage.removeItem("ignoredVersion");
  }

  private async hasInternetConnection(): Promise<boolean> {
    try {
      await fetch("https://api.github.com/", {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-cache",
      });
      return true;
    } catch (error) {
      return navigator.onLine;
    }
  }
}

export const updateService = new UpdateService();
