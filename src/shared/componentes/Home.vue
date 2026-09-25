<template>
  <section class="home-workspace">
    <header class="home-heading">
      <p class="eyebrow">SMART DEV TOOLS</p>
      <h1>A little less friction.<br /><span>A lot more flow.</span></h1>
      <p class="muted">
        Your everyday developer tools, together in one quiet workspace.
      </p>
      <button class="home-search" @click="$emit('search')">
        <Icon name="search" /><span>What are you working on?</span
        ><Icon name="arrow" />
      </button>
    </header>
    <section v-if="recent.length" class="recent-section">
      <h2 class="section-title">Pick up where you left off</h2>
      <div class="recent-tools">
        <button v-for="id in recent" :key="id" @click="$emit('select', id)">
          <span class="tool-symbol">{{
            tools.find((tool) => tool.id === id)?.symbol
          }}</span
          >{{ tools.find((tool) => tool.id === id)?.name }}<Icon name="arrow" />
        </button>
      </div>
    </section>
    <div class="catalog-heading">
      <h2>Explore your toolkit</h2>
      <span>{{ tools.length }} focused tools</span>
    </div>
    <section v-for="group in groups" :key="group" class="catalog-group">
      <h3 class="eyebrow">{{ group }}</h3>
      <div class="tool-grid">
        <article
          v-for="tool in tools.filter((item) => item.group === group)"
          :key="tool.id"
          class="tool-card"
        >
          <button class="open-tool" @click="$emit('select', tool.id)">
            <span class="card-symbol">{{ tool.symbol }}</span
            ><strong>{{ tool.name }}</strong
            ><span class="card-description">{{ tool.description }}</span
            ><span class="tool-open"
              >Open tool <Icon name="arrow"
            /></span></button
          ><button
            class="pin-tool"
            :class="{ pinned: favorites.includes(tool.id) }"
            :aria-label="`${favorites.includes(tool.id) ? 'Unpin' : 'Pin'} ${tool.name}`"
            :aria-pressed="favorites.includes(tool.id)"
            @click="$emit('favorite', tool.id)"
          >
            <Icon name="star" />
          </button>
        </article>
      </div>
    </section>
    <div class="home-note">
      <Icon name="shield" />
      <p>
        Content stays in this session. Only your preferences, favorite tools and
        recent tool names are saved.<br />TLS checks and update checks are the
        only built-in network operations.
      </p>
    </div>
  </section>
</template>
<script setup lang="ts">
import { tools, type ToolId } from "../lib/tools";
import Icon from "./Icon.vue";
defineProps<{ favorites: ToolId[]; recent: ToolId[] }>();
defineEmits<{ select: [id: ToolId]; favorite: [id: ToolId]; search: [] }>();
const groups = [...new Set(tools.map((tool) => tool.group))];
</script>
<style scoped>
.home-workspace {
  padding: 40px 36px 24px;
  max-width: 1400px;
  margin: 0 auto;
}
.home-heading {
  max-width: 680px;
  margin-bottom: 34px;
}
.home-heading h1 {
  font-size: clamp(26px, 3.3cqw, 39px);
  line-height: 1.17;
  font-weight: 650;
  letter-spacing: -0.045em;
  margin: 14px 0 15px;
}
.home-heading h1 span {
  color: var(--muted);
  font-weight: 450;
}
.home-heading > p.muted {
  font-size: 13px;
}
.home-search {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  background: var(--surface);
  color: var(--muted);
  margin-top: 24px;
  padding: 14px 16px;
  text-align: left;
}
.home-search span {
  flex: 1;
}
.home-search:hover {
  border-color: var(--accent);
}
.section-title {
  font-size: 12px;
  font-weight: 550;
  margin: 0 0 12px;
}
.recent-section {
  margin-bottom: 32px;
}
.recent-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.recent-tools button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px 5px 4px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  border-radius: 6px;
  font-size: 11px;
}
.recent-tools svg {
  width: 13px;
  color: var(--muted);
  margin-left: 4px;
}
.catalog-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 10px;
}
.catalog-heading h2 {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0;
}
.catalog-heading > span {
  font-size: 11px;
  color: var(--muted);
}
.catalog-group {
  margin-bottom: 26px;
}
.catalog-group > h3 {
  font-size: 10px;
  margin-bottom: 12px;
}
.tool-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.tool-card {
  position: relative;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 9px;
}
.tool-card:hover {
  border-color: var(--border-strong);
}
.open-tool {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  height: 100%;
  background: none;
  border: none;
  color: var(--text);
  text-align: left;
  padding: 18px;
}
.card-symbol {
  font: 16px var(--mono);
  color: var(--accent);
  margin-bottom: 16px;
}
.open-tool strong {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}
.card-description {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.55;
  flex: 1;
}
.tool-open {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--muted);
  margin-top: 18px;
}
.tool-open svg {
  width: 12px;
}
.pin-tool {
  position: absolute;
  right: 10px;
  top: 10px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--muted);
}
.pin-tool:hover {
  background: var(--surface-alt);
}
.pin-tool svg {
  width: 14px;
}
.pin-tool.pinned {
  color: var(--accent);
}
.pin-tool.pinned svg {
  fill: var(--accent-soft);
}
.home-note {
  display: flex;
  align-items: start;
  gap: 10px;
  border-top: 1px solid var(--border);
  padding-top: 20px;
  margin-top: 30px;
  color: var(--muted);
}
.home-note p {
  font-size: 11px;
  line-height: 1.7;
  margin: 0;
}
@container workspace (max-width: 780px) {
  .tool-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .home-workspace {
    padding: 30px 20px;
  }
}
@container workspace (max-width: 440px) {
  .tool-grid {
    grid-template-columns: 1fr;
  }
  .catalog-heading {
    align-items: start;
    flex-direction: column;
  }
}
</style>
