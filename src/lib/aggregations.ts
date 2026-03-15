import { format, startOfMonth, isSameMonth } from 'date-fns'
import { budgetKey } from './mapping'
import type { Lancamento, AggregatedSpend, BudgetMap, CategoryBudgetSummary, SaudeFinanceiraData } from '../types'

export function aggregateByCategory(
  lancamentos: Lancamento[],
  monthFilter?: Date
): Map<string, number> {
  const map = new Map<string, number>()
  const gastos = lancamentos.filter((l) => l.valor < 0)

  for (const l of gastos) {
    if (monthFilter && !isSameMonth(l.data, monthFilter)) continue
    const key = budgetKey(l.categoria, l.subcategoria)
    map.set(key, (map.get(key) ?? 0) + Math.abs(l.valor))
  }

  return map
}

export function aggregateReceitasByCategory(
  lancamentos: Lancamento[],
  monthFilter?: Date
): Map<string, number> {
  const map = new Map<string, number>()
  const receitas = lancamentos.filter((l) => l.valor > 0)

  for (const l of receitas) {
    if (monthFilter && !isSameMonth(l.data, monthFilter)) continue
    const key = budgetKey(l.categoria, l.subcategoria)
    map.set(key, (map.get(key) ?? 0) + l.valor)
  }

  return map
}

export function compareWithBudget(
  aggregated: Map<string, number>,
  budget: BudgetMap
): AggregatedSpend[] {
  const result: AggregatedSpend[] = []
  const seen = new Set<string>()

  for (const [key, total] of aggregated) {
    seen.add(key)
    const budgetVal = budget.get(key) ?? null
    const percentualUsado = budgetVal !== null && budgetVal > 0
      ? (total / budgetVal) * 100
      : null
    const [categoria, subcategoria] = key.includes('|')
      ? key.split('|')
      : [key, '']
    result.push({
      categoria,
      subcategoria,
      total,
      budget: budgetVal,
      percentualUsado,
    })
  }

  for (const [key, budgetVal] of budget) {
    if (seen.has(key) || budgetVal === 0) continue
    const [categoria, subcategoria] = key.includes('|') ? key.split('|') : [key, '']
    result.push({
      categoria,
      subcategoria,
      total: 0,
      budget: budgetVal,
      percentualUsado: 0,
    })
  }

  return result.sort((a, b) => b.total - a.total)
}

export function receitasMapToAggregated(map: Map<string, number>): AggregatedSpend[] {
  return Array.from(map.entries())
    .map(([key, total]) => {
      const [categoria, subcategoria] = key.includes('|') ? key.split('|') : [key, '']
      return { categoria, subcategoria, total, budget: null, percentualUsado: null }
    })
    .sort((a, b) => b.total - a.total)
}

export function aggregateByMonth(lancamentos: Lancamento[]): Map<string, number> {
  const map = new Map<string, number>()
  const gastos = lancamentos.filter((l) => l.valor < 0)

  for (const l of gastos) {
    const monthKey = format(startOfMonth(l.data), 'yyyy-MM')
    map.set(monthKey, (map.get(monthKey) ?? 0) + Math.abs(l.valor))
  }

  return map
}

export function aggregateReceitasByMonth(lancamentos: Lancamento[]): Map<string, number> {
  const map = new Map<string, number>()
  const receitas = lancamentos.filter((l) => l.valor > 0)

  for (const l of receitas) {
    const monthKey = format(startOfMonth(l.data), 'yyyy-MM')
    map.set(monthKey, (map.get(monthKey) ?? 0) + l.valor)
  }

  return map
}

export function aggregateReceitasAndGastosByMonth(
  lancamentos: Lancamento[]
): { month: string; receitas: number; gastos: number; saldo: number }[] {
  const receitasByMonth = aggregateReceitasByMonth(lancamentos)
  const gastosByMonth = aggregateByMonth(lancamentos)
  const months = new Set([...receitasByMonth.keys(), ...gastosByMonth.keys()])

  return Array.from(months)
    .sort()
    .map((month) => {
      const receitas = receitasByMonth.get(month) ?? 0
      const gastos = gastosByMonth.get(month) ?? 0
      return { month, receitas, gastos, saldo: receitas - gastos }
    })
}

/**
 * Agrega gastos por subcategoria (categoria|subcategoria) e mês.
 * Retorna dados prontos para gráfico histórico com % do budget usado.
 */
