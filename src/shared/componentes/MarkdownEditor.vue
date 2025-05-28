<template>
  <ComponentViewer title="Markdown Editor">
    <BaseCard>
      <div class="markdown-editor-content">
        <div class="format-toolbar">
          <div class="format-group">
            <button class="format-btn" title="Bold" @click="insertFormat('**', '**')">
              <strong>B</strong>
            </button>
            <button class="format-btn" title="Italic" @click="insertFormat('*', '*')">
              <em>I</em>
            </button>
            <button class="format-btn" title="Strikethrough" @click="insertFormat('~~', '~~')">
              <span style="text-decoration: line-through">S</span>
            </button>
          </div>
          <div class="format-group">
            <button class="format-btn" title="Heading 1" @click="insertHeading(1)">H1</button>
            <button class="format-btn" title="Heading 2" @click="insertHeading(2)">H2</button>
            <button class="format-btn" title="Heading 3" @click="insertHeading(3)">H3</button>
          </div>
          <div class="format-group">
            <button class="format-btn" title="Bulleted list" @click="insertList('- ')">•</button>
            <button class="format-btn" title="Numbered list" @click="insertList('1. ')">1.</button>
            <button class="format-btn" title="Quote" @click="insertFormat('> ', '')">""</button>
          </div>
          <div class="format-group">
            <button class="format-btn" title="Inline code" @click="insertFormat('`', '`')">
              <code>{ }</code>
            </button>
            <button class="format-btn" title="Code block" @click="insertCodeBlock()">
              <code>```</code>
            </button>
            <button class="format-btn" title="Link" @click="insertLink()">🔗</button>
            <button class="format-btn" title="Image" @click="insertImage()">🖼️</button>
          </div>
        </div>
        <div class="editor-layout">
          <div class="editor-pane">
            <BasePanel title="Editor">
              <div class="editor-container" ref="editorContainer"></div>
            </BasePanel>
          </div>

          <div class="preview-pane">
            <BasePanel title="Preview">
              <div class="preview-container" v-html="htmlContent"></div>
            </BasePanel>
          </div>
        </div>

        <div class="toolbar">
          <BaseButton @click="downloadMarkdown">Download Markdown</BaseButton>
          <BaseButton @click="downloadHTML">Download HTML</BaseButton>
          <BaseButton @click="copyMarkdown" title="Copy Markdown">Copy MD</BaseButton>
          <BaseButton @click="copyHTML" title="Copy HTML">Copy HTML</BaseButton>
        </div>
      </div>
    </BaseCard>
  </ComponentViewer>
</template>

<script setup lang="ts">
import DOMPurify from "dompurify";
import { marked } from "marked";
import * as monaco from "monaco-editor";
import { onBeforeUnmount, onMounted, ref } from "vue";
import BaseButton from "./BaseButton.vue";
import BaseCard from "./BaseCard.vue";
import BasePanel from "./BasePanel.vue";
import ComponentViewer from "./ComponentViewer.vue";

const editorContainer = ref<HTMLElement | null>(null);
const htmlContent = ref("");
const copied = ref(false);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

function insertFormat(prefix: string, suffix: string) {
  if (!editor) return;

  const selection = editor.getSelection();
  if (!selection) return;

  const selectedText = editor.getModel()?.getValueInRange(selection) || "";
  const range = new monaco.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn);

  const newText = `${prefix}${selectedText}${suffix}`;
  editor.executeEdits("format", [
    {
      range: range,
      text: newText,
      forceMoveMarkers: true,
    },
  ]);
  editor.focus();
}

function insertHeading(level: number) {
  if (!editor) return;

  const selection = editor.getSelection();
  if (!selection) return;

  const model = editor.getModel();
  if (!model) return;

  const lineContent = model.getLineContent(selection.startLineNumber);
  const prefix = "#".repeat(level) + " ";

  const cleanLine = lineContent.replace(/^#+\s*/, "");

  editor.executeEdits("heading", [
    {
      range: new monaco.Range(selection.startLineNumber, 1, selection.startLineNumber, lineContent.length + 1),
      text: prefix + cleanLine,
      forceMoveMarkers: true,
    },
  ]);
  editor.focus();
}

function insertList(prefix: string) {
  if (!editor) return;

  const selection = editor.getSelection();
  if (!selection) return;

  const model = editor.getModel();
  if (!model) return;

  const lines = [];
  for (let i = selection.startLineNumber; i <= selection.endLineNumber; i++) {
    const lineContent = model.getLineContent(i).trim();
    if (lineContent) {
      lines.push(prefix + lineContent);
    }
  }

  editor.executeEdits("list", [
    {
      range: new monaco.Range(selection.startLineNumber, 1, selection.endLineNumber, model.getLineMaxColumn(selection.endLineNumber)),
      text: lines.join("\n"),
      forceMoveMarkers: true,
    },
  ]);
  editor.focus();
}

function insertCodeBlock() {
  if (!editor) return;

  const selection = editor.getSelection();
  if (!selection) return;

  const selectedText = editor.getModel()?.getValueInRange(selection) || "";
  const newText = `\`\`\`\n${selectedText}\n\`\`\``;

  editor.executeEdits("codeblock", [
    {
      range: selection,
      text: newText,
      forceMoveMarkers: true,
    },
  ]);
  editor.focus();
}

function insertLink() {
  if (!editor) return;

  const selection = editor.getSelection();
  if (!selection) return;

  const selectedText = editor.getModel()?.getValueInRange(selection) || "";
  const newText = `[${selectedText}](url)`;

  editor.executeEdits("link", [
    {
      range: selection,
      text: newText,
      forceMoveMarkers: true,
    },
  ]);
  editor.focus();
}

