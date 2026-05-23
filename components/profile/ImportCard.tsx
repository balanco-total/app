'use client'

import { useState } from 'react'
import { Upload, FileText, AlertCircle, Check, X, Loader2 } from 'lucide-react'
import { parseCSV, parseOFX } from './parsers'
import type { ParsedRow } from './types'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export default function ImportCard() {
  const [isDragging, setIsDragging] = useState(false)
  const [importFileName, setImportFileName] = useState('')
  const [importRows, setImportRows] = useState<ParsedRow[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')
  const [importResult, setImportResult] = useState<{ count: number } | null>(null)

  const resetImport = () => {
    setImportRows([])
    setImportFileName('')
    setImportError('')
    setImportResult(null)
  }

  const processFile = (file: File) => {
    setImportError('')
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'csv' && ext !== 'ofx') {
      setImportError('Formato não suportado. Use .csv ou .ofx.')
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setImportError('Arquivo muito grande. O limite é de 10 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer
      let text: string
      if (ext === 'ofx') {
        try { text = new TextDecoder('windows-1252').decode(buffer) }
        catch { text = new TextDecoder('utf-8').decode(buffer) }
      } else {
        text = new TextDecoder('utf-8').decode(buffer)
      }
      const rows = ext === 'csv' ? parseCSV(text) : parseOFX(text)
      if (rows.length === 0) {
        setImportError('Nenhum lançamento encontrado. Verifique o formato do arquivo.')
        return
      }
      setImportFileName(file.name)
      setImportRows(rows)
    }
    reader.readAsArrayBuffer(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleImport = async () => {
    setImportLoading(true)
    setImportError('')
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: importRows }),
    })
    const json = await res.json()
    if (!res.ok) {
      setImportError(json.error ?? 'Erro ao importar.')
      setImportLoading(false)
      return
    }
    setImportResult({ count: json.count })
    setImportLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
        <Upload size={20} className="text-[#1B4332]" />
        Importar lançamentos
      </h2>

      {importResult ? (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <Check size={20} className="text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-700">{importResult.count} lançamento(s) importado(s) com sucesso.</p>
            <button onClick={resetImport} className="text-sm text-green-600 hover:underline mt-1">
              Importar outro arquivo
            </button>
          </div>
        </div>
      ) : importRows.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{importRows.length}</span> lançamentos encontrados em{' '}
              <span className="font-medium text-gray-700">{importFileName}</span>
            </p>
            <button onClick={resetImport} className="text-gray-400 hover:text-gray-600 transition">
              <X size={16} />
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Data</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Descrição</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Valor</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Categoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {importRows.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap text-xs">{row.raw_date}</td>
                    <td className="px-3 py-2 text-gray-800 max-w-[180px] truncate">{row.description}</td>
                    <td className="px-3 py-2 text-gray-800 text-right whitespace-nowrap">
                      {row.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 max-w-[120px] truncate">
                      {row.category_name
                        ? <span className="text-gray-600">{row.category_name}</span>
                        : <span className="text-gray-300 italic text-xs">sem categoria</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {importRows.length > 10 && (
              <p className="text-xs text-gray-400 text-center py-2 border-t border-gray-50">
                e mais {importRows.length - 10} lançamentos
              </p>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Categorias serão vinculadas pelo nome. As que não tiverem correspondência serão atribuídas à categoria{' '}
            <strong className="text-gray-500">Outros</strong> (criada automaticamente se não existir).
          </p>

          {importError && (
            <p className="text-sm text-[#1B4332]/80 flex items-center gap-1.5">
              <AlertCircle size={14} className="shrink-0" />
              {importError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={importLoading}
              className="flex items-center gap-2 bg-[#1B4332] text-white px-5 py-2.5 rounded-lg hover:bg-[#163a2b] transition disabled:opacity-50 font-medium"
            >
              {importLoading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {importLoading ? 'Importando...' : `Importar ${importRows.length} lançamentos`}
            </button>
            <button
              onClick={resetImport}
              disabled={importLoading}
              className="px-5 py-2.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Suporta arquivos <strong>CSV</strong> (exportados pelo BalançoTotal ou de outros sistemas) e{' '}
            <strong>OFX</strong> (extratos bancários). Categorias sem correspondência são atribuídas a <strong>Outros</strong>.
          </p>
          <label
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition
              ${isDragging ? 'border-[#1B4332] bg-green-50' : 'border-gray-200 hover:border-[#1B4332]/40 hover:bg-gray-50'}`}
            onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
            onDrop={handleDrop}
          >
            <FileText size={32} className={isDragging ? 'text-[#1B4332]' : 'text-gray-300'} />
            <p className="mt-2 font-medium text-gray-600">Arraste um arquivo aqui</p>
            <p className="text-sm text-gray-400">ou clique para selecionar</p>
            <p className="text-xs text-gray-300 mt-1">.csv · .ofx</p>
            <input
              type="file"
              accept=".csv,.ofx"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          {importError && (
            <p className="text-sm text-red-600 flex items-center gap-1.5 mt-3">
              <AlertCircle size={14} className="shrink-0" />
              {importError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
