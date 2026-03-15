interface BudgetProgressBarProps {
  total: number
  budget: number | null
  label?: string
}

function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export function BudgetProgressBar({ total, budget, label }: BudgetProgressBarProps) {
  const percent = budget !== null && budget > 0 ? Math.min((total / budget) * 100, 150) : null
  let color = 'var(--color-budget-ok)'
  if (percent !== null) {
    if (percent > 100) color = 'var(--color-budget-over)'
    else if (percent > 80) color = 'var(--color-budget-warn)'
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
        {label && <span>{label}</span>}
        <span style={{ color: 'var(--color-text-muted)' }}>
          {formatBrl(total)}
          {budget !== null && budget > 0 && (
            <> / {formatBrl(budget)} {percent !== null && `(${percent.toFixed(0)}%)`}</>
          )}
          {budget === null && ' (sem budget)'}
        </span>
      </div>
      {percent !== null && (
        <div
          style={{
            height: 6,
            background: 'var(--color-border)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              background: color,
              borderRadius: 3,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      )}
    </div>
  )
}
