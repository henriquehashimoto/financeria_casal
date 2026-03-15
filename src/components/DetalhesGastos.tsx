import { useMemo, useState, useCallback } from 'react'
import { format, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Lancamento } from '../types'

interface DetalhesGastosProps {
  lancamentos: Lancamento[]
}

function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

type SortField = 'data' | 'valor' | 'categoria' | 'descricao'
type SortDir = 'asc' | 'desc'

export function DetalhesGastos({ lancamentos }: DetalhesGastosProps) {
  const [filtroCategorias, setFiltroCategorias] = useState<Set<string>>(new Set())
  const [filtroSubcategorias, setFiltroSubcategorias] = useState<Set<string>>(new Set())
  const [filtroMes, setFiltroMes] = useState<string>('')
  const [busca, setBusca] = useState('')
  const [openCategorias, setOpenCategorias] = useState(false)
  const [openSubcategorias, setOpenSubcategorias] = useState(false)
  const [sortField, setSortField] = useState<SortField>('data')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const gastos = useMemo(
    () => lancamentos.filter((l) => l.valor < 0),
    [lancamentos]
  )

  const categorias = useMemo(() => {
    const set = new Set(gastos.map((l) => l.categoria))
    return Array.from(set).sort()
  }, [gastos])

  const subcategorias = useMemo(() => {
    const set = new Set(gastos.map((l) => l.subcategoria).filter(Boolean))
    return Array.from(set).sort()
  }, [gastos])

  const meses = useMemo(() => {
    const set = new Set<string>()
    set.add(format(new Date(), 'yyyy-MM'))
    gastos.forEach((l) => set.add(format(l.data, 'yyyy-MM')))
    return Array.from(set).sort().reverse()
  }, [gastos])

  const toggleCategoria = useCallback((cat: string) => {
    setFiltroCategorias((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [])

  const toggleSubcategoria = useCallback((sub: string) => {
    setFiltroSubcategorias((prev) => {
      const next = new Set(prev)
      if (next.has(sub)) next.delete(sub)
      else next.add(sub)
      return next
    })
  }, [])

  const filtered = useMemo(() => {
    let result = gastos

    if (filtroCategorias.size > 0) {
      result = result.filter((l) => filtroCategorias.has(l.categoria))
    }
    if (filtroSubcategorias.size > 0) {
      result = result.filter((l) => filtroSubcategorias.has(l.subcategoria))
    }
    if (filtroMes) {
      const ref = filtroMes === 'current' ? new Date() : new Date(filtroMes + '-01')
      result = result.filter((l) => isSameMonth(l.data, ref))
    }
    if (busca.trim()) {
      const q = busca.trim().toLowerCase()
      result = result.filter(
        (l) =>
          l.descricao.toLowerCase().includes(q) ||
          l.categoria.toLowerCase().includes(q) ||
          l.subcategoria.toLowerCase().includes(q)
      )
    }

    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'data':
          cmp = a.data.getTime() - b.data.getTime()
          break
        case 'valor':
          cmp = Math.abs(a.valor) - Math.abs(b.valor)
          break
        case 'categoria':
          cmp = (a.categoria + a.subcategoria).localeCompare(b.categoria + b.subcategoria)
          break
        case 'descricao':
          cmp = a.descricao.localeCompare(b.descricao)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [gastos, filtroCategorias, filtroSubcategorias, filtroMes, busca, sortField, sortDir])

  const totalFiltrado = useMemo(
    () => filtered.reduce((s, l) => s + Math.abs(l.valor), 0),
    [filtered]
  )

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const Th = ({ field, label }: { field: SortField; label: string }) => (
    <th
      onClick={() => toggleSort(field)}
      style={{
        padding: '0.75rem 1rem',
        textAlign: 'left',
        fontWeight: 600,
        fontSize: '0.85rem',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {label} {sortField === field && (sortDir === 'asc' ? '↑' : '↓')}
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
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Detalhes dos gastos</h2>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'flex-end',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              Buscar
            </label>
            <input
              type="text"
              placeholder="Descrição, categoria..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                minWidth: 180,
              }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              Categorias
            </label>
            <button
              type="button"
              onClick={() => setOpenCategorias((o) => !o)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                minWidth: 180,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                {filtroCategorias.size === 0
                  ? 'Todas'
                  : `${filtroCategorias.size} selecionada(s)`}
              </span>
              <span>{openCategorias ? '▲' : '▼'}</span>
            </button>
            {openCategorias && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 4,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  boxShadow: 'var(--shadow-md)',
                  padding: '0.5rem',
                  maxHeight: 220,
                  overflowY: 'auto',
                  zIndex: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setFiltroCategorias(new Set())}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.8rem',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--color-accent)',
                    cursor: 'pointer',
                    marginBottom: '0.25rem',
                  }}
                >
                  Limpar
                </button>
                {categorias.map((c) => (
                  <label
                    key={c}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.35rem 0',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filtroCategorias.has(c)}
                      onChange={() => toggleCategoria(c)}
                    />
                    {c}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              Subcategorias
            </label>
            <button
              type="button"
              onClick={() => setOpenSubcategorias((o) => !o)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                minWidth: 180,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                {filtroSubcategorias.size === 0
                  ? 'Todas'
                  : `${filtroSubcategorias.size} selecionada(s)`}
              </span>
              <span>{openSubcategorias ? '▲' : '▼'}</span>
            </button>
            {openSubcategorias && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 4,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  boxShadow: 'var(--shadow-md)',
                  padding: '0.5rem',
                  maxHeight: 220,
                  overflowY: 'auto',
                  zIndex: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setFiltroSubcategorias(new Set())}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.8rem',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--color-accent)',
                    cursor: 'pointer',
                    marginBottom: '0.25rem',
                  }}
                >
                  Limpar
                </button>
                {subcategorias.map((s) => (
                  <label
                    key={s}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.35rem 0',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filtroSubcategorias.has(s)}
                      onChange={() => toggleSubcategoria(s)}
                    />
                    {s}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              Mês
            </label>
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                minWidth: 160,
              }}
            >
              <option value="">Todos</option>
              <option value="current">Mês atual</option>
              {meses.map((m) => (
                <option key={m} value={m}>
                  {format(new Date(m + '-01'), 'MMMM yyyy', { locale: ptBR })}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginLeft: 'auto', fontWeight: 600, fontSize: '1rem' }}>
            {filtered.length} itens • {formatBrl(totalFiltrado)}
          </div>
        </div>
      </div>

      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <Th field="data" label="Data" />
              <Th field="descricao" label="Descrição" />
              <Th field="categoria" label="Categoria" />
              <th
                style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                Subcategoria
              </th>
              <Th field="valor" label="Valor" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => (
              <tr
                key={`${item.data.getTime()}-${item.descricao}-${i}`}
                style={{
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
                  {format(item.data, "dd/MM/yyyy", { locale: ptBR })}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
                  {item.descricao || '—'}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
                  {item.categoria}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                  {item.subcategoria || '—'}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--color-budget-over)' }}>
                  {formatBrl(Math.abs(item.valor))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
          }}
        >
          Nenhum gasto encontrado com os filtros aplicados.
        </div>
      )}
    </div>
  )
}
