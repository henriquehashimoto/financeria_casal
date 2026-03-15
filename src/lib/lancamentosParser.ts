import * as XLSX from 'xlsx'
import { XLSX_COLUMNS } from './mapping'
import type { Lancamento } from '../types'

function excelSerialToDate(serial: number): Date {
  const utcDays = Math.floor(serial)
  const date = new Date(Date.UTC(1899, 11, 30, 0, 0, 0, 0))
  date.setUTCDate(date.getUTCDate() + utcDays)
  return date
}

function parseDateString(str: string): Date | null {
  const s = str.trim()
  const dmY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmY) {
    const [, day, month, year] = dmY
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const [, year, month, day] = iso
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
  }
  const parsed = new Date(s)
  return isNaN(parsed.getTime()) ? null : parsed
}

function getCellValue(row: unknown[], col: number): string | number | Date | undefined {
  const val = row[col]
  if (val === undefined || val === null) return undefined
  if (typeof val === 'number') return val
  if (val instanceof Date) return val
  return String(val).trim() || undefined
}

/**
 * Parseia o xlsx de lançamentos (export do banco).
 * Usa colunas definidas em mapping.ts (Categoria col C, Subcategoria col D).
 */
export function parseLancamentosXlsx(buffer: ArrayBuffer): Lancamento[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
  if (data.length < 2) return []

  const result: Lancamento[] = []

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[]
    if (!row) continue

    const dataEvento = getCellValue(row, XLSX_COLUMNS.DATA_EVENTO)
    const categoria = getCellValue(row, XLSX_COLUMNS.CATEGORIA)
    const subcategoria = getCellValue(row, XLSX_COLUMNS.SUBCATEGORIA)
    const descricao = getCellValue(row, XLSX_COLUMNS.DESCRICAO)
    const valor = getCellValue(row, XLSX_COLUMNS.VALOR)
    const status = getCellValue(row, XLSX_COLUMNS.STATUS)

    if (categoria === undefined || valor === undefined) continue

    const valorNum = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/\./g, '').replace(',', '.'))
    if (isNaN(valorNum)) continue

    let dataDate: Date
    if (dataEvento instanceof Date) {
      dataDate = dataEvento
    } else if (typeof dataEvento === 'number') {
      dataDate = excelSerialToDate(dataEvento)
    } else if (dataEvento) {
      const str = String(dataEvento)
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        dataDate = new Date(str)
      } else {
        const parsed = parseDateString(str)
        dataDate = parsed ?? new Date()
      }
    } else {
      dataDate = new Date()
    }

    if (isNaN(dataDate.getTime())) continue

    result.push({
      data: dataDate,
      categoria: String(categoria),
      subcategoria: subcategoria !== undefined ? String(subcategoria) : '',
      descricao: descricao !== undefined ? String(descricao) : '',
      valor: valorNum,
      status: status !== undefined ? String(status) : '',
    })
  }

  return result
}
