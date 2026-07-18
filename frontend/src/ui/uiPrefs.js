// Global UI preferences behind the revamp's floating Tweak panel (UI-REVAMP
// §5, UI step U4). Plain module-level reactive state — same "one shared
// resource" shape as data/masters.js / data/clients.js — so any component
// reads live values with `uiPrefs.density` etc, no provide/inject wiring.
// Persisted to localStorage so a chosen comparison survives a reload; falls
// back to defaults quietly if storage is unavailable (private browsing, etc).
import { reactive, watch } from 'vue'

const STORAGE_KEY = 'flowlane.uiPrefs'

// Each toggle must produce a tangible visual/layout difference — not a
// cosmetic tweak (ui-design rule). See TweakPanel.vue for the option labels.
const DEFAULTS = {
  density: 'compact', // 'compact' | 'relaxed' — D1 row heights & spacing
  homeMode: 'grid', // 'grid' | 'list' — D2 client home layout
  treeTheme: 'light', // 'light' | 'dark' — §5 tree rail
  inspectorMode: 'docked', // 'docked' | 'overlay' — §5 map inspector
  tableTextMode: 'ellipsis', // 'ellipsis' | 'wrap' — §5 Table long-text columns
}

export const uiPrefs = reactive(readStored())

watch(
  () => ({ ...uiPrefs }),
  (value) => writeStored(value),
  { deep: true }
)

export function resetUiPrefs() {
  Object.assign(uiPrefs, DEFAULTS)
}

function readStored() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  } catch {
    return { ...DEFAULTS }
  }
}

function writeStored(value) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // best-effort only; a full/blocked store should never break the app
  }
}
