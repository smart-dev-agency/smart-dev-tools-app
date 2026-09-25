// Tauri's native drop interception is disabled so every tool receives browser Files.
export function droppedFile(transfer: DataTransfer | null): File {
  if (transfer?.files.length !== 1)
    throw new Error("Choose one file at a time.");
  if (
    Array.from(transfer.items ?? []).some(
      (item) => item.webkitGetAsEntry?.()?.isDirectory,
    )
  )
    throw new Error("Choose a file, not a folder.");
  return transfer.files[0];
}

export function preventFileNavigation(event: DragEvent) {
  if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
}
