<script setup lang="ts">
import type { QueueItem } from '~/composables/usePostsQueue'

useHead({
  title: 'Upload — Ace Naps'
})

const fileInput = ref<HTMLInputElement | null>(null)
const files = ref<File[]>([])
const uploading = ref(false)
const message = ref('')
const error = ref('')
const errorContext = ref<'pick' | 'size' | 'upload'>('upload')

const queueItems = ref<QueueItem[]>([])
const queueTotal = ref(0)
const queueLoading = ref(true)
const queueError = ref('')

const hasFiles = computed(() => files.value.length > 0)

const pickerPrimary = computed(() => {
  if (!hasFiles.value) {
    return 'Choose photos'
  }
  const count = files.value.length
  return `${count} photo${count === 1 ? '' : 's'} selected`
})

const pickerSecondary = computed(() => {
  if (!hasFiles.value) {
    return 'Tap to browse your library'
  }
  return files.value.map((file) => file.name).join(', ')
})

const errorTitle = computed(() => {
  switch (errorContext.value) {
    case 'pick':
      return 'No photos selected'
    case 'size':
      return 'File too large'
    default:
      return 'Upload failed'
  }
})

async function loadQueue() {
  queueLoading.value = true
  queueError.value = ''
  try {
    const { items, total } = await fetchPendingQueue()
    queueItems.value = items
    queueTotal.value = total
  } catch (err) {
    queueError.value =
      err instanceof Error ? err.message : 'Failed to load the queue.'
  } finally {
    queueLoading.value = false
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files ? [...input.files] : []
  message.value = ''

  const oversized = selected.filter((file) => getUploadSizeError(file))
  const valid = selected.filter((file) => !getUploadSizeError(file))

  if (oversized.length) {
    errorContext.value = 'size'
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
    errorContext.value = 'pick'
    error.value = 'Choose at least one photo before uploading.'
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
      message.value = `Queued ${queued} photo${queued === 1 ? '' : 's'} for the next available morning slot.`
      await loadQueue()
    }

    if (failed.length) {
      errorContext.value = 'upload'
      error.value = failed.map((r) => `${r.file.name}: ${r.error}`).join('\n')
      files.value = failed.map((r) => r.file)
    } else {
      clearFileInput()
    }
  } catch (err) {
    errorContext.value = 'upload'
    error.value =
      err instanceof Error ? err.message : 'Upload failed unexpectedly.'
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  void loadQueue()
})
</script>

<template>
  <UContainer
    class="flex min-h-svh max-w-md flex-col justify-start py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]"
  >
    <header class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
        Ace uploader
      </h1>
      <p class="mt-2 text-sm leading-relaxed text-default">
        One photo posts every day at 10&nbsp;AM Eastern to
        <a
          href="https://www.instagram.com/ace_naps/"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-highlighted underline underline-offset-2 hover:text-primary"
          >@ace_naps</a
        >. Max 8&nbsp;MB per image.
      </p>
    </header>

    <form class="flex flex-col gap-5" @submit.prevent="onUpload">
      <UFormField label="Photos" name="photos">
        <label
          class="group relative flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg border border-dashed border-default bg-elevated/50 px-4 py-3 transition-colors duration-200 hover:border-primary/40 hover:bg-elevated focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 motion-reduce:transition-none"
        >
          <input
            id="photos"
            ref="fileInput"
            type="file"
            accept="image/*"
            multiple
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            :aria-describedby="hasFiles ? 'photo-names' : undefined"
            @change="onFileChange"
          />
          <UIcon
            :name="hasFiles ? 'i-lucide-images' : 'i-lucide-image-plus'"
            class="size-5 shrink-0 text-muted transition-colors duration-200 group-hover:text-default group-focus-within:text-default motion-reduce:transition-none"
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-default">
              {{ pickerPrimary }}
            </span>
            <span
              id="photo-names"
              class="mt-0.5 block truncate text-xs text-muted"
            >
              {{ pickerSecondary }}
            </span>
          </span>
        </label>
      </UFormField>

      <UButton
        type="submit"
        block
        size="lg"
        icon="i-lucide-upload"
        :loading="uploading"
        :disabled="!files.length || uploading"
      >
        Upload
      </UButton>

      <div aria-live="polite" aria-atomic="true" class="flex flex-col gap-3">
        <UAlert
          v-if="message"
          color="success"
          variant="subtle"
          icon="i-lucide-circle-check"
          :title="message"
        />
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="errorTitle"
          :description="error"
        />
      </div>
    </form>

    <QueueLineup
      :items="queueItems"
      :total="queueTotal"
      :loading="queueLoading"
      :error="queueError"
    />
  </UContainer>
</template>
