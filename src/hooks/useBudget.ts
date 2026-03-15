import { useState, useEffect } from 'react'
import { parseBudgetCsv } from '../lib/budgetParser'
import type { BudgetMap } from '../types'

export function useBudget(): { budget: BudgetMap | null; loading: boolean; error: string | null } {
  const [budget, setBudget] = useState<BudgetMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/data/planejamento_budget.csv')
      .then((r) => {
        if (!r.ok) throw new Error('Arquivo de budget não encontrado')
        return r.text()
      })
      .then((text) => {
        setBudget(parseBudgetCsv(text))
        setError(null)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Erro ao carregar budget')
        setBudget(null)
      })
      .finally(() => setLoading(false))
  }, [])

  return { budget, loading, error }
}
