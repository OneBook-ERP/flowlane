// "AI paste" prompt template (T3.1). A pre-written prompt the consultant copies
// to the clipboard and runs, alongside their raw process notes, in any external
// AI chat tool. The reply (a tab-delimited table) is then pasted into the
// EXISTING Paste-from-Excel importer (pasteParser.js) — this file does not parse
// anything, it only builds the prompt text from the SAME column order Paste-
// from-Excel already shows, so the two can never drift out of sync.

export function buildAiPastePrompt(columnLabels) {
  const columns = columnLabels.join(', ')
  return [
    `Format the business process notes below into a table with these exact columns, in this exact order: ${columns}.`,
    'Output ONLY a tab-separated table: one header row with those exact column names, then one row per process step, with columns separated by tabs. No commentary, no markdown formatting, no numbering.',
    '',
    'Process notes:',
    '[paste your raw notes here]',
  ].join('\n')
}
