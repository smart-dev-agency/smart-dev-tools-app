<template>
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.tools" />
  </svg>
</template>
<script setup lang="ts">
defineProps<{ name: string }>();
const paths: Record<string, string> = {
  search: "m21 21-4.5-4.5 M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0",
  menu: "M4 5h16v14H4z M9 5v14",
  home: "m3 10 9-7 9 7 M5 9v12h14V9 M9 21v-8h6v8",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z",
  copy: "M9 9h12v12H9z M15 5V3H3v12h2",
  arrow: "M5 12h14 m-5-5 5 5-5 5",
  close: "m6 6 12 12 M6 18 18 6",
  shield: "M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7Z m-4 9 3 3 5-6",
  refresh:
    "M20 7v5h-5 M4 17v-5h5 M5.5 7a8 8 0 0 1 13-1l1.5 2 M4 16l1.5 2a8 8 0 0 0 13-1",
  tools: "m8 6-6 6 6 6 m8-12 6 6-6 6 m-3-16-2 20",
  upload: "M12 16V3 m-5 5 5-5 5 5 M4 16v5h16v-5",
};
</script>