function insertImage() {
  if (!editor) return;

  const selection = editor.getSelection();
  if (!selection) return;

  const selectedText = editor.getModel()?.getValueInRange(selection) || "";
  const newText = `![${selectedText}](url)`;

  editor.executeEdits("image", [
    {
      range: selection,
      text: newText,
      forceMoveMarkers: true,
    },
  ]);
  editor.focus();
}

marked.use({
  gfm: true,
  breaks: true,
  async: false,
  silent: true,
});

onMounted(() => {
  if (editorContainer.value) {
    editor = monaco.editor.create(editorContainer.value, {
      value: initialContent,
      language: "markdown",
      theme: "vs-dark",
      minimap: { enabled: false },
      wordWrap: "on",
      lineNumbers: "on",
      fontSize: 14,
      automaticLayout: true,
    });

    editor.onDidChangeModelContent(() => {
      updatePreview();
    });

    updatePreview();
  }
});

onBeforeUnmount(() => {
  if (editor) {
    editor.dispose();
  }
});

function updatePreview() {
  if (!editor) return;

  const markdownText = editor.getValue();
  try {
    const parsedHtml = marked.parse(markdownText, { async: false }) as string;
    htmlContent.value = DOMPurify.sanitize(parsedHtml);
  } catch (error) {
    console.error("Error processing Markdown:", error);
  }
}

function getMarkdownContent(): string {
  return editor ? editor.getValue() : "";
}

function downloadMarkdown() {
  downloadFile(getMarkdownContent(), "document.md", "text/markdown");
}

function downloadHTML() {
  downloadFile(htmlContent.value, "document.html", "text/html");
}

async function copyMarkdown() {
  await copyToClipboard(getMarkdownContent());
}

async function copyHTML() {
  await copyToClipboard(htmlContent.value);
}

function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error("Error copying to clipboard:", err);
  }
}

const initialContent = `# Markdown Editor

## Features

- Real-time preview
- Syntax highlighting
- Export to Markdown and HTML
- Copy to clipboard

## Code Example

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet('Developer');
\`\`\`

## Example Table

| Name | Description |
|------|-------------|
| VS Code | Code editor |
| Markdown | Markup language |

> This is an example of a quote.

---

[Example link](https://example.com)

![Example image](https://via.placeholder.com/150)
`;
</script>

<style scoped lang="scss">
.markdown-editor-content {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  width: 100%;
  height: 100%;
  gap: 1rem;
  overflow: hidden;
}

.format-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--panel-header-bg);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.format-group {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border-right: 1px solid var(--input-border);

  &:last-child {
    border-right: none;
  }
}

.format-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 0.5rem;
  border: 1px solid var(--input-border);
  background: var(--button-bg);
  color: var(--button-color);
  border-radius: 4px;
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--button-active-bg);
    border-color: var(--button-border-hover);
  }

  &:active {
    transform: translateY(1px);
  }

  code {
    font-family: monospace;
  }
}

.editor-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  overflow: hidden;

  @media (min-width: 768px) {
    flex-direction: row;
  }
}

.editor-pane,
.preview-pane {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  min-height: 300px;
}

.editor-container {
  width: 100%;
  height: 100%;
  min-height: 300px;
  border-radius: 6px;
  overflow: hidden;
}

.preview-container {
  width: 100%;
  height: 100%;
  padding: 1rem;
  overflow: auto;
  background-color: var(--panel-content-bg);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.6;

  :deep(h1) {
    font-size: 1.8rem;
    margin-top: 0;
    margin-bottom: 1rem;
    padding-bottom: 0.3rem;
    border-bottom: 1px solid var(--input-border);
  }

  :deep(h2) {
    font-size: 1.5rem;
    margin-top: 1.5rem;
    margin-bottom: 1rem;
    padding-bottom: 0.3rem;
    border-bottom: 1px solid var(--input-border);
  }

  :deep(h3) {
    font-size: 1.25rem;
    margin-top: 1.2rem;
    margin-bottom: 0.8rem;
  }

  :deep(h4) {
    font-size: 1.1rem;
    margin-top: 1rem;
    margin-bottom: 0.6rem;
  }

  :deep(p) {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  :deep(ul),
  :deep(ol) {
    margin-bottom: 1rem;
    padding-left: 1.5rem;
  }

  :deep(li) {
    margin-bottom: 0.25rem;
  }

  :deep(a) {
    color: var(--button-bg);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(pre) {
    padding: 1rem;
    background: var(--code-bg);
    border-radius: 6px;
    overflow-x: auto;
    margin-bottom: 1rem;

    code {
      font-family: "Monaco", "Menlo", "Courier New", monospace;
      font-size: 0.9rem;
    }
  }

  :deep(blockquote) {
    border-left: 4px solid var(--input-border);
    padding-left: 1rem;
    margin-left: 0;
    color: var(--text-secondary);
  }

  :deep(hr) {
    border: 0;
    border-top: 1px solid var(--input-border);
    margin: 1.5rem 0;
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;

    th,
    td {
      padding: 0.75rem;
      border: 1px solid var(--input-border);
    }

    th {
      background: var(--panel-header-bg);
      text-align: left;
    }

    tr:nth-child(even) {
      background: rgba(var(--panel-content-bg-rgb), 0.5);
    }
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    margin: 1rem 0;
  }
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-start;
  margin-top: auto;
  padding-top: 1rem;
}
</style>
