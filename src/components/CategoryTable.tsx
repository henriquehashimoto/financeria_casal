import { useState, useMemo } from 'react'
import { BudgetProgressBar } from './BudgetProgressBar'
import type { AggregatedSpend } from '../types'

interface CategoryTableProps {
  data: AggregatedSpend[]
}

function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export function CategoryTable({ data }: CategoryTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'total' | 'percent'>('total')

  const byCategory = useMemo(() => {
    const map = new Map<string, AggregatedSpend[]>()
    for (const row of data) {
      const list = map.get(row.categoria) ?? []
      list.push(row)
      map.set(row.categoria, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => (sortBy === 'total' ? b.total - a.total : (b.percentualUsado ?? 0) - (a.percentualUsado ?? 0)))
    }
    return Array.from(map.entries()).sort(([, a], [, b]) => {
      const sumA = a.reduce((s, x) => s + x.total, 0)
      const sumB = b.reduce((s, x) => s + x.total, 0)
      return sumB - sumA
    })
  }, [data, sortBy])

  const toggle = (cat: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Por categoria e subcategoria</h3>
        <button
          onClick={() => setSortBy((s) => (s === 'total' ? 'percent' : 'total'))}
          style={{
            padding: '0.35rem 0.75rem',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Ordenar por {sortBy === 'total' ? '% budget' : 'valor'}
        </button>
      </div>
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {byCategory.map(([categoria, rows]) => {
          const totalCat = rows.reduce((s, r) => s + r.total, 0)
          const budgetCat = rows.reduce((s, r) => s + (r.budget ?? 0), 0)
          const isExpanded = expanded.has(categoria)

          return (
            <div key={categoria} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <button
                onClick={() => toggle(categoria)}
                style={{
                  width: '100%',
                  padding: '0.9rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                }}
              >
                <span style={{ fontWeight: 600 }}>{categoria}</span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  {formatBrl(totalCat)}
                  {budgetCat > 0 && ` / ${formatBrl(budgetCat)}`}
                </span>
                <span style={{ marginLeft: '0.5rem' }}>{isExpanded ? '−' : '+'}</span>
              </button>
              {isExpanded && (
                <div style={{ padding: '0 1.25rem 1rem', background: 'rgba(0,0,0,0.02)' }}>
                  {rows.map((row) => (
                    <div key={`${row.categoria}|${row.subcategoria}`} style={{ marginBottom: '0.75rem' }}>
                      <BudgetProgressBar
                        total={row.total}
                        budget={row.budget}
                        label={row.subcategoria || '(sem subcategoria)'}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
