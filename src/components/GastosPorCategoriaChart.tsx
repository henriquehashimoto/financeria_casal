import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AggregatedSpend, Lancamento } from '../types'

interface GastosPorCategoriaChartProps {
  data: AggregatedSpend[]
  lancamentos?: Lancamento[]
  filteredMonth?: Date
  periodLabel?: string
}

const CHART_COLORS = [
  '#2d5a3d', '#4a7c59', '#6b9d6b', '#8fbc8f',
  '#b8860b', '#a63d3d', '#5c5c5c', '#3d5a7c',
  '#7c5a3d', '#5a3d7c',
]

function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function GastosPorCategoriaChart({
  data,
  lancamentos = [],
  filteredMonth,
  periodLabel,
}: GastosPorCategoriaChartProps) {
  const [drillDownCategoria, setDrillDownCategoria] = useState<string | null>(null)
  const [drillDownSubcategoria, setDrillDownSubcategoria] = useState<string | null>(null)

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of data) {
      if (row.total <= 0) continue
      map.set(row.categoria, (map.get(row.categoria) ?? 0) + row.total)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [data])

  const bySubcategory = useMemo(() => {
    if (!drillDownCategoria) return []
    return data
      .filter((r) => r.categoria === drillDownCategoria && r.total > 0)
      .map((r) => ({ name: r.subcategoria || '(sem subcategoria)', value: r.total }))
      .sort((a, b) => b.value - a.value)
  }, [data, drillDownCategoria])

  // Individual items for selected subcategory
  const itemsSubcategoria = useMemo(() => {
    if (!drillDownCategoria || !drillDownSubcategoria) return []
    return lancamentos
      .filter((l) => {
        if (l.valor >= 0) return false
        if (l.categoria !== drillDownCategoria) return false
        const subLabel = l.subcategoria || '(sem subcategoria)'
        if (subLabel !== drillDownSubcategoria) return false
        if (filteredMonth) {
          const lMonth = new Date(l.data.getFullYear(), l.data.getMonth(), 1)
          const fMonth = new Date(filteredMonth.getFullYear(), filteredMonth.getMonth(), 1)
          if (lMonth.getTime() !== fMonth.getTime()) return false
        }
        return true
      })
      .sort((a, b) => b.data.getTime() - a.data.getTime())
  }, [lancamentos, drillDownCategoria, drillDownSubcategoria, filteredMonth])

  const showingItems = drillDownCategoria !== null && drillDownSubcategoria !== null
  const chartData = drillDownCategoria ? bySubcategory : byCategory
  const total = chartData.reduce((s, d) => s + d.value, 0)

  function handleBack() {
    if (showingItems) {
      setDrillDownSubcategoria(null)
    } else {
      setDrillDownCategoria(null)
    }
  }

  const breadcrumbs: string[] = []
  if (drillDownCategoria) breadcrumbs.push(drillDownCategoria)
  if (drillDownSubcategoria) breadcrumbs.push(drillDownSubcategoria)

  if (!showingItems && chartData.length === 0) {
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
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
            Distribuição dos gastos {periodLabel}
          </h3>
          {breadcrumbs.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
              <span
                style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                onClick={() => { setDrillDownCategoria(null); setDrillDownSubcategoria(null) }}
              >
                Todos
              </span>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-border)' }}>›</span>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: i === breadcrumbs.length - 1 ? 'var(--color-text)' : 'var(--color-text-muted)',
                      fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                      cursor: i < breadcrumbs.length - 1 ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (i === 0 && breadcrumbs.length > 1) setDrillDownSubcategoria(null)
                    }}
                  >
                    {crumb}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
        {(drillDownCategoria || drillDownSubcategoria) && (
          <button
            type="button"
            onClick={handleBack}
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
            ← Voltar
          </button>
        )}
      </div>

      {/* Items list (3rd level) */}
      {showingItems ? (
        <div>
          {itemsSubcategoria.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', padding: '1rem 0' }}>
              Nenhum item encontrado para este período.
            </p>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr auto',
                  gap: '0 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '0.4rem 0.6rem',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <span>Data</span>
                <span>Descrição</span>
                <span style={{ textAlign: 'right' }}>Valor</span>
              </div>
              {itemsSubcategoria.map((l, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1fr auto',
                    gap: '0 0.75rem',
                    padding: '0.55rem 0.6rem',
                    fontSize: '0.875rem',
                    borderBottom: i < itemsSubcategoria.length - 1 ? '1px solid var(--color-border)' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'var(--color-bg)',
                    borderRadius: 4,
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {format(l.data, 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.descricao || '—'}
                  </span>
                  <span style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-budget-over)', whiteSpace: 'nowrap' }}>
                    {formatBrl(Math.abs(l.valor))}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  paddingTop: '0.6rem',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  borderTop: '2px solid var(--color-border)',
                  marginTop: '0.25rem',
                }}
              >
                Total: {formatBrl(itemsSubcategoria.reduce((s, l) => s + Math.abs(l.valor), 0))}
              </div>
            </>
          )}
        </div>
      ) : (
        /* Pie chart (levels 1 and 2) */
        <>
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
                    if (entry?.name) {
                      if (!drillDownCategoria) {
                        setDrillDownCategoria(entry.name)
                      } else {
                        setDrillDownSubcategoria(entry.name)
                      }
                    }
                  }}
                  style={{ cursor: 'pointer' }}
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
                    const p = payload[0].payload as { name: string; value: number }
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
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-accent)', marginTop: '0.25rem' }}>
                          {drillDownCategoria ? 'Clique para ver os itens' : 'Clique para ver subcategorias'}
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
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            {drillDownCategoria
              ? 'Clique em uma subcategoria para ver os itens de gasto'
              : 'Clique em uma categoria para ver a distribuição por subcategoria'}
          </p>
        </>
      )}
    </div>
  )
}
