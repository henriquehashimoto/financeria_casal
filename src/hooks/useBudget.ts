import { useState, useEffect, useCallback } from 'react'
import { parseMonthlyBudgetCsv } from '../lib/budgetParser'
import { budgetKey } from '../lib/mapping'
import type { MonthlyBudgetData } from '../types'

export function useBudget() {
  const [data, setData] = useState<MonthlyBudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/data/budget_mensal.csv')
      .then((r) => {
        if (!r.ok) throw new Error('Arquivo de budget não encontrado')
        return r.text()
      })
      .then((text) => {
        setData(parseMonthlyBudgetCsv(text))
        setError(null)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Erro ao carregar budget')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [])

  /** Atualiza o valor de uma subcategoria em um mês específico. value=null remove o budget. */
  const updateBudget = useCallback(
    (month: string, categoria: string, subcategoria: string, value: number | null) => {
      setData((prev) => {
        if (!prev) return prev
        const key = budgetKey(categoria, subcategoria)
        const newBudgets = new Map(prev.budgets)

        // garantir que o mês existe no map e na lista de meses
        const monthMap = new Map(newBudgets.get(month) ?? [])
        if (value === null || value <= 0) {
          monthMap.delete(key)
        } else {
          monthMap.set(key, value)
        }
        newBudgets.set(month, monthMap)

        // adicionar mês à lista se ainda não existir
        const months = prev.months.includes(month)
          ? prev.months
          : [...prev.months, month].sort()

        return { ...prev, months, budgets: newBudgets }
      })
    },
    []
  )

  /**
   * Faz merge dos dados importados com o estado atual.
   * Meses do arquivo importado sobrescrevem os do estado; meses que só existem
   * no estado atual são preservados. A lista de subcategorias vem do arquivo importado.
   */
  const replaceBudget = useCallback((importedData: MonthlyBudgetData) => {
    setData((prev) => {
      if (!prev) return importedData

      // Meses: união de existentes + importados (importados sobrescrevem valores)
      const monthsSet = new Set([...prev.months, ...importedData.months])
      const months = Array.from(monthsSet).sort()

      const budgets = new Map(prev.budgets)
      importedData.budgets.forEach((monthMap, month) => {
        budgets.set(month, new Map(monthMap))
      })

      // Lista de subcategorias vem do arquivo importado (define estrutura de linhas)
      // Subcategorias que só existem no estado atual são descartadas — elas não estão no CSV
      return { subcategorias: importedData.subcategorias, months, budgets }
    })
    setError(null)
  }, [])

  return { data, loading, error, updateBudget, replaceBudget }
}
