import { describe, it, expect } from 'vitest'
import { buildAiPastePrompt } from './aiPastePrompt.js'

describe('buildAiPastePrompt', () => {
  const labels = [
    'Step ID',
    'Step Name',
    'Lane Role',
    'Node Type',
    'Trigger / Input',
    'Output / Result',
    'Connections',
    'Pain Points',
  ]
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

  it('explains the Connections column format the parser actually decodes', () => {
    expect(prompt).toContain('Connections column')
    expect(prompt).toContain('S2 (Yes)')
  })

  it('explains the Pain Points column format the parser actually decodes', () => {
    expect(prompt).toContain('Pain Points column')
    expect(prompt).toContain('Low, Medium, or High')
  })

  it('has no Lane Role/Node Type value list when no masterHints are given', () => {
    expect(prompt).not.toContain('Lane Role must be')
    expect(prompt).not.toContain('Node Type must be')
  })

  describe('masterHints (BUG FIX: master-validated fields need real values, not a free-text ask)', () => {
    const withHints = buildAiPastePrompt(labels, {
      lane_role: ['Sales Executive', 'Sales Manager'],
      node_type: ['Start/End', 'Process/Task'],
    })

    it('lists the seeded Lane Role values so the AI picks from them', () => {
      expect(withHints).toContain('Lane Role must be EXACTLY one of these values')
      expect(withHints).toContain('Sales Executive, Sales Manager')
    })

    it('lists the seeded Node Type values so the AI picks from them', () => {
      expect(withHints).toContain('Node Type must be EXACTLY one of these values')
      expect(withHints).toContain('Start/End, Process/Task')
    })
  })
})
