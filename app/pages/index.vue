<script setup lang="ts">
const fileInput = ref<HTMLInputElement | null>(null)
const files = ref<File[]>([])
const uploading = ref(false)
const message = ref('')
const error = ref('')

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  files.value = input.files ? [...input.files] : []
  message.value = ''
  error.value = ''
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

  const results = await uploadPhotos(files.value)
  const queued = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok)

  if (queued) {
    message.value = `Queued ${queued} photo${queued === 1 ? '' : 's'}.`
  }

  if (failed.length) {
    error.value = failed.map(r => `${r.file.name}: ${r.error}`).join('\n')
    files.value = failed.map(r => r.file)
  } else {
    clearFileInput()
  }

  uploading.value = false
}
</script>

<template>
  <UContainer class="py-8 max-w-md">
    <h1 class="text-2xl font-semibold mb-2">
      Ace uploader
    </h1>
    <p class="text-sm text-muted mb-6">
      One photo posts each day at 9:00 AM Eastern.
    </p>

    <div class="space-y-4">
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        class="block w-full text-sm"
        @change="onFileChange"
      >

      <UButton
        block
        :loading="uploading"
        :disabled="!files.length"
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
