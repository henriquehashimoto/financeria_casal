export interface Lancamento {
  data: Date
  categoria: string
  subcategoria: string
  descricao: string
  valor: number
  status: string
}

export interface AggregatedSpend {
  categoria: string
  subcategoria: string
  total: number
  budget: number | null
  percentualUsado: number | null
}

export interface CategoryBudgetSummary {
  categoria: string
  gastoTotal: number
  budgetTotal: number
  saldoDisponivel: number
  percentualUsado: number
}

export type StatusSaude = 'ok' | 'atencao' | 'alerta'

export interface SaudeFinanceiraData {
  status: StatusSaude
  budgetTotal: number
  gastoTotal: number
  saldoMes: number
  totalReceitas: number
  percentualBudgetUsado: number
  categoriasAlerta: number
}

export type BudgetMap = Map<string, number>