export function aggregateSubcategoriaByMonth(
  lancamentos: Lancamento[],
  budget: BudgetMap
): {
  months: string[]
  subcategorias: string[]
  data: { month: string; [subcatKey: string]: number | string }[]
} {
  const gastos = lancamentos.filter((l) => l.valor < 0)

  const monthSet = new Set<string>()
  const subcatSet = new Set<string>()
  const raw = new Map<string, Map<string, number>>()

  for (const l of gastos) {
    const month = format(startOfMonth(l.data), 'yyyy-MM')
    const key = budgetKey(l.categoria, l.subcategoria)
    monthSet.add(month)
    subcatSet.add(key)
    if (!raw.has(month)) raw.set(month, new Map())
    const byMonth = raw.get(month)!
    byMonth.set(key, (byMonth.get(key) ?? 0) + Math.abs(l.valor))
  }

  const months = Array.from(monthSet).sort()
  const subcategorias = Array.from(subcatSet).filter((k) => budget.has(k)).sort()

  const data = months.map((month) => {
    const byMonth = raw.get(month) ?? new Map<string, number>()
    const row: { month: string; [k: string]: number | string } = { month }
    for (const key of subcategorias) {
      const spent = byMonth.get(key) ?? 0
      const bud = budget.get(key) ?? 0
      row[key] = bud > 0 ? Math.round((spent / bud) * 100) : 0
      row[`${key}__abs`] = spent
    }
    return row
  })

  return { months, subcategorias, data }
}

/**
 * Agrega gastos por categoria e mês, somando budget de todas as subcategorias da categoria.
 * Retorna dados prontos para gráfico histórico com % do budget usado por categoria.
 */
export function aggregateCategoriaByMonth(
  lancamentos: Lancamento[],
  budget: BudgetMap
): {
  months: string[]
  categorias: string[]
  data: { month: string; [catKey: string]: number | string }[]
} {
  const gastos = lancamentos.filter((l) => l.valor < 0)

  // Build category-level budget by summing subcategory budgets
  const budgetByCategoria = new Map<string, number>()
  for (const [key, val] of budget) {
    const categoria = key.includes('|') ? key.split('|')[0] : key
    budgetByCategoria.set(categoria, (budgetByCategoria.get(categoria) ?? 0) + val)
  }

  const monthSet = new Set<string>()
  const catSet = new Set<string>()
  const raw = new Map<string, Map<string, number>>()

  for (const l of gastos) {
    const month = format(startOfMonth(l.data), 'yyyy-MM')
    const cat = l.categoria
    monthSet.add(month)
    catSet.add(cat)
    if (!raw.has(month)) raw.set(month, new Map())
    const byMonth = raw.get(month)!
    byMonth.set(cat, (byMonth.get(cat) ?? 0) + Math.abs(l.valor))
  }

  const months = Array.from(monthSet).sort()
  // Only show categories that have a budget defined
  const categorias = Array.from(catSet)
    .filter((c) => (budgetByCategoria.get(c) ?? 0) > 0)
    .sort()

  const data = months.map((month) => {
    const byMonth = raw.get(month) ?? new Map<string, number>()
    const row: { month: string; [k: string]: number | string } = { month }
    for (const cat of categorias) {
      const spent = byMonth.get(cat) ?? 0
      const bud = budgetByCategoria.get(cat) ?? 0
      row[cat] = bud > 0 ? Math.round((spent / bud) * 100) : 0
      row[`${cat}__abs`] = spent
    }
    return row
  })

  return { months, categorias, data }
}

/**
 * Agrupa os AggregatedSpend[] por categoria (somando total e budget das subcategorias).
 * Usado para visão macro — quanto resta disponível por categoria.
 */
/**
 * Dados para tabela de resumo: total no período, % vs budget, média 3 meses, % média vs budget.
 * Por categoria e subcategoria.
 */
