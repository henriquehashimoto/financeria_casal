import type { SaudeFinanceiraData } from '../types'

interface SaudeFinanceiraProps {
  data: SaudeFinanceiraData
  periodoLabel?: string
}

function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_CONFIG = {
  ok: {
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: '●',
    label: 'Saudável',
    frase: (n: number) =>
      n > 0
        ? 'Você está dentro do orçamento. Continue assim!'
        : 'Suas receitas cobrem os gastos e o orçamento está controlado.',
  },
  atencao: {
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: '◆',
    label: 'Atenção',
    frase: (n: number) =>
      `Atenção: ${n} ${n === 1 ? 'categoria próxima' : 'categorias próximas'} do limite. Revise seus gastos.`,
  },
  alerta: {
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: '▲',
    label: 'Alerta',
    frase: (_n: number) =>
      'Gastos acima do orçamento ou saldo negativo este mês. Ação necessária.',
  },
}

export function SaudeFinanceira({ data, periodoLabel }: SaudeFinanceiraProps) {
  const cfg = STATUS_CONFIG[data.status]
  const barPct = Math.min(data.percentualBudgetUsado, 100)
  const overBudget = data.percentualBudgetUsado > 100

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        borderRadius: 16,
        padding: '20px 28px',
        marginBottom: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            fontSize: 20,
            color: cfg.color,
            lineHeight: 1,
          }}
        >
          {cfg.icon}
        </span>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: cfg.color,
              marginBottom: 2,
            }}
          >
            Saúde Financeira{periodoLabel ? ` · ${periodoLabel}` : ''} · {cfg.label}
          </div>
          <div
            style={{
              fontSize: 15,
              color: '#1a1a1a',
              fontWeight: 500,
            }}
          >
            {cfg.frase(data.categoriasAlerta)}
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        {[
          { label: 'Receitas', value: formatBrl(data.totalReceitas), color: '#16a34a' },
          { label: 'Gastos', value: formatBrl(data.gastoTotal), color: '#dc2626' },
          {
            label: 'Saldo',
            value: formatBrl(data.saldoMes),
            color: data.saldoMes >= 0 ? '#16a34a' : '#dc2626',
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: '#ffffff88',
              borderRadius: 10,
              padding: '10px 14px',
              borderLeft: `3px solid ${color}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#666',
                marginBottom: 4,
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Budget progress bar */}
      {data.budgetTotal > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 6,
              fontSize: 12,
              color: '#555',
            }}
          >
            <span>Orçamento total utilizado</span>
            <span style={{ fontWeight: 700, color: cfg.color }}>
              {data.percentualBudgetUsado.toFixed(0)}% · {formatBrl(data.gastoTotal)} de{' '}
              {formatBrl(data.budgetTotal)}
            </span>
          </div>
          <div
            style={{
              height: 8,
              background: '#e5e7eb',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${barPct}%`,
                background: overBudget
                  ? '#dc2626'
                  : data.percentualBudgetUsado >= 80
                  ? '#d97706'
                  : cfg.color,
                borderRadius: 999,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
