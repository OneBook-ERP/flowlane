// Pure helpers for the New Client dialog's module picker. No Vue, no
// network: kept separate from data/templates.js (which imports frappe-ui)
// so this logic is unit-testable, same split as reorder.js/clientFilter.js.

// Templates matching the selected modules, in template (module/sequence)
// order — feeds the "what gets created" preview list.
export function templatesForModules(templates, modules) {
  if (!modules?.length) return []
  const selected = new Set(modules)
  return (templates || []).filter((template) => selected.has(template.module))
}

// One toast-friendly sentence summarizing an apply_templates() result.
export function summarizeApplyResult({ created = [], skipped = [] } = {}) {
  if (!created.length && !skipped.length) return ''
  const parts = []
  if (created.length) parts.push(`created ${created.join(', ')}`)
  if (skipped.length) {
    parts.push(`${skipped.length} already existed and ${skipped.length === 1 ? 'was' : 'were'} skipped`)
  }
  return capitalize(parts.join('; ')) + '.'
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
