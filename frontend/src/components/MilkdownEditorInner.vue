<template>
  <div class="milkdown-wrapper">
    <Milkdown />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { Milkdown, useEditor } from '@milkdown/vue'

const props = defineProps<{
  initialContent: string
}>()

const emit = defineEmits<{
  'contentChange': [value: string]
}>()

// Use a ref to track internal content for comparison
const internalContent = ref(props.initialContent)
const editorReady = ref(false)

// Initialize the editor - useEditor MUST be called inside a MilkdownProvider child
const { loading } = useEditor((root) => {
  return Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, props.initialContent || '')
      
      // Setup listener for content changes
      ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
        if (markdown !== internalContent.value) {
          internalContent.value = markdown
          emit('contentChange', markdown)
        }
      })
    })
    .use(commonmark)
    .use(listener)
})

onMounted(() => {
  // Mark editor as ready once loaded
  watch(loading, (isLoading) => {
    if (!isLoading) {
      editorReady.value = true
    }
  }, { immediate: true })
})

// Expose method to get current content
defineExpose({
  getContent: () => internalContent.value
})
</script>

<style scoped>
.milkdown-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
  background: var(--color-bg-primary);
  border-radius: var(--radius-sm);
}

/* Milkdown editor container */
.milkdown-wrapper :deep(.milkdown) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.milkdown-wrapper :deep(.editor),
.milkdown-wrapper :deep(.ProseMirror) {
  flex: 1;
  padding: var(--spacing-md);
  outline: none;
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  line-height: 1.75;
  color: var(--color-text-primary);
  min-height: 100%;
}

/* Headings */
.milkdown-wrapper :deep(h1) {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  margin: 1.5em 0 0.75em;
  color: var(--color-text-primary);
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0.3em;
}

.milkdown-wrapper :deep(h2) {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  margin: 1.25em 0 0.5em;
  color: var(--color-text-primary);
}

.milkdown-wrapper :deep(h3) {
  font-size: var(--font-size-xl);
  font-weight: 600;
  margin: 1em 0 0.5em;
  color: var(--color-text-primary);
}

.milkdown-wrapper :deep(h4),
.milkdown-wrapper :deep(h5),
.milkdown-wrapper :deep(h6) {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin: 1em 0 0.5em;
  color: var(--color-text-secondary);
}

/* Paragraphs */
.milkdown-wrapper :deep(p) {
  margin: 0.75em 0;
}

/* Lists */
.milkdown-wrapper :deep(ul),
.milkdown-wrapper :deep(ol) {
  margin: 0.75em 0;
  padding-left: 1.5em;
}

.milkdown-wrapper :deep(li) {
  margin: 0.25em 0;
}

.milkdown-wrapper :deep(li > p) {
  margin: 0;
}

/* Links */
.milkdown-wrapper :deep(a) {
  color: var(--color-accent);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color var(--transition-fast);
}

.milkdown-wrapper :deep(a:hover) {
  border-bottom-color: var(--color-accent);
}

/* Code */
.milkdown-wrapper :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--color-bg-tertiary);
  padding: 0.15em 0.4em;
  border-radius: var(--radius-sm);
  color: var(--color-accent);
}

.milkdown-wrapper :deep(pre) {
  margin: 1em 0;
  padding: var(--spacing-md);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  overflow-x: auto;
}

.milkdown-wrapper :deep(pre code) {
  background: transparent;
  padding: 0;
  color: var(--color-text-primary);
}

/* Blockquote */
.milkdown-wrapper :deep(blockquote) {
  margin: 1em 0;
  padding: var(--spacing-sm) var(--spacing-md);
  border-left: 4px solid var(--color-accent);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.milkdown-wrapper :deep(blockquote p) {
  margin: 0;
}

/* Horizontal rule */
.milkdown-wrapper :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 2em 0;
}

/* Strong and Emphasis */
.milkdown-wrapper :deep(strong) {
  font-weight: 600;
  color: var(--color-text-primary);
}

.milkdown-wrapper :deep(em) {
  font-style: italic;
}

/* Tables */
.milkdown-wrapper :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}

.milkdown-wrapper :deep(th),
.milkdown-wrapper :deep(td) {
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  text-align: left;
}

.milkdown-wrapper :deep(th) {
  background: var(--color-bg-tertiary);
  font-weight: 600;
}

/* Images */
.milkdown-wrapper :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
}

/* Selection */
.milkdown-wrapper :deep(::selection) {
  background: var(--color-accent-glow);
}

/* ProseMirror cursor */
.milkdown-wrapper :deep(.ProseMirror-focused) {
  outline: none;
}

/* Placeholder text */
.milkdown-wrapper :deep(.ProseMirror p.is-editor-empty:first-child::before),
.milkdown-wrapper :deep(.ProseMirror > p:first-child:empty::before) {
  content: '開始輸入 Markdown...';
  color: var(--color-text-muted);
  pointer-events: none;
  float: left;
  height: 0;
}
</style>
