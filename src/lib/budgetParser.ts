import { budgetKey, BUDGET_CATEGORIES } from './mapping'
import type { BudgetMap } from '../types'

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
