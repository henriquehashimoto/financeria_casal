import type { CategoryBudgetSummary } from '../types'

interface SaldoDisponivelGridProps {
  data: CategoryBudgetSummary[]
}

function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function getStatusColor(pct: number): string {
  if (pct >= 100) return '#dc2626'
  if (pct >= 80) return '#d97706'
  return '#16a34a'
}

function getCardBg(pct: number): string {
  if (pct >= 100) return '#fef2f2'
  if (pct >= 80) return '#fffbeb'
  return '#f9fafb'
}

function getBarColor(pct: number): string {
  return getStatusColor(pct)
}

export function SaldoDisponivelGrid({ data }: SaldoDisponivelGridProps) {
  if (data.length === 0) return null

  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#888',
          marginBottom: 14,
        }}
      >
        Saldo disponível por categoria
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {data.map((cat) => {
          const pct = Math.min(cat.percentualUsado, 100)
          const isOver = cat.saldoDisponivel < 0
          const statusColor = getStatusColor(cat.percentualUsado)
          const cardBg = getCardBg(cat.percentualUsado)

          return (
            <div
              key={cat.categoria}
              style={{
                background: cardBg,
                border: `1px solid ${statusColor}33`,
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {/* Category name */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: '#555',
                  lineHeight: 1.2,
                }}
              >
                {cat.categoria}
              </div>

              {/* Available balance */}
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: statusColor,
                  lineHeight: 1,
                }}
              >
                {isOver ? '–' : ''}{formatBrl(Math.abs(cat.saldoDisponivel))}
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: 5,
                  background: '#e5e7eb',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: getBarColor(cat.percentualUsado),
                    borderRadius: 999,
                  }}
                />
              </div>

              {/* Subtext */}
              <div style={{ fontSize: 11, color: '#777' }}>
                {formatBrl(cat.gastoTotal)} gastos de {formatBrl(cat.budgetTotal)}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
