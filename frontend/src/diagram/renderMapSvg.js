// Off-screen SVG rendering for one map, for the bulk export (BACKLOG 2.6).
//
// PLAN G8 requires exactly one render-to-SVG path — this does NOT re-implement
// swimlane layout. It mounts the SAME components DiagramTab lives in for a map
// that is open in the editor, off-screen, in a throwaway store + Vue app:
// provideMapStore(map) -> store.load() -> <DiagramTab> regenerates the swimlane
// via generateSwimlane.js exactly as it would on-screen (same header/footer/
// legend chrome from diagramChrome.js, same lane tints, same node colors) ->
// we read its <svg> through the same `getSvg` exposed to ExportMenu.vue -> the
// app is unmounted. Browser-only glue; not unit-tested (mirrors thumbnail.js).
import { createApp, h, ref, nextTick } from 'vue'
import DiagramTab from '@/components/editor/DiagramTab.vue'
import { provideMapStore } from '@/stores/useMapStore.js'

// Resolves to a detached (already cloned, safe to keep after unmount) <svg>
// element for `mapName`, or null if the map has no steps to draw (DiagramTab
// shows an empty-state message instead of an <svg> in that case).
export async function renderMapToSvg(mapName) {
  const container = offscreenContainer()
  document.body.appendChild(container)
  const tabRef = ref(null)

  const Host = {
    setup: () => ({ store: provideMapStore(mapName) }),
    render: () => h(DiagramTab, { ref: tabRef }),
  }

  const app = createApp(Host)
  try {
    const instance = app.mount(container)
    await instance.store.load()
    await waitForRegenerate()
    const svg = tabRef.value?.getSvg?.()
    return svg ? svg.cloneNode(true) : null
  } finally {
    app.unmount()
    container.remove()
  }
}

// A fixed-position, off-viewport (not display:none — some layout-dependent
// code paths in DiagramTab, e.g. pointer drag math, assume real layout even
// though rendering the SVG itself does not) container, matching the
// established off-screen-render trick this app hasn't needed before now.
function offscreenContainer() {
  const el = document.createElement('div')
  el.style.position = 'fixed'
  el.style.left = '-10000px'
  el.style.top = '0'
  el.style.width = '1600px'
  return el
}

// DiagramTab regenerates the swimlane on a requestAnimationFrame after its
// steps watcher fires (T3.4/T3.5's throttle) once store.load() populates
// state.steps. Two frames + a tick is enough margin for that watch -> rAF ->
// re-render chain to settle before we read the <svg>.
function waitForRegenerate() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => nextTick().then(resolve)))
  })
}
