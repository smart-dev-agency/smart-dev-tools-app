<template>
  <ComponentViewer title="Markdown Editor"
    ><div class="stack">
      <div class="format-toolbar" aria-label="Markdown formatting">
        <button
          v-for="action in formats"
          :key="action.label"
          class="quiet-button"
          :title="action.label"
          :aria-label="action.label"
          @click="insert(action.prefix, action.suffix)"
        >
          {{ action.text }}</button
        ><span class="toolbar-divider"></span
        ><button
          v-for="level in [1, 2, 3]"
          :key="level"
          class="quiet-button"
          :aria-label="`Heading ${level}`"
          @click="heading(level)"
        >
          H{{ level }}</button
        ><button class="quiet-button" @click="prefixLines('- ')">List</button
        ><button class="quiet-button" @click="prefixLines('1. ')">
          1. List</button
        ><button class="quiet-button" @click="prefixLines('> ')">Quote</button>
      </div>
      <div class="workbench markdown-panes">
        <BasePanel title="Markdown source"
          ><div ref="editorContainer" class="editor-container"></div></BasePanel
        ><BasePanel title="Preview"
          ><template #actions
            ><span v-if="busy" class="tag" role="status">Rendering…</span
            ><button
              v-if="large"
              class="quiet-button"
              @click="renderPreview"
              :disabled="busy"
            >
              Render preview
            </button></template
          >
          <p v-if="large && !rawHtml" class="notice">
            Live preview pauses above 200,000 characters. Render explicitly to
            keep typing responsive.
          </p>
          <div class="markdown-preview" v-html="html" @click="followLink"></div>
          <p v-if="error" class="error" role="alert">{{ error }}</p></BasePanel
        >
      </div>
      <div class="controls">
        <BaseButton variant="secondary" @click="downloadMarkdown"
          >Export Markdown</BaseButton
        ><BaseButton
          variant="secondary"
          @click="downloadHtml"
          :disabled="rawHtml === null"
          >Export HTML</BaseButton
        ><BaseButton variant="secondary" @click="copyMarkdown"
          >Copy Markdown</BaseButton
        ><BaseButton
          variant="secondary"
          @click="copyHtml"
          :disabled="rawHtml === null"
          >Copy HTML</BaseButton
        ><span class="hint" role="status">{{ status }}</span>
      </div>
      <p v-if="actionError" class="error" role="alert">{{ actionError }}</p>
      <p class="hint">
        Sanitized local preview. Embedded images and media are omitted to
        prevent background network requests; image syntax is preserved in
        Markdown. Links open only when clicked.
      </p>
    </div></ComponentViewer
  >
</template>
<script setup lang="ts">
import { basicSetup, EditorView } from "codemirror";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { markdown } from "@codemirror/lang-markdown";
import { sanitizePreview } from "../lib/preview";
import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from "vue";
import { useWorker } from "../lib/useWorker";
import { copyText, openExternal, saveText } from "../lib/output";
import BaseButton from "./BaseButton.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";
const content = ref(
  '# A fresh page\n\nWrite something useful.\n\n- Format your notes\n- Preview as you type\n- Export when you are ready\n\n```ts\nconst message = "Hello, developer";\n```\n',
);
const editorContainer = ref<HTMLElement>(),
  actionError = ref(""),
  status = ref("");
