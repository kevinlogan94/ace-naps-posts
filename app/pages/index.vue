<script setup lang="ts">
const fileInput = ref<HTMLInputElement | null>(null)
const files = ref<File[]>([])
const uploading = ref(false)
const message = ref('')
const error = ref('')

const fileLabel = computed(() => {
  if (!files.value.length) {
    return 'Choose photos — no file chosen'
  }
  return files.value.map((file) => file.name).join(', ')
})

const fileCountLabel = computed(() => {
  if (!files.value.length) {
    return ''
  }
  const count = files.value.length
  const noun = count === 1 ? 'photo' : 'photos'
  const retry = error.value ? ' (retry)' : ''
  return `${count} ${noun} selected${retry}`
})

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files ? [...input.files] : []
  message.value = ''

  const oversized = selected.filter((file) => getUploadSizeError(file))
  const valid = selected.filter((file) => !getUploadSizeError(file))

  if (oversized.length) {
    error.value = oversized
      .map((file) => `${file.name}: Must be 8 MB or smaller.`)
      .join('\n')
  } else {
    error.value = ''
  }

  files.value = valid
}

function clearFileInput() {
  files.value = []
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function onUpload() {
  if (!files.value.length) {
    error.value = 'Choose at least one photo.'
    return
  }

  uploading.value = true
  message.value = ''
  error.value = ''

  try {
    const results = await uploadPhotos(files.value)
    const queued = results.filter((r) => r.ok).length
    const failed = results.filter((r) => !r.ok)

    if (queued) {
      message.value = `Queued ${queued} photo${queued === 1 ? '' : 's'}.`
    }

    if (failed.length) {
      error.value = failed.map((r) => `${r.file.name}: ${r.error}`).join('\n')
      files.value = failed.map((r) => r.file)
    } else {
      clearFileInput()
    }
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'Upload failed unexpectedly.'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <UContainer class="py-8 max-w-md">
    <h1 class="text-2xl font-semibold mb-2">Ace uploader</h1>
    <p class="text-sm text-muted mb-6">
      One photo posts each day at 9:00 AM Eastern. Max 8 MB per image.
    </p>

    <div class="space-y-4">
      <label
        class="relative block w-full cursor-pointer rounded-lg border border-dashed border-default bg-elevated/50 px-3 py-3 text-sm text-muted"
      >
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          multiple
          class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          @change="onFileChange"
        >
        {{ fileLabel }}
      </label>

      <p v-if="fileCountLabel" class="text-sm text-muted -mt-2">
        {{ fileCountLabel }}
      </p>

      <UButton
        block
        :loading="uploading"
        :disabled="!files.length || uploading"
        @click="onUpload"
      >
        Upload
      </UButton>

      <UAlert
        v-if="message"
        color="success"
        variant="subtle"
        :title="message"
      />
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        title="Upload failed"
        :description="error"
      />
    </div>
  </UContainer>
</template>
