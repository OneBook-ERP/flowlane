import { describe, it, expect } from 'vitest'
import { buildAiPastePrompt } from './aiPastePrompt.js'

describe('buildAiPastePrompt', () => {
  const labels = ['Step ID', 'Step Name', 'Lane Role', 'Node Type', 'Trigger / Input', 'Output / Result']
  const prompt = buildAiPastePrompt(labels)

  it('lists every column, in order, comma-separated', () => {
    expect(prompt).toContain(labels.join(', '))
  })

  it('asks for a tab-separated table with a header row', () => {
    expect(prompt.toLowerCase()).toContain('tab-separated')
    expect(prompt.toLowerCase()).toContain('header row')
  })

  it('leaves a placeholder slot for the consultant to paste raw notes', () => {
    expect(prompt).toContain('Process notes:')
    expect(prompt).toContain('[paste your raw notes here]')
  })

  it('is a single self-contained string (no Vue/DOM dependency)', () => {
    expect(typeof prompt).toBe('string')
  })
})
