import { describe, it, expect } from 'vitest'
import { parseClipboard } from './pasteParser.js'

const COLS = ['step_id', 'step_name', 'lane_role', 'node_type', 'trigger_input', 'output_result']

describe('parseClipboard', () => {
  it('maps a 3x6 Excel block to 3 rows with mapped columns (TC2.2)', () => {
    const block = [
      'S1\tReceive Enquiry\tSales Executive\tStart/End\tEmail\tLead',
      'S2\tPrepare Quote\tSales Executive\tProcess/Task\tLead\tQuotation',
      'S3\tApprove Quote\tSales Manager\tDecision\tQuotation\tApproved',
    ].join('\n')

    const rows = parseClipboard(block, COLS)

    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({
      step_id: 'S1',
      step_name: 'Receive Enquiry',
      lane_role: 'Sales Executive',
      node_type: 'Start/End',
      trigger_input: 'Email',
      output_result: 'Lead',
    })
    expect(rows[2].node_type).toBe('Decision')
  })

  it('ignores a trailing newline and blank lines', () => {
    const rows = parseClipboard('S1\tOne\n\nS2\tTwo\n', COLS)
    expect(rows.map((r) => r.step_id)).toEqual(['S1', 'S2'])
  })

  it('trims cells and tolerates CRLF line endings', () => {
    const rows = parseClipboard(' S1 \t One \r\nS2\tTwo', COLS)
    expect(rows[0]).toEqual({ step_id: 'S1', step_name: 'One' })
    expect(rows[1].step_name).toBe('Two')
  })

  it('ignores pasted columns beyond the mapping', () => {
    const rows = parseClipboard('S1\tOne\textra\tmore', ['step_id', 'step_name'])
    expect(rows[0]).toEqual({ step_id: 'S1', step_name: 'One' })
  })

  describe('header row (BUG FIX: the AI prompt asks for one, so it must be dropped, not imported as data)', () => {
    const labels = ['Step ID', 'Step Name']

    it('drops a leading row that matches the column labels exactly', () => {
      const rows = parseClipboard('Step ID\tStep Name\nS1\tOne', ['step_id', 'step_name'], labels)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toEqual({ step_id: 'S1', step_name: 'One' })
    })

    it('matches case- and whitespace-insensitively', () => {
      const rows = parseClipboard(' step id \t STEP NAME \nS1\tOne', ['step_id', 'step_name'], labels)
      expect(rows).toHaveLength(1)
      expect(rows[0].step_id).toBe('S1')
    })

    it('does NOT drop a real data row that only partially resembles the header', () => {
      const rows = parseClipboard('Step ID\tOne\nS2\tTwo', ['step_id', 'step_name'], labels)
      expect(rows).toHaveLength(2)
      expect(rows[0]).toEqual({ step_id: 'Step ID', step_name: 'One' })
    })

    it('never drops anything when columnLabels is omitted (unchanged behaviour for other callers)', () => {
      const rows = parseClipboard('Step ID\tStep Name\nS1\tOne', ['step_id', 'step_name'])
      expect(rows).toHaveLength(2)
      expect(rows[0]).toEqual({ step_id: 'Step ID', step_name: 'Step Name' })
    })
  })

  describe('connections / pain_points columns (BACKLOG: AI paste should carry these too)', () => {
    const columns = ['step_id', 'connections', 'pain_points']

    it('decodes the connections column via childRowFormat, not as plain text', () => {
      const rows = parseClipboard('S1\tS2 (Yes) | S4 (No)\t', columns)
      expect(rows[0].connections).toEqual([
        { to_step_id: 'S2', label: 'Yes', condition: '' },
        { to_step_id: 'S4', label: 'No', condition: '' },
      ])
    })

    it('decodes the pain_points column via childRowFormat, not as plain text', () => {
      const rows = parseClipboard('S1\t\tHigh: No SLA defined', columns)
      expect(rows[0].pain_points).toEqual([{ description: 'No SLA defined', pain_type: '', severity: 'High' }])
    })

    it('returns empty arrays, not undefined, for blank connections/pain cells', () => {
      const rows = parseClipboard('S1\t\t', columns)
      expect(rows[0].connections).toEqual([])
      expect(rows[0].pain_points).toEqual([])
    })
  })
})
