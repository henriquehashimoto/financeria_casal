import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MonthlyChartProps {
  data: { month: string; receitas: number; gastos: number; saldo: number }[]
}

function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const chartData = useMemo(
    () =>
      data
        .map((d) => ({
          ...d,
          label: (() => {
            try {
              return format(parseISO(d.month + '-01'), 'MMM yyyy', { locale: ptBR })
            } catch {
              return d.month
            }
          })(),
        }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    [data]
  )

  if (chartData.length === 0) {
    return (
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
        }}
      >
        Carregue os lançamentos para ver o gráfico mensal
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
      <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Receitas vs Gastos por mês</h3>
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatBrl(v).replace(/\s/g, '')} width={70} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: unknown) => formatBrl(Number(value ?? 0))}
              contentStyle={{ fontSize: 14 }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.label}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload
                return (
                  <div
                    style={{
                      background: 'var(--color-surface)',
                      padding: '0.75rem 1rem',
                      borderRadius: 6,
                      boxShadow: 'var(--shadow-md)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{p.label}</div>
                    <div style={{ fontSize: '0.9rem' }}>Receitas: {formatBrl(p.receitas)}</div>
                    <div style={{ fontSize: '0.9rem' }}>Gastos: {formatBrl(p.gastos)}</div>
                    <div
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        marginTop: '0.25rem',
                        color: p.saldo >= 0 ? 'var(--color-budget-ok)' : 'var(--color-budget-over)',
                      }}
                    >
                      Saldo: {formatBrl(p.saldo)}
                    </div>
                  </div>
                )
              }}
            />
            <Legend />
            <Bar dataKey="receitas" name="Receitas" fill="var(--color-budget-ok)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="gastos" name="Gastos" fill="var(--color-budget-over)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
