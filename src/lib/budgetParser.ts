import { budgetKey, BUDGET_CATEGORIES } from './mapping'
import type { BudgetMap, MonthlyBudgetData, MonthlyBudgetMap } from '../types'

const BUDGET_EMPTY = '---'

function parseBrNumber(value: string): number | null {
  const cleaned = value.replace(/\./g, '').replace(',', '.').trim()
  if (cleaned === '' || cleaned === BUDGET_EMPTY) return null
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function parseCsvLine(line: string): [string, string] {
  const quoted = line.match(/^"([^"]+)"\s*,\s*"?([^"]*)"?$/)
  if (quoted) {
    return [quoted[1].trim(), (quoted[2] ?? '').trim()]
  }
  const idx = line.indexOf(',')
  if (idx >= 0) {
    return [line.slice(0, idx).trim().replace(/^"|"$/g, ''), line.slice(idx + 1).trim().replace(/^"|"$/g, '')]
  }
  return [line.trim(), '']
}

/** Parseia uma linha CSV com N colunas, respeitando campos entre aspas. */
function parseCsvRow(line: string): string[] {
  const result: string[] = []
  let i = 0
  while (i <= line.length) {
    if (i === line.length) {
      result.push('')
      break
    }
    if (line[i] === '"') {
      let end = i + 1
      while (end < line.length && line[end] !== '"') end++
      result.push(line.slice(i + 1, end))
      i = end + 2 // skip closing " and comma
    } else {
      const commaIdx = line.indexOf(',', i)
      if (commaIdx === -1) {
        result.push(line.slice(i))
        break
      }
      result.push(line.slice(i, commaIdx))
      i = commaIdx + 1
    }
  }
  return result
}

const categorySet = new Set(BUDGET_CATEGORIES)

/**
 * Parseia o CSV de budget e retorna mapa com chave "categoria|subcategoria".
 * Usa o mapeamento definido em mapping.ts.
 */
export function parseBudgetCsv(csvText: string): BudgetMap {
  const map: BudgetMap = new Map()
  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) return map

  let parentCategory: string | null = null

  for (let i = 1; i < lines.length; i++) {
    const [label, valueStr] = parseCsvLine(lines[i])
    if (!label) continue

    const value = parseBrNumber(valueStr)

    if (value !== null) {
      if (categorySet.has(label)) {
        parentCategory = label
      } else if (parentCategory !== null) {
        map.set(budgetKey(parentCategory, label), value)
      }
    }
  }

  return map
}

/**
 * Parseia o CSV mensal de budget.
 * Formato esperado:
 *   categoria,subcategoria,2026-01,2026-02,...
 *   Alimentação,Delivery,111.70,120.00,...
 */
export function parseMonthlyBudgetCsv(csvText: string): MonthlyBudgetData {
  const emptyResult: MonthlyBudgetData = { subcategorias: [], months: [], budgets: new Map() }
  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) return emptyResult

  const headers = parseCsvRow(lines[0])
  // colunas de mês começam no índice 2
  const months = headers.slice(2).filter((h) => /^\d{4}-\d{2}$/.test(h))
  if (months.length === 0) return emptyResult

  const subcategorias: MonthlyBudgetData['subcategorias'] = []
  const budgets: MonthlyBudgetMap = new Map()

  for (const month of months) {
    budgets.set(month, new Map())
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvRow(lines[i])
    const categoria = cols[0]?.trim()
    const subcategoria = cols[1]?.trim()
    if (!categoria || !subcategoria) continue

    subcategorias.push({ categoria, subcategoria })
    const key = budgetKey(categoria, subcategoria)

    months.forEach((month, idx) => {
      const raw = cols[idx + 2]?.trim() ?? ''
      if (raw === '') return
      const value = parseFloat(raw)
      // value <= 0 treated as "no budget" (same as empty cell)
      if (!isNaN(value) && value > 0) {
        budgets.get(month)!.set(key, value)
      }
    })
  }

  return { subcategorias, months, budgets }
}

/**
 * Serializa MonthlyBudgetData de volta para string CSV.
 * Campos com vírgula são colocados entre aspas.
 */
export function exportMonthlyBudgetCsv(data: MonthlyBudgetData): string {
  const escapeField = (v: string) => (v.includes(',') ? `"${v}"` : v)

  const header = ['categoria', 'subcategoria', ...data.months].map(escapeField).join(',')

  const rows = data.subcategorias.map(({ categoria, subcategoria }) => {
    const key = budgetKey(categoria, subcategoria)
    const values = data.months.map((month) => {
      const val = data.budgets.get(month)?.get(key)
      return val !== undefined ? val.toFixed(2) : ''
    })
    return [escapeField(categoria), escapeField(subcategoria), ...values].join(',')
  })

  return [header, ...rows].join('\n')
}
