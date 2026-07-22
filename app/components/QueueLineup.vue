<script setup lang="ts">
import type { QueueItem } from '~/composables/usePostsQueue'
import { formatReleaseDate } from '~/composables/usePostsQueue'

const props = defineProps<{
  items: QueueItem[]
  total: number
  loading: boolean
  error: string
}>()

const next = computed(() => props.items[0] ?? null)
const rest = computed(() => props.items.slice(1))

const supporting = computed(() => {
  const count = props.total
  if (!count) {
    return ''
  }
  return `${count} photo${count === 1 ? '' : 's'} · one each morning at 10 AM`
})
</script>

<template>
  <section class="mt-10" aria-labelledby="up-next-heading">
    <div class="border-t border-default pt-8">
      <header class="mb-5">
        <h2
          id="up-next-heading"
          class="text-base font-semibold tracking-tight text-highlighted"
        >
          Up next
        </h2>
        <p v-if="!loading && total" class="mt-1 text-sm text-muted">
          {{ supporting }}
        </p>
      </header>

      <div
        v-if="loading"
        class="flex flex-col gap-5"
        aria-busy="true"
        aria-live="polite"
      >
        <div class="mx-auto w-full max-w-xs">
          <USkeleton class="aspect-square w-full rounded-lg" />
          <USkeleton class="mx-auto mt-3 h-3 w-32" />
          <USkeleton class="mx-auto mt-2 h-3 w-16" />
        </div>
        <div class="flex gap-3 overflow-hidden">
          <USkeleton
            v-for="n in 3"
            :key="n"
            class="size-20 shrink-0 rounded-lg"
          />
        </div>
      </div>

      <UAlert
        v-else-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        title="Couldn’t load the lineup"
        :description="error"
      />

      <p v-else-if="!items.length" class="text-sm leading-relaxed text-muted">
        Nothing queued yet — upload a photo to start the lineup.
      </p>

      <div v-else class="queue-lineup flex flex-col gap-6">
        <figure v-if="next" class="mx-auto w-full max-w-xs text-center">
          <div
            class="relative overflow-hidden rounded-lg bg-elevated ring-1 ring-default/60"
          >
            <img
              v-if="next.signedUrl"
              :src="next.signedUrl"
              :alt="`Queued photo #${next.order}`"
              class="aspect-square w-full object-cover"
              loading="eager"
            />
            <div
              v-else
              class="flex aspect-square items-center justify-center text-sm text-muted"
              role="img"
              :aria-label="`Queued photo #${next.order}, image unavailable`"
            >
              Image unavailable
            </div>
            <span
              class="absolute left-2 top-2 rounded-md bg-default px-1.5 py-0.5 text-xs font-medium text-highlighted ring-1 ring-default"
            >
              #{{ next.order }}
            </span>
          </div>
          <figcaption class="mt-3">
            <p class="text-sm font-medium text-highlighted">
              {{ formatReleaseDate(next.order) }}
            </p>
          </figcaption>
        </figure>

        <ul
          v-if="rest.length"
          class="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
          aria-label="Later in the lineup"
        >
          <li
            v-for="(item, index) in rest"
            :key="item.id"
            class="queue-thumb w-20 shrink-0"
            :style="{ '--i': index }"
          >
            <div
              class="relative overflow-hidden rounded-lg bg-elevated ring-1 ring-default/60"
            >
              <img
                v-if="item.signedUrl"
                :src="item.signedUrl"
                :alt="`Queued photo #${item.order}`"
                class="aspect-square w-full object-cover"
                loading="lazy"
              />
              <div
                v-else
                class="flex aspect-square items-center justify-center text-[10px] text-muted"
                role="img"
                :aria-label="`Queued photo #${item.order}, image unavailable`"
              >
                —
              </div>
              <span
                class="absolute left-1 top-1 rounded bg-default px-1 py-px text-[10px] font-medium text-highlighted ring-1 ring-default"
              >
                #{{ item.order }}
              </span>
            </div>
            <p class="mt-1.5 truncate text-center text-xs text-muted">
              {{ formatReleaseDate(item.order) }}
            </p>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
