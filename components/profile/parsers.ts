import type { ParsedRow } from './types'

export const FIELD_PATTERN = /[^a-zA-Z0-9\-\/\. À-ÿ]/g

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function parseAmount(raw: string): number | null {
  const s = raw.replace(/[R$+\s]/g, '').replace(/^-/, '').trim()
  const hasDot = s.includes('.')
  const hasComma = s.includes(',')
  let value: number
  if (hasDot && hasComma) {
    value = parseFloat(s.replace(/\./g, '').replace(',', '.'))
  } else if (hasComma) {
    value = parseFloat(s.replace(',', '.'))
  } else {
    value = parseFloat(s)
  }
  if (!isFinite(value) || value <= 0) return null
  return Math.round(Math.abs(value) * 100) / 100
}

export function parseDateStr(raw: string): { iso: string; display: string } | null {
  const br = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (br) {
    const d = parseInt(br[1]), m = parseInt(br[2]), y = parseInt(br[3])
    const date = new Date(y, m - 1, d)
    if (date.getDate() !== d || date.getMonth() !== m - 1) return null
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    return { iso, display: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}` }
  }
  const isoM = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoM) {
    const [, y, m, d] = isoM
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    if (date.getDate() !== parseInt(d)) return null
    return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` }
  }
  const ofxM = raw.trim().match(/^(\d{4})(\d{2})(\d{2})/)
  if (ofxM) {
    const [, y, m, d] = ofxM
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    if (date.getDate() !== parseInt(d)) return null
    return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` }
  }
  return null
}

function parseCSVLine(line: string, delim: string): string[] {
  const cells: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      let j = i + 1, field = ''
      while (j < line.length) {
        if (line[j] === '"' && line[j + 1] === '"') { field += '"'; j += 2 }
        else if (line[j] === '"') { j++; break }
        else { field += line[j++] }
      }
      cells.push(field)
      if (line[j] === delim) j++
      i = j
    } else {
      const end = line.indexOf(delim, i)
      if (end === -1) { cells.push(line.slice(i)); break }
      cells.push(line.slice(i, end))
      i = end + 1
    }
  }
  return cells
}

export function parseCSV(text: string): ParsedRow[] {
  const cleaned = text.replace(/^﻿/, '')
  const lines = cleaned.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) return []

  const delim = (lines[0].match(/;/g) ?? []).length >= (lines[0].match(/,/g) ?? []).length ? ';' : ','
  const headers = parseCSVLine(lines[0], delim).map(h => stripAccents(h.toLowerCase().trim()))

  const findCol = (candidates: string[]) =>
    candidates.reduce<number>((found, c) => found >= 0 ? found : headers.indexOf(c), -1)

  const dateIdx = findCol(['data', 'date', 'data lancamento', 'data do lancamento', 'dt', 'data transacao'])
  const paidAtIdx = findCol(['data de pagamento', 'data pagamento', 'pagamento', 'paid at', 'paid_at'])
  const amtIdx = findCol(['valor', 'amount', 'value', 'vlr', 'debito', 'credito', 'debit', 'credit', 'montante'])
  const descIdx = findCol(['descricao', 'description', 'memo', 'historico', 'lancamento', 'complemento', 'detalhe', 'movimento'])
  const catIdx = findCol(['categoria', 'category', 'cat'])
  const accountIdx = findCol(['conta', 'account', 'account name', 'nome da conta'])

  if (dateIdx < 0 || amtIdx < 0 || descIdx < 0) return []

  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i], delim)
    const rawDate = cells[dateIdx]?.trim() ?? ''
    const rawAmt = cells[amtIdx]?.trim() ?? ''
    const desc = cells[descIdx]?.trim() ?? ''
    const cat = catIdx >= 0 ? cells[catIdx]?.trim() ?? '' : ''
    const accountName = accountIdx >= 0 ? cells[accountIdx]?.trim() ?? '' : ''
    const rawPaidAt = paidAtIdx >= 0 ? cells[paidAtIdx]?.trim() ?? '' : ''

    const parsedDate = parseDateStr(rawDate)
    const amount = parseAmount(rawAmt)
    if (!parsedDate || !amount || !desc) continue

    const parsedPaidAt = rawPaidAt ? parseDateStr(rawPaidAt) : null

    rows.push({
      description: desc,
      amount,
      category_name: cat,
      date: parsedDate.iso,
      raw_date: parsedDate.display,
      paid_at: parsedPaidAt?.iso,
      account_name: accountName || undefined,
    })
  }
  return rows
}

function extractOFXTag(block: string, tag: string): string {
  const xml = block.match(new RegExp(`<${tag}[^>]*>(.*?)<\\/${tag}>`, 'is'))
  if (xml) return xml[1].trim()
  const sgml = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i'))
  return sgml ? sgml[1].trim() : ''
}

export function parseOFX(text: string): ParsedRow[] {
  const rows: ParsedRow[] = []
  const parts = text.split(/<STMTTRN>/i).slice(1)
  for (const part of parts) {
    const end = part.search(/<\/STMTTRN>|<\/BANKTRANLIST>/i)
    const block = end >= 0 ? part.slice(0, end) : part

    const dtPosted = extractOFXTag(block, 'DTPOSTED')
    const trnAmt = extractOFXTag(block, 'TRNAMT')
    const memo = extractOFXTag(block, 'MEMO') || extractOFXTag(block, 'NAME')

    if (!dtPosted || !trnAmt || !memo) continue

    const parsedDate = parseDateStr(dtPosted)
    if (!parsedDate) continue
    const amount = parseAmount(trnAmt)
    if (!amount) continue

    const description = memo.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
    if (!description) continue

    rows.push({ description, amount, category_name: '', date: parsedDate.iso, raw_date: parsedDate.display })
  }
  return rows
}
