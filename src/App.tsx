import { useMemo, useState } from 'react'
import { format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileUpload } from './components/FileUpload'
import { SummaryCards } from './components/SummaryCards'
import { CategoryTable } from './components/CategoryTable'
import { Top5Gastos } from './components/Top5Gastos'
import { AlertasBudget } from './components/AlertasBudget'
import { DetalhesGastos } from './components/DetalhesGastos'
import { Top5ItensGasto } from './components/Top5ItensGasto'
import { MonthlyChart } from './components/MonthlyChart'
import { GastosPorCategoriaChart } from './components/GastosPorCategoriaChart'
import { SaudeFinanceira } from './components/SaudeFinanceira'
import { SaldoDisponivelGrid } from './components/SaldoDisponivelGrid'
import { BudgetSubcategoriaHistoricoChart } from './components/BudgetSubcategoriaHistoricoChart'
import { useBudget } from './hooks/useBudget'
import { useLancamentos } from './hooks/useLancamentos'
import {
  aggregateByCategory,
  compareWithBudget,
  aggregateByMonth,
  aggregateReceitasByCategory,
  aggregateReceitasByMonth,
  aggregateReceitasAndGastosByMonth,
  receitasMapToAggregated,
  aggregateBudgetByCategory,
  calcularSaudeFinanceira,
} from './lib/aggregations'

type MonthFilter = 'current' | 'all' | string
type Tab = 'resumo' | 'detalhes'