export function aggregateResumoBudgetTable(
  lancamentos: Lancamento[],
  budget: BudgetMap,
  filteredMonth?: Date
): {
  categoria: string
  subcategoria: string
  totalGastoPeriodo: number
  percentualGastoVsBudget: number | null
  mediaGasto3Meses: number
  percentualMediaVsBudget: number | null
  budget: number
}[] {
  const gastos = lancamentos.filter((l) => l.valor < 0)

  // Meses disponíveis (ordenados desc)
  const monthSet = new Set<string>()
  for (const l of gastos) {
    monthSet.add(format(startOfMonth(l.data), 'yyyy-MM'))
  }
  const mesesOrdenados = Array.from(monthSet).sort().reverse()

  // Últimos 3 meses = os 3 mais recentes no dataset
  const ultimos3Meses = mesesOrdenados.slice(0, 3)

  // Gasto por key e mês
  const porMes = new Map<string, Map<string, number>>()
  for (const l of gastos) {
    const month = format(startOfMonth(l.data), 'yyyy-MM')
    const key = budgetKey(l.categoria, l.subcategoria)
    if (!porMes.has(month)) porMes.set(month, new Map())
    const byKey = porMes.get(month)!
    byKey.set(key, (byKey.get(key) ?? 0) + Math.abs(l.valor))
  }

  const result: {
    categoria: string
    subcategoria: string
    totalGastoPeriodo: number
    percentualGastoVsBudget: number | null
    mediaGasto3Meses: number
    percentualMediaVsBudget: number | null
    budget: number
  }[] = []

  for (const [key, bud] of budget) {
    if (bud <= 0) continue
    const [categoria, subcategoria] = key.includes('|') ? key.split('|') : [key, '']

    // Total no período selecionado
    let totalGastoPeriodo = 0
    if (filteredMonth) {
      const monthKey = format(filteredMonth, 'yyyy-MM')
      totalGastoPeriodo = porMes.get(monthKey)?.get(key) ?? 0
    } else {
      for (const [, byKey] of porMes) {
        totalGastoPeriodo += byKey.get(key) ?? 0
      }
    }

    // Média últimos 3 meses
    let soma3 = 0
    for (const m of ultimos3Meses) {
      soma3 += porMes.get(m)?.get(key) ?? 0
    }
    const mediaGasto3Meses = ultimos3Meses.length > 0 ? soma3 / ultimos3Meses.length : 0

    result.push({
      categoria,
      subcategoria,
      totalGastoPeriodo,
      percentualGastoVsBudget: bud > 0 ? (totalGastoPeriodo / bud) * 100 : null,
      mediaGasto3Meses,
      percentualMediaVsBudget: bud > 0 ? (mediaGasto3Meses / bud) * 100 : null,
      budget: bud,
    })
  }

  return result.sort((a, b) => b.totalGastoPeriodo - a.totalGastoPeriodo)
}

export function aggregateBudgetByCategory(aggregated: AggregatedSpend[]): CategoryBudgetSummary[] {
  const map = new Map<string, { gastoTotal: number; budgetTotal: number }>()

  for (const row of aggregated) {
    const existing = map.get(row.categoria) ?? { gastoTotal: 0, budgetTotal: 0 }
    map.set(row.categoria, {
      gastoTotal: existing.gastoTotal + row.total,
      budgetTotal: existing.budgetTotal + (row.budget ?? 0),
    })
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.budgetTotal > 0)
    .map(([categoria, { gastoTotal, budgetTotal }]) => {
      const saldoDisponivel = budgetTotal - gastoTotal
      const percentualUsado = budgetTotal > 0 ? (gastoTotal / budgetTotal) * 100 : 0
      return { categoria, gastoTotal, budgetTotal, saldoDisponivel, percentualUsado }
    })
    .sort((a, b) => a.saldoDisponivel - b.saldoDisponivel)
}

/**
 * Calcula o estado de saúde financeira do mês para o painel de semáforo.
 */
export function calcularSaudeFinanceira(
  aggregated: AggregatedSpend[],
  totalReceitas: number,
  totalGastos: number
): SaudeFinanceiraData {
  const budgetTotal = aggregated.reduce((s, r) => s + (r.budget ?? 0), 0)
  const gastoTotal = aggregated.reduce((s, r) => s + r.total, 0)
  const saldoMes = totalReceitas - totalGastos
  const percentualBudgetUsado = budgetTotal > 0 ? (gastoTotal / budgetTotal) * 100 : 0
  const categoriasAlerta = aggregated.filter(
    (r) => r.percentualUsado !== null && r.percentualUsado >= 80 && (r.budget ?? 0) > 0
  ).length

  let status: SaudeFinanceiraData['status']
  if (saldoMes < 0 || gastoTotal > budgetTotal) {
    status = 'alerta'
  } else if (categoriasAlerta > 0) {
    status = 'atencao'
  } else {
    status = 'ok'
  }

  return {
    status,
    budgetTotal,
    gastoTotal,
    saldoMes,
    totalReceitas,
    percentualBudgetUsado,
    categoriasAlerta,
  }
}
