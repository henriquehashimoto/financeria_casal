import type { AggregatedSpend } from '../types'

interface AlertasBudgetProps {
  data: AggregatedSpend[]
  limitePercentual?: number
}

function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export function AlertasBudget({ data, limitePercentual = 80 }: AlertasBudgetProps) {
  const alertas = data
    .filter((r) => r.percentualUsado !== null && r.percentualUsado >= limitePercentual && (r.budget ?? 0) > 0)
    .sort((a, b) => (b.percentualUsado ?? 0) - (a.percentualUsado ?? 0))

  if (alertas.length === 0) {
    return (
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          borderLeft: '4px solid var(--color-budget-ok)',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>
          Subcategorias próximas do budget
        </h3>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Nenhuma subcategoria chegou a {limitePercentual}% do budget no período.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        padding: '1.25rem',
        boxShadow: 'var(--shadow-sm)',
        borderLeft: '4px solid var(--color-budget-warn)',
      }}
    >
      <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>
        Subcategorias próximas ou acima do budget (≥{limitePercentual}%)
      </h3>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        {alertas.map((row) => {
          const pct = Math.round(row.percentualUsado ?? 0)
          const isOver = pct >= 100
          return (
            <div
              key={`${row.categoria}|${row.subcategoria}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 8,
                background: isOver ? 'rgba(166, 61, 61, 0.12)' : 'rgba(184, 134, 11, 0.12)',
                border: `1px solid ${isOver ? 'var(--color-budget-over)' : 'var(--color-budget-warn)'}`,
                fontSize: '0.9rem',
              }}
            >
              <span style={{ fontWeight: 600 }}>
                {row.categoria}
                {row.subcategoria && ` › ${row.subcategoria}`}
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: isOver ? 'var(--color-budget-over)' : 'var(--color-budget-warn)',
                  fontSize: '0.95rem',
                }}
              >
                {pct}%
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                {formatBrl(row.total)} / {formatBrl(row.budget ?? 0)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
