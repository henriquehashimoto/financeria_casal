import type { AggregatedSpend } from '../types'

interface Top5GastosProps {
  data: AggregatedSpend[]
  periodLabel?: string
}

function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export function Top5Gastos({ data, periodLabel = 'do período' }: Top5GastosProps) {
  const top5 = data
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  if (top5.length === 0) {
    return (
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          padding: '1.5rem',
          color: 'var(--color-text-muted)',
          fontSize: '0.9rem',
        }}
      >
        Nenhum gasto no período selecionado
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
      }}
    >
      <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>
        Top 5 subcategorias em gasto {periodLabel}
      </h3>
      <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
        {top5.map((row, i) => (
          <li
            key={`${row.categoria}|${row.subcategoria}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 0',
              borderBottom: i < top5.length - 1 ? '1px solid var(--color-border)' : undefined,
              gap: '1rem',
            }}
          >
            <span>
              {row.subcategoria ? (
                <>
                  <strong>{row.categoria}</strong>
                  <span style={{ color: 'var(--color-text-muted)' }}> › {row.subcategoria}</span>
                </>
              ) : (
                <strong>{row.categoria}</strong>
              )}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              {formatBrl(row.total)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
