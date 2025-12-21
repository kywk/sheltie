<template>
  <MilkdownProvider>
    <MilkdownEditorInner
      :initial-content="modelValue"
      @content-change="onContentChange"
    />
  </MilkdownProvider>
</template>

<script setup lang="ts">
import { MilkdownProvider } from '@milkdown/vue'
import MilkdownEditorInner from './MilkdownEditorInner.vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const onContentChange = (content: string) => {
  emit('update:modelValue', content)
}
</script>

<style scoped>
/* Provider wrapper - styles are in MilkdownEditorInner */
</style>