let editor: EditorView | undefined, timer: ReturnType<typeof setTimeout>;
const {
  result: rawHtml,
  busy,
  error,
  run,
  reset,
  cancel,
} = useWorker<string>();
const large = computed(() => content.value.length > 200000);
const html = computed(() => sanitizePreview(rawHtml.value ?? ""));
const formats = [
  { label: "Bold", text: "B", prefix: "**", suffix: "**" },
  { label: "Italic", text: "I", prefix: "*", suffix: "*" },
  { label: "Strikethrough", text: "S̶", prefix: "~~", suffix: "~~" },
  { label: "Inline code", text: "<>", prefix: "`", suffix: "`" },
  { label: "Code block", text: "Code", prefix: "```\n", suffix: "\n```" },
  { label: "Link", text: "Link", prefix: "[", suffix: "](url)" },
  { label: "Image", text: "Image", prefix: "![", suffix: "](url)" },
];
function mountEditor() {
  if (editor || !editorContainer.value) return;
  editor = new EditorView({
    parent: editorContainer.value,
    doc: content.value,
    extensions: [
      basicSetup,
      markdown(),
      syntaxHighlighting(
        HighlightStyle.define([
          { tag: tags.heading, color: "var(--accent)", fontWeight: "600" },
          {
            tag: [tags.string, tags.attributeValue],
            color: "var(--syntax-string)",
          },
          { tag: [tags.keyword, tags.tagName], color: "var(--syntax-keyword)" },
          { tag: [tags.comment, tags.meta], color: "var(--muted)" },
          {
            tag: tags.link,
            color: "var(--accent)",
            textDecoration: "underline",
          },
          { tag: tags.strong, fontWeight: "700" },
          { tag: tags.emphasis, fontStyle: "italic" },
          { tag: tags.strikethrough, textDecoration: "line-through" },
          { tag: tags.monospace, fontFamily: "var(--mono)" },
        ]),
      ),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({
        "aria-label": "Markdown source",
        spellcheck: "false",
      }),
      EditorView.theme({
        "&": {
          backgroundColor: "var(--surface)",
          color: "var(--text)",
          fontSize: "13px",
        },
        ".cm-content": {
          fontFamily: "var(--mono)",
          caretColor: "var(--accent)",
          minHeight: "360px",
        },
        ".cm-scroller": { lineHeight: "1.7" },
        ".cm-gutters": {
          backgroundColor: "var(--surface)",
          color: "var(--muted)",
          borderRight: "1px solid var(--border)",
        },
        ".cm-activeLine, .cm-activeLineGutter": {
          backgroundColor: "var(--surface-alt)",
        },
        ".cm-cursor": { borderLeftColor: "var(--text)" },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
          backgroundColor: "var(--accent-soft)",
        },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) content.value = update.state.doc.toString();
      }),
    ],
  });
  if (rawHtml.value === null && !large.value) renderPreview();
}
function destroyEditor() {
  editor?.destroy();
  editor = undefined;
  clearTimeout(timer);
  cancel();
}
onMounted(mountEditor);
onActivated(mountEditor);
onDeactivated(destroyEditor);
onBeforeUnmount(destroyEditor);
watch(content, () => {
  clearTimeout(timer);
  reset();
  status.value = "";
  if (!large.value) timer = setTimeout(renderPreview, 220);
});
function renderPreview() {
  clearTimeout(timer);
  run({ kind: "markdown", text: content.value }, 10_000);
}
function insert(prefix: string, suffix: string) {
  if (!editor) return;
  const { from, to } = editor.state.selection.main;
  const text = editor.state.doc.sliceString(from, to);
  editor.dispatch({
    changes: { from, to, insert: prefix + text + suffix },
    selection: {
      anchor: from + prefix.length,
      head: from + prefix.length + text.length,
    },
  });
  editor.focus();
}
function heading(level: number) {
  if (!editor) return;
  const line = editor.state.doc.lineAt(editor.state.selection.main.from);
  editor.dispatch({
    changes: {
      from: line.from,
      to: line.to,
      insert: "#".repeat(level) + " " + line.text.replace(/^#+\s*/, ""),
    },
  });
  editor.focus();
}
function prefixLines(prefix: string) {
  if (!editor) return;
  const { from, to } = editor.state.selection.main,
    first = editor.state.doc.lineAt(from),
    last = editor.state.doc.lineAt(to);
  editor.dispatch({
    changes: {
      from: first.from,
      to: last.to,
      insert: editor.state.doc
        .sliceString(first.from, last.to)
        .split("\n")
        .map((line) => prefix + line)
        .join("\n"),
    },
  });
  editor.focus();
}
async function action(operation: () => Promise<void>, message = "") {
  actionError.value = "";
  status.value = "";
  try {
    await operation();
    status.value = message;
  } catch (cause) {
    actionError.value =
      cause instanceof Error
        ? cause.message
        : "Could not complete this action.";
  }
}
function downloadMarkdown() {
  action(() => saveText(content.value, "document.md", "text/markdown"));
}
function downloadHtml() {
  action(() =>
    saveText(
      `<!doctype html><html><head><meta charset="utf-8"><title>Markdown document</title></head><body>${html.value}</body></html>`,
      "document.html",
      "text/html",
    ),
  );
}
function copyMarkdown() {
  action(() => copyText(content.value), "Markdown copied");
}
function copyHtml() {
  action(() => copyText(html.value), "HTML copied");
}
function followLink(event: MouseEvent) {
  const anchor = (event.target as Element).closest("a");
  if (anchor) {
    event.preventDefault();
    action(() => openExternal(anchor.href));
  }
}
</script>
<style scoped>
.format-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
  padding: 5px 0;
}
.format-toolbar button {
  font-size: 11px;
  padding: 5px 9px;
  min-height: 29px;
}
.toolbar-divider {
  width: 1px;
  height: 18px;
  background: var(--border);
  margin: 0 5px;
}
.markdown-panes {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.editor-container {
  min-height: 400px;
}
.editor-container :deep(.cm-editor) {
  height: 480px;
}
.editor-container :deep(.cm-scroller) {
  overflow: auto;
}
.markdown-panes :deep(.panel-content) {
  padding: 0;
}
.markdown-preview {
  padding: 20px;
  min-height: 400px;
  max-height: 65vh;
  overflow: auto;
  overflow-wrap: anywhere;
  font-size: 13px;
}
.markdown-preview :deep(h1) {
  font-size: 26px;
}
.markdown-preview :deep(h2) {
  font-size: 21px;
}
.markdown-preview :deep(h3) {
  font-size: 17px;
}
.markdown-preview :deep(pre) {
  padding: 14px;
  background: var(--surface-alt);
  border-radius: 6px;
  margin: 14px 0;
}
.markdown-preview :deep(blockquote) {
  border-left: 3px solid var(--accent);
  margin: 16px 0;
  padding-left: 14px;
  color: var(--muted);
}
.markdown-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
}
.markdown-preview :deep(td),
.markdown-preview :deep(th) {
  border: 1px solid var(--border);
  padding: 8px;
  text-align: left;
}
.markdown-panes .error,
.markdown-panes .notice {
  margin: 12px;
}
@container workspace (max-width: 760px) {
  .markdown-panes {
    grid-template-columns: 1fr;
  }
}
</style>
