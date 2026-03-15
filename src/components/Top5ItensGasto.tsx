import { format, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Lancamento } from '../types'

interface Top5ItensGastoProps {
  lancamentos: Lancamento[]
  filteredMonth?: Date
  periodLabel?: string
}

function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export function Top5ItensGasto({
  lancamentos,
  filteredMonth,
  periodLabel = 'do período',
}: Top5ItensGastoProps) {
  const gastos = lancamentos
    .filter((l) => l.valor < 0)
    .filter((l) => !filteredMonth || isSameMonth(l.data, filteredMonth))
    .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
    .slice(0, 5)

  if (gastos.length === 0) {
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
        Top 5 itens de maior gasto {periodLabel}
      </h3>
      <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
        {gastos.map((item, i) => (
          <li
            key={`${item.data.getTime()}-${item.descricao}-${item.valor}-${i}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
              padding: '0.5rem 0',
              borderBottom:
                i < gastos.length - 1 ? '1px solid var(--color-border)' : undefined,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <span style={{ fontWeight: 600 }}>
                {item.descricao || '(sem descrição)'}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--color-budget-over)' }}>
                {formatBrl(Math.abs(item.valor))}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {item.categoria}
              {item.subcategoria && ` › ${item.subcategoria}`} •{' '}
              {format(item.data, "dd 'de' MMM", { locale: ptBR })}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
