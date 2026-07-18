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
})
