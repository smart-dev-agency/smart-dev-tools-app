<template>
  <main class="container">
    <slot />
  </main>
</template>

<script setup lang="ts">
</script>

<style scoped>
.container {
  margin: 0;
  padding-top: 10vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}
</style>
