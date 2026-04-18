import { useState } from 'react'
import { format, subMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { parseMonthlyBudgetCsv, exportMonthlyBudgetCsv } from '../lib/budgetParser'
import { parseBudgetKey } from '../lib/mapping'
import type { MonthlyBudgetData } from '../types'

interface Props {
  data: MonthlyBudgetData
  selectedMonth: string // "YYYY-MM"
  onUpdate: (month: string, categoria: string, subcategoria: string, value: number | null) => void
  onReplace: (newData: MonthlyBudgetData) => void
}

function formatMonthLabel(ym: string): string {
  try {
    return format(parseISO(ym + '-01'), 'MMMM yyyy', { locale: ptBR })
  } catch {
    return ym
  }
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function GerenciarBudget({ data, selectedMonth, onUpdate, onReplace }: Props) {
  const [open, setOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [localValues, setLocalValues] = useState<Record<string, string>>({})

  // Agrupar subcategorias por categoria
  const grouped = data.subcategorias.reduce<Record<string, string[]>>((acc, { categoria, subcategoria }) => {
    if (!acc[categoria]) acc[categoria] = []
    acc[categoria].push(subcategoria)
    return acc
  }, {})

  function getDisplayValue(categoria: string, subcategoria: string): string {
    const key = `${categoria}|${subcategoria}`
    if (key in localValues) return localValues[key]
    const val = data.budgets.get(selectedMonth)?.get(key)
    return val !== undefined ? String(val) : ''
  }

  function handleValueChange(categoria: string, subcategoria: string, raw: string) {
    const trimmed = raw.trim()
    if (trimmed === '') {
      onUpdate(selectedMonth, categoria, subcategoria, null)
    } else {
      const num = parseFloat(trimmed.replace(',', '.'))
      if (!isNaN(num)) onUpdate(selectedMonth, categoria, subcategoria, num)
    }
  }

  function handleLocalChange(categoria: string, subcategoria: string, raw: string) {
    const key = `${categoria}|${subcategoria}`
    setLocalValues((prev) => ({ ...prev, [key]: raw }))
  }

  function handleBlur(categoria: string, subcategoria: string) {
    const key = `${categoria}|${subcategoria}`
    const raw = localValues[key] ?? ''
    setLocalValues((prev) => { const n = { ...prev }; delete n[key]; return n })
    handleValueChange(categoria, subcategoria, raw)
  }

  function handleExport() {
    const csv = exportMonthlyBudgetCsv(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'budget_mensal.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const parsed = parseMonthlyBudgetCsv(text)
        if (parsed.months.length === 0 || parsed.subcategorias.length === 0) {
          setImportError('CSV inválido: nenhuma coluna de mês ou subcategoria encontrada.')
          return
        }
        onReplace(parsed)
      } catch {
        setImportError('Erro ao ler o arquivo CSV.')
      }
    }
    reader.readAsText(file, 'utf-8')
    // limpar input para permitir reimport do mesmo arquivo
    e.target.value = ''
  }

  function handleCopyPrevMonth() {
    const prevYM = format(subMonths(parseISO(selectedMonth + '-01'), 1), 'yyyy-MM')
    const prevMap = data.budgets.get(prevYM)
    if (!prevMap || prevMap.size === 0) {
      alert(`Nenhum budget definido para ${formatMonthLabel(prevYM)}.`)
      return
    }
    prevMap.forEach((value, key) => {
      const { categoria, subcategoria } = parseBudgetKey(key)
      onUpdate(selectedMonth, categoria, subcategoria, value)
    })
  }

  const categorias = Object.keys(grouped)

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        background: 'var(--color-surface)',
      }}
    >
      {/* Header colapsável */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.9rem 1.25rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--color-text)',
          textAlign: 'left',
        }}
      >
        <span>Gerenciar Budget — {formatMonthLabel(selectedMonth)}</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{open ? '▲ fechar' : '▼ abrir'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          {/* Ações */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleCopyPrevMonth}
              style={btnStyle}
            >
              Copiar mês anterior
            </button>
            <button onClick={handleExport} style={btnStyle}>
              Exportar CSV
            </button>
            <label style={{ ...btnStyle, cursor: 'pointer' }}>
              Importar CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {importError && (
            <div
              style={{
                padding: '0.6rem 1rem',
                background: '#fde8e8',
                borderRadius: 'var(--radius)',
                color: 'var(--color-budget-over)',
                fontSize: '0.875rem',
                marginBottom: '1rem',
              }}
            >
              {importError}
            </div>
          )}

          {/* Tabela de edição */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Categoria</th>
                  <th style={thStyle}>Subcategoria</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>
                    Budget — {formatMonthLabel(selectedMonth)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((categoria) =>
                  grouped[categoria].map((subcategoria, idx) => {
                    const currentVal = getDisplayValue(categoria, subcategoria)
                    return (
                      <tr key={`${categoria}|${subcategoria}`} style={{ borderTop: idx === 0 ? '2px solid var(--color-border)' : '1px solid var(--color-border)' }}>
                        {idx === 0 && (
                          <td
                            rowSpan={grouped[categoria].length}
                            style={{
                              padding: '0.5rem 0.75rem',
                              fontWeight: 600,
                              verticalAlign: 'top',
                              color: 'var(--color-accent)',
                              whiteSpace: 'nowrap',
                              borderRight: '1px solid var(--color-border)',
                            }}
                          >
                            {categoria}
                          </td>
                        )}
                        <td style={{ padding: '0.4rem 0.75rem', color: 'var(--color-text)' }}>
                          {subcategoria}
                        </td>
                        <td style={{ padding: '0.4rem 0.75rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>R$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={currentVal}
                              placeholder="—"
                              onChange={(e) => handleLocalChange(categoria, subcategoria, e.target.value)}
                              onBlur={() => handleBlur(categoria, subcategoria)}
                              style={{
                                width: 110,
                                padding: '0.3rem 0.5rem',
                                border: '1px solid var(--color-border)',
                                borderRadius: 4,
                                fontFamily: 'inherit',
                                fontSize: '0.875rem',
                                textAlign: 'right',
                                background: 'var(--color-bg)',
                                color: 'var(--color-text)',
                              }}
                            />
                            {currentVal && (
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', minWidth: 70, textAlign: 'right' }}>
                                {formatBRL(parseFloat(currentVal))}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Alterações são aplicadas imediatamente na UI. Use "Exportar CSV" para salvar em{' '}
            <code>public/data/budget_mensal.csv</code> e persistir entre sessões.
          </p>
        </div>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)',
  background: 'var(--color-surface)',
  fontFamily: 'inherit',
  fontSize: '0.875rem',
  cursor: 'pointer',
  color: 'var(--color-text)',
}

const thStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  borderBottom: '2px solid var(--color-border)',
  whiteSpace: 'nowrap',
}
