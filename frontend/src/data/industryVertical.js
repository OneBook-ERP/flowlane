// Industry Vertical inline-create (BACKLOG 1.1): New Client's vertical field
// is a free-text Combobox — if the consultant types a vertical that isn't
// seeded yet, resolve it to a new Flowlane Industry Vertical master row on
// save rather than gating client creation behind a separate "add vertical"
// step. Creation is deferred to save (not on every keystroke/blur) so
// cancelling the dialog never leaves an orphan master row behind.
import { call } from 'frappe-ui'
import { masters, masterOptions } from './masters.js'

export async function ensureIndustryVertical(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''

  const existing = masterOptions('industry_vertical').find(
    (option) => option.value.toLowerCase() === trimmed.toLowerCase(),
  )
  if (existing) return existing.value

  await call('frappe.client.insert', {
    doc: { doctype: 'Flowlane Industry Vertical', vertical_name: trimmed },
  })
  await masters.reload()
  return trimmed
}
