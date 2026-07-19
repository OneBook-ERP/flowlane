// "AI paste" prompt template (T3.1). A pre-written prompt the consultant copies
// to the clipboard and runs, alongside their raw process notes, in any external
// AI chat tool. The reply (a tab-delimited table) is then pasted back into the
// Paste-from-AI importer (pasteParser.js) — this file does not parse anything,
// it only builds the prompt text from the SAME column order PasteDialog.vue
// already shows (columns.js's PASTE_FIELDS), so the two can never drift out of
// sync. The header row this prompt asks for is intentional — pasteParser.js's
// isHeaderRow strips it back out before import, so what the AI is told to
// output and what actually gets parsed always agree.
//
// Connections and Pain Points (the last two columns) are child-table data,
// not plain text, so they get their own format instructions below — the
// EXACT format map/childRowFormat.js's decode functions expect (also what
// Upload Excel round-trips through, so one convention serves both importers).
//
// BUG FIX: Lane Role and Node Type are master-validated fields on the
// backend (save_steps rejects anything not already seeded in Flowlane Lane
// Role / Flowlane Node Type) — but this prompt used to ask the AI for a
// "Lane Role"/"Node Type" column with NO list of valid values, so a
// perfectly plausible AI answer (e.g. "Store Keeper", "Purchase Manager")
// reliably got rejected at save time. The whole batch save is transactional,
// so ONE invalid value silently failed the ENTIRE import — while the "N new
// rows" toast had already fired client-side (the row lands in the Table
// grid instantly; only the debounced autosave, seconds later, actually
// talks to the backend), so nothing on screen said it hadn't really saved.
// masterHints, when passed (PasteDialog.vue always does), lists the live
// seeded values for these two fields so the AI picks from the real
// vocabulary instead of inventing plausible-sounding ones. Pure — still no
// Vue/DOM — the caller resolves masters.js and hands over plain arrays.

export function buildAiPastePrompt(columnLabels, masterHints = {}) {
  const columns = columnLabels.join(', ')
  return [
    `Format the business process notes below into a table with these exact columns, in this exact order: ${columns}.`,
    'Output ONLY a tab-separated table: one header row with those exact column names, then one row per process step, with columns separated by tabs. No commentary, no markdown formatting, no numbering.',
    '',
    ...masterHintLines(masterHints),
    'Connections column: which step(s) this row flows to next. Write each as "<target Step ID> (<connector label>)" — e.g. "S2 (Yes)", or just "S3" when there is no label. List more than one with " | " between them, e.g. "S2 (Yes) | S4 (No)" for a decision step. Leave the cell blank if this is the last step.',
    'Pain Points column: any problems, bottlenecks, or manual workarounds at this step. Write each as "<Severity>: <description>" where Severity is Low, Medium, or High — e.g. "High: Approvals happen over email with no audit trail". List more than one with " | " between them. Leave the cell blank if there are none.',
    '',
    'Process notes:',
    '[paste your raw notes here]',
  ].join('\n')
}

function masterHintLines(masterHints) {
  const lines = []
  if (masterHints.lane_role?.length) {
    lines.push(`Lane Role must be EXACTLY one of these values (pick the closest match, do not invent a new one): ${masterHints.lane_role.join(', ')}.`)
  }
  if (masterHints.node_type?.length) {
    lines.push(`Node Type must be EXACTLY one of these values: ${masterHints.node_type.join(', ')}.`)
  }
  if (lines.length) lines.push('')
  return lines
}
