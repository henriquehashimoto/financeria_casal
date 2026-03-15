import { useState, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { BudgetMap } from '../types'
import type { Lancamento } from '../types'
import { aggregateSubcategoriaByMonth } from '../lib/aggregations'

interface BudgetSubcategoriaHistoricoChartProps {
  lancamentos: Lancamento[]
  budget: BudgetMap
}

const PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#84cc16',
]

function formatBrl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function shortLabel(key: string) {
  const parts = key.split('|')
  return parts.length === 2 ? parts[1] : key
}

export function BudgetSubcategoriaHistoricoChart({
  lancamentos,
  budget,
}: BudgetSubcategoriaHistoricoChartProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)

  const { months, subcategorias, data } = useMemo(
    () => aggregateSubcategoriaByMonth(lancamentos, budget),
    [lancamentos, budget]
  )

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const activeKeys = selected.size > 0 ? Array.from(selected) : subcategorias.slice(0, 5)

  const chartData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        monthLabel: format(new Date(row.month + '-01'), 'MMM yy', { locale: ptBR }),
      })),
    [data]
  )

  if (subcategorias.length === 0) return null

  return (
    <section style={{ marginBottom: 32 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#888',
            margin: 0,
          }}
        >
          % do budget usado por subcategoria — histórico mensal
        </h2>

        {/* Subcategory selector */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              fontFamily: 'inherit',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>
              {selected.size === 0
                ? `Top 5 subcategorias`
                : `${selected.size} selecionada(s)`}
            </span>
            <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
          </button>

          {open && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                padding: '0.5rem',
                maxHeight: 300,
                overflowY: 'auto',
                zIndex: 20,
                minWidth: 220,
              }}
            >
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.78rem',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-accent)',
                  cursor: 'pointer',
                  marginBottom: '0.25rem',
                  display: 'block',
                }}
              >
                Usar top 5
              </button>
              {subcategorias.map((key, i) => (
                <label
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.3rem 0',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={activeKeys.includes(key)}
                    onChange={() => toggle(key)}
                  />
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: PALETTE[i % PALETTE.length],
                      flexShrink: 0,
                    }}
                  />
                  {shortLabel(key)}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {months.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          Sem dados suficientes para exibir o histórico.
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11, fill: '#666' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: '#666' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']}
              />
              <ReferenceLine
                y={100}
                stroke="#dc2626"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: '100%', position: 'right', fontSize: 10, fill: '#dc2626' }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div
                      style={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        padding: '10px 14px',
                        fontSize: 12,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
                      {payload.map((p) => {
                        const absKey = `${p.dataKey}__abs`
                        const absVal = (p.payload as Record<string, number | string>)[absKey]
                        return (
                          <div
                            key={String(p.dataKey)}
                            style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}
                          >
                            <span style={{ color: p.color }}>{shortLabel(String(p.dataKey))}</span>
                            <span style={{ fontWeight: 600 }}>
                              {p.value}% · {formatBrl(Number(absVal))}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )
                }}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ fontSize: 11, color: '#555' }}>{shortLabel(value)}</span>
                )}
              />
              {activeKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={key}
                  fill={PALETTE[subcategorias.indexOf(key) % PALETTE.length] ?? PALETTE[i % PALETTE.length]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 11, color: '#aaa', marginTop: 8, textAlign: 'center' }}>
            Linha vermelha tracejada = 100% do budget. Valores acima indicam estouro.
          </p>
        </>
      )}
    </section>
  )
}
