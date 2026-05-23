import { parseAmount, parseDateStr, parseCSV, parseOFX, FIELD_PATTERN } from '@/components/profile/parsers'

describe('components/profile/parsers', () => {
  describe('parseAmount', () => {
    it.each([
      ['10', 10],
      ['10.50', 10.5],
      ['10,50', 10.5],
      ['1.234,56', 1234.56], // pt-BR: dot=thousands, comma=decimal
      ['R$ 99,90', 99.9],
      ['+50,00', 50],
      ['-25,00', 25], // negative is taken as absolute (for expense imports)
      ['  42,00 ', 42],
    ])('parseAmount(%j) → %s', (input, expected) => {
      expect(parseAmount(input)).toBeCloseTo(expected, 2)
    })

    it('returns null for zero or negative result', () => {
      expect(parseAmount('0')).toBeNull()
      expect(parseAmount('0,00')).toBeNull()
    })

    it('returns null for non-numeric input', () => {
      expect(parseAmount('abc')).toBeNull()
      expect(parseAmount('')).toBeNull()
    })
  })

  describe('parseDateStr', () => {
    it('parses Brazilian DD/MM/YYYY', () => {
      expect(parseDateStr('15/03/2026')).toEqual({ iso: '2026-03-15', display: '15/03/2026' })
    })

    it('parses ISO YYYY-MM-DD', () => {
      expect(parseDateStr('2026-03-15')).toEqual({ iso: '2026-03-15', display: '15/03/2026' })
    })

    it('parses OFX YYYYMMDD prefix', () => {
      expect(parseDateStr('20260315120000[-3:BRT]')).toEqual({ iso: '2026-03-15', display: '15/03/2026' })
    })

    it('returns null for invalid date like 31/02', () => {
      expect(parseDateStr('31/02/2026')).toBeNull()
    })

    it('returns null for unrecognized format', () => {
      expect(parseDateStr('hello')).toBeNull()
    })
  })

  describe('parseCSV', () => {
    it('parses a simple comma-separated file with headers', () => {
      const csv = [
        'data,valor,descricao,categoria',
        '15/03/2026,99.90,Almoço,Alimentação',
        '16/03/2026,50.00,Uber,Transporte',
      ].join('\n')
      const rows = parseCSV(csv)
      expect(rows).toHaveLength(2)
      expect(rows[0]).toMatchObject({
        date: '2026-03-15',
        amount: 99.9,
        description: 'Almoço',
        category_name: 'Alimentação',
      })
    })

    it('supports semicolon delimiter (BR Excel)', () => {
      const csv = [
        'data;valor;descricao',
        '15/03/2026;1.234,56;Pagamento',
      ].join('\n')
      const rows = parseCSV(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].amount).toBeCloseTo(1234.56)
    })

    it('handles accented headers (categoria → "categoria")', () => {
      const csv = 'Data,Valor,Descrição,Categoria\n15/03/2026,10,Test,Cat'
      const rows = parseCSV(csv)
      expect(rows[0].category_name).toBe('Cat')
    })

    it('returns empty array when required headers are missing', () => {
      expect(parseCSV('foo,bar\n1,2')).toEqual([])
    })

    it('returns empty array when fewer than 2 lines', () => {
      expect(parseCSV('data,valor,descricao')).toEqual([])
    })

    it('skips rows with invalid date or amount', () => {
      const csv = [
        'data,valor,descricao',
        '99/99/9999,10,Bad date',
        '15/03/2026,abc,Bad amount',
        '15/03/2026,10,Good',
      ].join('\n')
      expect(parseCSV(csv)).toHaveLength(1)
    })

    it('parses quoted fields with embedded commas', () => {
      const csv = [
        'data,valor,descricao',
        '15/03/2026,10,"Compra, com vírgula"',
      ].join('\n')
      const rows = parseCSV(csv)
      expect(rows[0].description).toBe('Compra, com vírgula')
    })

    it('strips BOM from header', () => {
      const csv = '﻿data,valor,descricao\n15/03/2026,10,X'
      expect(parseCSV(csv)).toHaveLength(1)
    })

    it('reads paid_at column when present', () => {
      const csv = [
        'data,valor,descricao,data de pagamento',
        '15/03/2026,10,X,16/03/2026',
      ].join('\n')
      const rows = parseCSV(csv)
      expect(rows[0].paid_at).toBe('2026-03-16')
    })
  })

  describe('parseOFX', () => {
    const sample = `
      OFXHEADER:100
      <OFX>
        <BANKTRANLIST>
          <STMTTRN>
            <DTPOSTED>20260315120000[-3:BRT]
            <TRNAMT>-99.90
            <MEMO>Almoço Restaurante
          </STMTTRN>
          <STMTTRN>
            <DTPOSTED>20260316
            <TRNAMT>-50.00
            <MEMO>Uber
          </STMTTRN>
        </BANKTRANLIST>
      </OFX>
    `

    it('extracts transactions from OFX content', () => {
      const rows = parseOFX(sample)
      expect(rows).toHaveLength(2)
      expect(rows[0]).toMatchObject({
        date: '2026-03-15',
        amount: 99.9,
        description: 'Almoço Restaurante',
      })
    })

    it('uses NAME when MEMO is missing', () => {
      const ofx = `<STMTTRN>
          <DTPOSTED>20260315
          <TRNAMT>-10.00
          <NAME>Compra
        </STMTTRN>`
      expect(parseOFX(ofx)[0].description).toBe('Compra')
    })

    it('returns empty array when no transactions are present', () => {
      expect(parseOFX('<OFX></OFX>')).toEqual([])
    })
  })

  describe('FIELD_PATTERN', () => {
    it('is re-exported from lib/utils', () => {
      expect(FIELD_PATTERN).toBeInstanceOf(RegExp)
    })
  })
})
