<template>
  <ComponentViewer title="Date Converter">
    <BaseCard>
      <section class="col-5 h-100 p-3">
        <div class="d-flex flex-column h-100">
          <BaseInput v-model="inputDate" placeholder="Enter a date, epoch, or timestamp" class="mb-3" />
          <BaseButton @click="convertDate" class="mb-3">Convert</BaseButton>
          
          <div class="input-group mb-3">
            <label>Input Format:</label>
            <select v-model="inputFormat" class="form-select">
              <option value="auto">Auto-detect</option>
              <option value="epoch">Epoch (seconds)</option>
              <option value="timestamp">Timestamp (milliseconds)</option>
              <option value="iso">ISO 8601</option>
              <option value="human">Readable Date</option>
            </select>
          </div>

          <div v-if="error" class="error mb-3">{{ error }}</div>
        </div>
      </section>

      <section class="col-7 h-100 p-3">
        <BasePanel v-if="dateObj" title="Conversions" :content="conversionsText">
          <div class="conversions">
            <div class="conversion-item">
              <strong>Local Date:</strong>
              <div>{{ localDate }}</div>
            </div>
            <div class="conversion-item">
              <strong>UTC:</strong>
              <div>{{ utcDate }}</div>
            </div>
            <div class="conversion-item">
              <strong>ISO 8601:</strong>
              <div>{{ isoDate }}</div>
            </div>
            <div class="conversion-item">
              <strong>Epoch (seconds):</strong>
              <div>{{ epoch }}</div>
            </div>
            <div class="conversion-item">
              <strong>Timestamp (ms):</strong>
              <div>{{ timestamp }}</div>
            </div>
            <div class="conversion-item">
              <strong>Relative:</strong>
              <div>{{ relative }}</div>
            </div>
          </div>
        </BasePanel>
        <div v-else class="placeholder-text">
          Enter a date to see all conversions
        </div>
      </section>
    </BaseCard>
  </ComponentViewer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import BaseButton from './BaseButton.vue';
import BaseCard from './BaseCard.vue';
import BaseInput from './BaseInput.vue';
import BasePanel from './BasePanel.vue';
import ComponentViewer from './ComponentViewer.vue';

const inputDate = ref('');
const inputFormat = ref('auto');
const dateObj = ref<Date | null>(null);
const error = ref('');

const localDate = computed(() => dateObj.value?.toLocaleString());
const utcDate = computed(() => dateObj.value?.toUTCString());
const isoDate = computed(() => dateObj.value?.toISOString());
const epoch = computed(() => dateObj.value ? Math.floor(dateObj.value.getTime() / 1000) : null);
const timestamp = computed(() => dateObj.value?.getTime());
const conversionsText = computed(() => {
  if (!dateObj.value) return '';
  return `Local: ${localDate.value}
UTC: ${utcDate.value}
ISO: ${isoDate.value}
Epoch: ${epoch.value}
Timestamp: ${timestamp.value}`;
});

const relative = computed(() => {
  if (!dateObj.value) return '';
  const now = new Date();
  const diff = now.getTime() - dateObj.value.getTime();
  const seconds = Math.floor(Math.abs(diff) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (diff < 0) {
    if (days > 0) return `In ${days} days`;
    if (hours > 0) return `In ${hours} hours`;
    if (minutes > 0) return `In ${minutes} minutes`;
    return `In ${seconds} seconds`;
  } else {
    if (days > 0) return `Ago ${days} days`;
    if (hours > 0) return `Ago ${hours} hours`;
    if (minutes > 0) return `Ago ${minutes} minutes`;
    return `Ago ${seconds} seconds`;
  }
});

function convertDate() {
  error.value = '';
  dateObj.value = null;
  
  if (!inputDate.value) {
    error.value = 'Please enter a date';
    return;
  }

  try {
    let date: Date | null = null;

    switch (inputFormat.value) {
      case 'epoch':
        date = new Date(parseInt(inputDate.value) * 1000);
        break;
      case 'timestamp':
        date = new Date(parseInt(inputDate.value));
        break;
      case 'iso':
        date = new Date(inputDate.value);
        break;
      case 'human':
        date = new Date(inputDate.value);
        break;
      case 'auto':
      default:
        if (/^\d+$/.test(inputDate.value)) {
          if (inputDate.value.length <= 10) {
            date = new Date(parseInt(inputDate.value) * 1000); // epoch
          } else {
            date = new Date(parseInt(inputDate.value)); // timestamp
          }
        } else {
          date = new Date(inputDate.value);
        }
    }

    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }

    dateObj.value = date;
  } catch (e) {
    error.value = 'Could not convert the date. Please check the format.';
  }
}
</script>

<style scoped lang="scss">
.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  label {
    font-weight: 500;
  }
}

.form-select {
  padding: 0.6em 1.2em;
  border-radius: 8px;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--input-color);
  font-size: 1em;
  transition: all 0.2s ease;
  
  &:focus {
    border-color: var(--button-bg);
    outline: none;
    box-shadow: var(--input-focus-shadow);
  }
}

.conversions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.conversion-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  background: var(--code-bg);
  padding: 0.75rem;
  border-radius: 6px;
  
  strong {
    color: #0090ff;
    font-size: 0.9rem;
    opacity: 0.9;
  }
  
  div {
    font-family: 'Monaco', 'Menlo', 'Courier New', Courier, monospace;
    font-size: 0.9rem;
    color: var(--code-color);
  }
}

.error {
  color: var(--error-color);
  font-size: 0.9rem;
  padding: 0.5rem;
  border-radius: 6px;
  background: var(--error-bg);
}

.placeholder-text {
  color: var(--placeholder-color);
  font-size: 0.9rem;
  text-align: center;
  padding: 1rem;
}
</style>
