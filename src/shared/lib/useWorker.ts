import { onBeforeUnmount, ref, shallowRef } from "vue";
import type { Task } from "./compute.worker";

export function useWorker<T>() {
  const result = shallowRef<T | null>(null),
    busy = ref(false),
    error = ref(""),
    progress = ref(0);
  let worker: Worker | undefined,
    timer: ReturnType<typeof setTimeout> | undefined;
  function cancel() {
    worker?.terminate();
    worker = undefined;
    clearTimeout(timer);
    busy.value = false;
  }
  function reset() {
    cancel();
    result.value = null;
    error.value = "";
    progress.value = 0;
  }
  function run(task: Task, timeout = 30_000) {
    reset();
    busy.value = true;
    try {
      const current = new Worker(
        new URL("./compute.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker = current;
      current.onmessage = ({ data }) => {
        if (worker !== current) return;
        if ("progress" in data) {
          progress.value = data.progress;
          return;
        }
        if ("error" in data) error.value = data.error;
        else result.value = data.result;
        cancel();
      };
      current.onerror = () => {
        if (worker === current) {
          error.value = "The background task failed. Please retry.";
          cancel();
        }
      };
      current.postMessage(task);
      timer = setTimeout(() => {
        error.value =
          "Time limit reached. The task was stopped; try a smaller input or simpler pattern.";
        cancel();
      }, timeout);
    } catch (cause) {
      error.value =
        cause instanceof Error
          ? cause.message
          : "Could not start background task.";
      cancel();
    }
  }
  onBeforeUnmount(cancel);
  return { result, busy, error, progress, run, cancel, reset };
}
