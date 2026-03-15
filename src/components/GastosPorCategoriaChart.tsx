import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { AggregatedSpend } from '../types'

interface GastosPorCategoriaChartProps {
  data: AggregatedSpend[]
  periodLabel?: string
}

const CHART_COLORS = [
  '#2d5a3d',
  '#4a7c59',
  '#6b9d6b',
  '#8fbc8f',
  '#b8860b',
  '#a63d3d',
  '#5c5c5c',
  '#3d5a7c',
  '#7c5a3d',
  '#5a3d7c',
]

function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function GastosPorCategoriaChart({ data, periodLabel }: GastosPorCategoriaChartProps) {
  const [drillDownCategoria, setDrillDownCategoria] = useState<string | null>(null)

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of data) {
      if (row.total <= 0) continue
      const cat = row.categoria
      map.set(cat, (map.get(cat) ?? 0) + row.total)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [data])

  const bySubcategory = useMemo(() => {
    if (!drillDownCategoria) return []
    return data
      .filter((r) => r.categoria === drillDownCategoria && r.total > 0)
      .map((r) => ({
        name: r.subcategoria || '(sem subcategoria)',
        value: r.total,
      }))
      .sort((a, b) => b.value - a.value)
  }, [data, drillDownCategoria])

  const chartData = drillDownCategoria ? bySubcategory : byCategory
  const total = chartData.reduce((s, d) => s + d.value, 0)

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
        Nenhum gasto no período para exibir
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
          Distribuição dos gastos {periodLabel ? periodLabel : ''}
        </h3>
        {drillDownCategoria && (
          <button
            type="button"
            onClick={() => setDrillDownCategoria(null)}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.85rem',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ← Voltar para categorias
          </button>
        )}
      </div>

      {drillDownCategoria && (
        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
          Subcategorias de <strong>{drillDownCategoria}</strong>
        </div>
      )}

      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
              onClick={(entry) => {
                if (!drillDownCategoria && entry?.name) {
                  setDrillDownCategoria(entry.name)
                }
              }}
              style={{ cursor: drillDownCategoria ? 'default' : 'pointer' }}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={index}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload
                const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0'
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
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: '0.9rem' }}>{formatBrl(p.value)}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {pct}% do total
                    </div>
                  </div>
                )
              }}
            />
            <Legend
              formatter={(value, entry) => {
                const val = (entry.payload as { value?: number })?.value ?? 0
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0'
                return `${value} (${pct}%)`
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {!drillDownCategoria && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          Clique em uma categoria para ver a distribuição por subcategoria
        </p>
      )}
    </div>
  )
}
