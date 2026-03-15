import React, { useMemo, useState } from 'react'

interface Row {
  categoria: string
  subcategoria: string
  totalGastoPeriodo: number
  percentualGastoVsBudget: number | null
  mediaGasto3Meses: number
  percentualMediaVsBudget: number | null
  budget: number
}

interface TabelaResumoBudgetProps {
  data: Row[]
  periodoLabel: string
}

function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatPct(value: number | null): string {
  if (value === null) return '—'
  return `${value.toFixed(1)}%`
}

export function TabelaResumoBudget({ data, periodoLabel }: TabelaResumoBudgetProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'categoria' | 'total' | 'pct' | 'media' | 'pctMedia'>('total')

  const byCategory = useMemo(() => {
    const map = new Map<string, Row[]>()
    for (const row of data) {
      const list = map.get(row.categoria) ?? []
      list.push(row)
      map.set(row.categoria, list)
    }
    const entries = Array.from(map.entries())
    const sortFn = (a: Row, b: Row) => {
      switch (sortBy) {
        case 'total':
          return b.totalGastoPeriodo - a.totalGastoPeriodo
        case 'pct':
          return (b.percentualGastoVsBudget ?? 0) - (a.percentualGastoVsBudget ?? 0)
        case 'media':
          return b.mediaGasto3Meses - a.mediaGasto3Meses
        case 'pctMedia':
          return (b.percentualMediaVsBudget ?? 0) - (a.percentualMediaVsBudget ?? 0)
        default:
          return a.subcategoria.localeCompare(b.subcategoria)
      }
    }
    for (const [, rows] of entries) {
      rows.sort(sortFn)
    }
    return entries.sort(([, a], [, b]) => {
      const sumA = a.reduce((s, r) => s + r.totalGastoPeriodo, 0)
      const sumB = b.reduce((s, r) => s + r.totalGastoPeriodo, 0)
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

  const th = (label: string, key: typeof sortBy) => (
    <th
      onClick={() => setSortBy(key)}
      style={{
        padding: '0.6rem 0.75rem',
        textAlign: 'right',
        fontWeight: 600,
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </th>
  )

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
          Resumo por categoria e subcategoria — {periodoLabel}
        </h3>
      </div>
      <div style={{ overflowX: 'auto', maxHeight: 480, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--color-surface)', zIndex: 1 }}>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th
                style={{
                  padding: '0.6rem 0.75rem',
                  textAlign: 'left',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                Categoria / Subcategoria
              </th>
              {th('Total período', 'total')}
              {th('% vs budget', 'pct')}
              {th('Média 3 meses', 'media')}
              {th('% média vs budget', 'pctMedia')}
            </tr>
          </thead>
          <tbody>
            {byCategory.map(([categoria, rows]) => {
              const isExpanded = expanded.has(categoria)
              const totalCat = rows.reduce((s, r) => s + r.totalGastoPeriodo, 0)
              const budgetCat = rows.reduce((s, r) => s + r.budget, 0)
              const mediaCat = rows.reduce((s, r) => s + r.mediaGasto3Meses, 0)
              const pctCat = budgetCat > 0 ? (totalCat / budgetCat) * 100 : null
              const pctMediaCat = budgetCat > 0 ? (mediaCat / budgetCat) * 100 : null

              return (
                <React.Fragment key={categoria}>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      background: isExpanded ? 'rgba(0,0,0,0.02)' : undefined,
                    }}
                  >
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <button
                        onClick={() => toggle(categoria)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          fontWeight: 600,
                        }}
                      >
                        <span style={{ opacity: 0.7 }}>{isExpanded ? '−' : '+'}</span>
                        {categoria}
                      </button>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                      {formatBrl(totalCat)}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                      {formatPct(pctCat)}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                      {formatBrl(mediaCat)}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                      {formatPct(pctMediaCat)}
                    </td>
                  </tr>
                  {isExpanded &&
                    rows.map((row) => (
                      <tr
                        key={`${row.categoria}|${row.subcategoria}`}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          background: 'rgba(0,0,0,0.02)',
                        }}
                      >
                        <td style={{ padding: '0.5rem 0.75rem 0.5rem 2.5rem', color: 'var(--color-text-muted)' }}>
                          {row.subcategoria || '(sem subcategoria)'}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                          {formatBrl(row.totalGastoPeriodo)}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                          {formatPct(row.percentualGastoVsBudget)}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                          {formatBrl(row.mediaGasto3Meses)}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                          {formatPct(row.percentualMediaVsBudget)}
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