function App() {
  const { budget, loading: budgetLoading, error: budgetError } = useBudget()
  const { lancamentos, loading: fileLoading, error: fileError, loadFile } = useLancamentos()
  const [monthFilter, setMonthFilter] = useState<MonthFilter>('current')
  const [activeTab, setActiveTab] = useState<Tab>('resumo')

  const filteredMonth = useMemo(() => {
    if (monthFilter === 'all') return undefined
    if (monthFilter === 'current') return startOfMonth(new Date())
    return monthFilter ? startOfMonth(new Date(monthFilter + '-01')) : undefined
  }, [monthFilter])

  const aggregated = useMemo(() => {
    const agg = aggregateByCategory(lancamentos, filteredMonth)
    return budget ? compareWithBudget(agg, budget) : []
  }, [lancamentos, budget, filteredMonth])

  const aggregatedReceitas = useMemo(() => {
    const agg = aggregateReceitasByCategory(lancamentos, filteredMonth)
    return receitasMapToAggregated(agg)
  }, [lancamentos, filteredMonth])

  const summary = useMemo(() => {
    const gastos = lancamentos.filter((l) => l.valor < 0)
    const receitas = lancamentos.filter((l) => l.valor > 0)

    const monthForMes =
      monthFilter === 'current'
        ? format(new Date(), 'yyyy-MM')
        : monthFilter === 'all'
          ? (() => {
              const months = new Set<string>()
              lancamentos.forEach((l) => months.add(format(l.data, 'yyyy-MM')))
              const sorted = Array.from(months).sort().reverse()
              return sorted[0] ?? format(new Date(), 'yyyy-MM')
            })()
          : monthFilter

    const totalGastosMes = gastos
      .filter((l) => format(l.data, 'yyyy-MM') === monthForMes)
      .reduce((s, l) => s + Math.abs(l.valor), 0)
    const totalGastosHistorico = gastos.reduce((s, l) => s + Math.abs(l.valor), 0)
    const totalReceitasMes = receitas
      .filter((l) => format(l.data, 'yyyy-MM') === monthForMes)
      .reduce((s, l) => s + l.valor, 0)
    const totalReceitasHistorico = receitas.reduce((s, l) => s + l.valor, 0)

    const gastosByMonth = aggregateByMonth(lancamentos)
    const receitasByMonth = aggregateReceitasByMonth(lancamentos)
    const mesesComDados = Math.max(gastosByMonth.size, receitasByMonth.size)
    const mediaGastosMensal = mesesComDados > 0 ? totalGastosHistorico / mesesComDados : 0
    const mediaReceitasMensal = mesesComDados > 0 ? totalReceitasHistorico / mesesComDados : 0

    const mesSelecionadoLabel =
      monthFilter === 'current'
        ? 'Mês atual'
        : monthFilter === 'all'
          ? 'Mês mais recente'
          : format(new Date(monthForMes + '-01'), 'MMMM yyyy', { locale: ptBR })

    return {
      totalGastosMes,
      totalGastosHistorico,
      mediaGastosMensal,
      totalReceitasMes,
      totalReceitasHistorico,
      mediaReceitasMensal,
      mesesComDados,
      mesSelecionadoLabel,
    }
  }, [lancamentos, monthFilter])

  const chartData = useMemo(() => aggregateReceitasAndGastosByMonth(lancamentos), [lancamentos])

  const saldoDisponivelData = useMemo(() => aggregateBudgetByCategory(aggregated), [aggregated])

  const saudeData = useMemo(
    () => calcularSaudeFinanceira(aggregated, summary.totalReceitasMes, summary.totalGastosMes),
    [aggregated, summary.totalReceitasMes, summary.totalGastosMes]
  )

  const monthOptions = useMemo(() => {
    const months = new Set<string>()
    months.add(format(new Date(), 'yyyy-MM'))
    lancamentos.forEach((l) => months.add(format(l.data, 'yyyy-MM')))
    return Array.from(months).sort().reverse().slice(0, 24)
  }, [lancamentos])

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontFamily: 'var(--font-display)' }}>
          Relatório Financeiro
        </h1>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          Receitas, gastos por categoria e comparação com budget
        </p>
      </header>

      {budgetError && (
        <div style={{ padding: '1rem', background: '#fde8e8', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
          {budgetError}
        </div>
      )}

      <section style={{ marginBottom: '2rem' }}>
        <FileUpload onFile={loadFile} loading={fileLoading} />
        {fileError && (
          <div style={{ marginTop: '0.5rem', color: 'var(--color-budget-over)', fontSize: '0.9rem' }}>
            {fileError}
          </div>
        )}
      </section>

      {lancamentos.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <button
              onClick={() => setActiveTab('resumo')}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                borderBottom: activeTab === 'resumo' ? '2px solid var(--color-accent)' : '2px solid transparent',
                background: 'transparent',
                fontFamily: 'inherit',
                fontSize: '1rem',
                fontWeight: activeTab === 'resumo' ? 600 : 400,
                color: activeTab === 'resumo' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              Resumo
            </button>
            <button
              onClick={() => setActiveTab('detalhes')}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                borderBottom: activeTab === 'detalhes' ? '2px solid var(--color-accent)' : '2px solid transparent',
                background: 'transparent',
                fontFamily: 'inherit',
                fontSize: '1rem',
                fontWeight: activeTab === 'detalhes' ? 600 : 400,
                color: activeTab === 'detalhes' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              Detalhes dos gastos
            </button>
          </div>

          {activeTab === 'resumo' && (
          <>
          <section style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Período:</label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value as MonthFilter)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                }}
              >
                <option value="current">Mês atual</option>
                <option value="all">Histórico (todos)</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {format(new Date(m + '-01'), 'MMMM yyyy', { locale: ptBR })}
                  </option>
                ))}
              </select>
            </div>
            <SaudeFinanceira data={saudeData} periodoLabel={summary.mesSelecionadoLabel} />
            <SummaryCards
              totalGastosMes={summary.totalGastosMes}
              totalGastosHistorico={summary.totalGastosHistorico}
              mediaGastosMensal={summary.mediaGastosMensal}
              mesesComDados={summary.mesesComDados}
              totalReceitasMes={summary.totalReceitasMes}
              totalReceitasHistorico={summary.totalReceitasHistorico}
              mediaReceitasMensal={summary.mediaReceitasMensal}
              mesSelecionadoLabel={summary.mesSelecionadoLabel}
            />
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <AlertasBudget data={aggregated} />
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <SaldoDisponivelGrid data={saldoDisponivelData} />
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
              }}
            >
              <Top5Gastos
                data={aggregated}
                periodLabel={
                  monthFilter === 'current'
                    ? 'do mês atual'
                    : monthFilter === 'all'
                      ? 'do histórico'
                      : `de ${format(new Date(monthFilter + '-01'), 'MMMM yyyy', { locale: ptBR })}`
                }
              />
              <Top5ItensGasto
                lancamentos={lancamentos}
                filteredMonth={filteredMonth}
                periodLabel={
                  monthFilter === 'current'
                    ? 'do mês atual'
                    : monthFilter === 'all'
                      ? 'do histórico'
                      : `de ${format(new Date(monthFilter + '-01'), 'MMMM yyyy', { locale: ptBR })}`
                }
              />
            </div>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.15rem' }}>Gastos por categoria</h2>
            <CategoryTable data={aggregated} />
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <GastosPorCategoriaChart
              data={aggregated}
              periodLabel={
                monthFilter === 'current'
                  ? '(mês atual)'
                  : monthFilter === 'all'
                    ? '(histórico)'
                    : `(${format(new Date(monthFilter + '-01'), 'MMMM yyyy', { locale: ptBR })})`
              }
            />
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.15rem' }}>Receitas por categoria</h2>
            <CategoryTable data={aggregatedReceitas} />
          </section>

          <section>
            <MonthlyChart data={chartData} />
          </section>

          {budget && (
            <section style={{ marginBottom: '2rem', marginTop: '2rem' }}>
              <BudgetSubcategoriaHistoricoChart lancamentos={lancamentos} budget={budget} />
            </section>
          )}
          </>
          )}

          {activeTab === 'detalhes' && (
            <section style={{ marginBottom: '2rem' }}>
              <DetalhesGastos lancamentos={lancamentos} />
            </section>
          )}
        </>
      )}

      {!budgetLoading && !budgetError && lancamentos.length === 0 && (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius)',
          }}
        >
          Faça upload do arquivo .xlsx de lançamentos para ver o relatório
        </div>
      )}
    </div>
  )
}

export default App
