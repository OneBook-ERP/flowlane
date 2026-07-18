// The single Map Step editor store: rows + connections + pain points for one
// Process Map. Created once in MapEditor.vue via `provideMapStore(map)` and shared
// with the Table (and future Wizard / Diagram) tabs via inject (`useMapStore()`).
// Reads through flowlane.api.map.get_map; writes through save_steps with a
// debounced autosave. Pure row/payload logic lives in map/steps.js (unit-tested).

import { reactive, provide, inject } from 'vue'
import { call } from 'frappe-ui'
import { blankStep, fromServerStep, toSavePayload, mergeUidMap } from '@/map/steps.js'
import { moveItem } from '@/data/reorder.js'
import { serverMessage } from '@/data/errors.js'

const STORE_KEY = Symbol('flowlane-map-store')
const AUTOSAVE_DELAY = 1000

export function provideMapStore(mapName) {
  const store = createMapStore(mapName)
  provide(STORE_KEY, store)
  return store
}

export function useMapStore() {
  return inject(STORE_KEY)
}

export function createMapStore(mapName) {
  const state = reactive({
    header: {},
    steps: [],
    loading: false,
    saving: false,
    dirty: false,
    error: '',
  })

  let saveTimer = null
  let saveAgain = false

  // --- load / save --------------------------------------------------------

  async function load() {
    state.loading = true
    state.error = ''
    try {
      const data = await call('flowlane.api.map.get_map', { map: mapName })
      state.header = data.map || {}
      state.steps = (data.steps || []).map(fromServerStep)
      state.dirty = false
    } catch (error) {
      state.error = serverMessage(error)
    } finally {
      state.loading = false
    }
  }

  function scheduleSave() {
    state.dirty = true
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => save(), AUTOSAVE_DELAY)
  }

  async function save() {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    // Serialise saves: if one is in flight, run another once it settles so the
    // latest edits are never lost.
    if (state.saving) {
      saveAgain = true
      return
    }
    state.saving = true
    state.error = ''
    try {
      const result = await call('flowlane.api.map.save_steps', {
        map: mapName,
        steps: JSON.stringify(toSavePayload(state.steps)),
      })
      mergeUidMap(state.steps, result.uid_map || {})
      state.dirty = false
    } catch (error) {
      state.error = serverMessage(error)
      throw error
    } finally {
      state.saving = false
      if (saveAgain) {
        saveAgain = false
        scheduleSave()
      }
    }
  }

  // --- row operations -----------------------------------------------------

  function addStep(overrides) {
    const step = blankStep(overrides)
    state.steps.push(step)
    scheduleSave()
    return step
  }

  function addRows(rowMaps) {
    rowMaps.forEach((values) => state.steps.push(blankStep(values)))
    scheduleSave()
  }

  function removeStep(uid) {
    const index = state.steps.findIndex((step) => step.uid === uid)
    if (index === -1) return
    state.steps.splice(index, 1)
    // Drop edges that pointed at the removed row so nothing dangles.
    state.steps.forEach((step) => {
      step.connections = step.connections.filter((conn) => conn.to_uid !== uid)
    })
    scheduleSave()
  }

  function moveStep(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= state.steps.length) return
    state.steps = moveItem(state.steps, fromIndex, toIndex)
    scheduleSave()
  }

  function moveStepBy(uid, delta) {
    const from = state.steps.findIndex((step) => step.uid === uid)
    if (from !== -1) moveStep(from, from + delta)
  }

  function setField(uid, field, value) {
    const step = findStep(uid)
    if (step && step[field] !== value) {
      step[field] = value
      scheduleSave()
    }
  }

  // --- connection operations ---------------------------------------------

  function addConnection(uid, conn = {}) {
    const step = findStep(uid)
    if (!step) return
    step.connections.push({
      to_uid: conn.to_uid || '',
      label: conn.label || '',
      condition: conn.condition || '',
    })
    scheduleSave()
  }

  function setConnection(uid, index, patch) {
    const step = findStep(uid)
    if (step && step.connections[index]) {
      Object.assign(step.connections[index], patch)
      scheduleSave()
    }
  }

  function removeConnection(uid, index) {
    const step = findStep(uid)
    if (step && step.connections[index]) {
      step.connections.splice(index, 1)
      scheduleSave()
    }
  }

  function findStep(uid) {
    return state.steps.find((step) => step.uid === uid)
  }

  return {
    state,
    load,
    save,
    scheduleSave,
    addStep,
    addRows,
    removeStep,
    moveStep,
    moveStepBy,
    setField,
    addConnection,
    setConnection,
    removeConnection,
    findStep,
  }
}
