# Budget Mensal por Subcategoria — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o budget estático por um CSV com colunas mensais, permitindo editar, importar e exportar budgets por subcategoria mês a mês.

**Architecture:** Novo arquivo `public/data/budget_mensal.csv` com uma linha por subcategoria e uma coluna por mês. O hook `useBudget` carrega e expõe esse arquivo. `App.tsx` deriva o `BudgetMap` do mês selecionado. Um novo componente `GerenciarBudget` oferece edição inline, import e export.

**Tech Stack:** React 18, TypeScript, Vite, date-fns (já instalado)

---

## Arquivos

| Arquivo | Ação |
|---|---|
| `public/data/budget_mensal.csv` | Criar (migração dos dados atuais) |
| `src/types/index.ts` | Modificar — adicionar `MonthlyBudgetMap`, `MonthlyBudgetData` |
| `src/lib/budgetParser.ts` | Modificar — adicionar `parseMonthlyBudgetCsv`, `exportMonthlyBudgetCsv` |
| `src/hooks/useBudget.ts` | Substituir — nova fonte de dados e interface de retorno |
| `src/App.tsx` | Modificar — derivar `BudgetMap` por mês; integrar `GerenciarBudget` |
| `src/components/GerenciarBudget.tsx` | Criar — UI de edição, import, export |

---

## Task 1: Criar `public/data/budget_mensal.csv`

**Files:**
- Create: `public/data/budget_mensal.csv`

- [ ] **Step 1: Criar o arquivo CSV com os dados atuais migrados para 2026-04**

Conteúdo completo do arquivo (valores com ponto decimal, campos com vírgula entre aspas):

```
categoria,subcategoria,2026-04
Alimentação,Restaurantes e Bares,384.73
Alimentação,Delivery,111.70
Alimentação,Padaria,38.78
Assinaturas,Seguro Celular,91.04
Assinaturas,Streaming,72.94
Assinaturas,Serviços e Apps,161.91
Educação,MBA,1605.00
Educação,Livros,154.06
Educação,App e Serviços,202.41
Educação,Cursos,103.18
Gastos Pessoais,Salão,340.59
Gastos Pessoais,Eletrônicos e Gadgets,95.48
Gastos Pessoais,Roupas e Sapatos,239.35
Lazer,"Cinema, Teatro",151.71
Lazer,Outros Lazer,76.38
Moradia,Parcela Ap,4056.87
Moradia,Aluguel,2263.46
Moradia,Condominio,722.52
Moradia,Internet,382.71
Moradia,Itens de casa,269.93
Moradia,Energia,160.31
Moradia,Água,
Moradia,Manutenção,533.50
Outros Gastos,Doação,301.34
Outros Gastos,Presente,609.80
Outros Gastos,Casamento,3393.56
Outros Gastos,Outros,254.02
Pets,Banho e Tosa,295.90
Pets,Consulta Pet,347.20
Pets,Petshop,210.29
Saúde,Consulta e Procedimento,1466.65
Saúde,Academia,529.05
Saúde,Farmacia,234.54
Saúde,Esportes e Atividades,393.94
Saúde,Plano de Saúde,
Saúde,Suplemento,247.36
Supermercado,Lojinha,225.47
Supermercado,Mercado,379.96
Supermercado,Feira,89.28
Transporte,Combustível,421.70
Transporte,Aplicativo,256.60
Transporte,Estacionamento,65.98
Transporte,Mecanico,611.24
Transporte,Pedagio,167.20
Viagem,Gastos Viagens,512.77
Viagem,Hoteis,2538.82
Viagem,Passagem,5574.31
Viagem,Turismo,
```

- [ ] **Step 2: Verificar que o arquivo foi criado corretamente**

```bash
head -5 public/data/budget_mensal.csv
```

Esperado:
```
categoria,subcategoria,2026-04
Alimentação,Restaurantes e Bares,384.73
Alimentação,Delivery,111.70
Alimentação,Padaria,38.78
Assinaturas,Seguro Celular,91.04
```

- [ ] **Step 3: Commit**

```bash
git add public/data/budget_mensal.csv
git commit -m "data: add budget_mensal.csv with monthly budget columns"
```

---

## Task 2: Adicionar tipos a `src/types/index.ts`

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Adicionar `MonthlyBudgetMap` e `MonthlyBudgetData` ao final do arquivo**

```typescript
// Adicionar ao final de src/types/index.ts

/** Map<"YYYY-MM", Map<"categoria|subcategoria", number>> */
export type MonthlyBudgetMap = Map<string, Map<string, number>>

export interface MonthlyBudgetData {
  /** Lista ordenada de todas as subcategorias conhecidas (extraída das linhas do CSV) */
  subcategorias: { categoria: string; subcategoria: string }[]
  /** Lista ordenada de colunas de mês encontradas no CSV ("YYYY-MM") */
  months: string[]
  /** Budgets por mês e por chave categoria|subcategoria */
  budgets: MonthlyBudgetMap
}
```

- [ ] **Step 2: Verificar que o build não quebra**

```bash
npm run build 2>&1 | tail -20
```

Esperado: sem erros de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add MonthlyBudgetMap and MonthlyBudgetData types"
```

---

## Task 3: Atualizar `src/lib/budgetParser.ts`

**Files:**
- Modify: `src/lib/budgetParser.ts`

Adicionar duas funções após as existentes: `parseMonthlyBudgetCsv` e `exportMonthlyBudgetCsv`.

- [ ] **Step 1: Adicionar helper `parseCsvRow` para parsing de linha com N colunas**

Adicionar após a função `parseCsvLine` existente (linha 23 do arquivo atual):

```typescript
/** Parseia uma linha CSV com N colunas, respeitando campos entre aspas. */
function parseCsvRow(line: string): string[] {
  const result: string[] = []
  let i = 0
  while (i <= line.length) {
    if (i === line.length) {
      result.push('')
      break
    }
    if (line[i] === '"') {
      let end = i + 1
      while (end < line.length && line[end] !== '"') end++
      result.push(line.slice(i + 1, end))
      i = end + 2 // skip closing " and comma
    } else {
      const commaIdx = line.indexOf(',', i)
      if (commaIdx === -1) {
        result.push(line.slice(i))
        break
      }
      result.push(line.slice(i, commaIdx))
      i = commaIdx + 1
    }
  }
  return result
}
```

- [ ] **Step 2: Adicionar `parseMonthlyBudgetCsv` ao final do arquivo**

```typescript
/**
 * Parseia o CSV mensal de budget.
 * Formato esperado:
 *   categoria,subcategoria,2026-01,2026-02,...
 *   Alimentação,Delivery,111.70,120.00,...
 */
export function parseMonthlyBudgetCsv(csvText: string): MonthlyBudgetData {
  const emptyResult: MonthlyBudgetData = { subcategorias: [], months: [], budgets: new Map() }
  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) return emptyResult

  const headers = parseCsvRow(lines[0])
  // colunas de mês começam no índice 2
  const months = headers.slice(2).filter((h) => /^\d{4}-\d{2}$/.test(h))
  if (months.length === 0) return emptyResult

  const subcategorias: MonthlyBudgetData['subcategorias'] = []
  const budgets: MonthlyBudgetMap = new Map()

  for (const month of months) {
    budgets.set(month, new Map())
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvRow(lines[i])
    const categoria = cols[0]?.trim()
    const subcategoria = cols[1]?.trim()
    if (!categoria || !subcategoria) continue

    subcategorias.push({ categoria, subcategoria })
    const key = budgetKey(categoria, subcategoria)

    months.forEach((month, idx) => {
      const raw = cols[idx + 2]?.trim() ?? ''
      if (raw === '') return
      const value = parseFloat(raw)
      if (!isNaN(value) && value > 0) {
        budgets.get(month)!.set(key, value)
      }
    })
  }

  return { subcategorias, months, budgets }
}
```

Atualizar **apenas** a linha de import de tipos no topo do arquivo (a segunda linha, mantendo a primeira com `budgetKey`):

```typescript
// linha 1 — manter sem alteração:
import { budgetKey, BUDGET_CATEGORIES } from './mapping'
// linha 2 — substituir:
import type { BudgetMap, MonthlyBudgetData, MonthlyBudgetMap } from '../types'
```

- [ ] **Step 3: Adicionar `exportMonthlyBudgetCsv` ao final do arquivo**

```typescript
/**
 * Serializa MonthlyBudgetData de volta para string CSV.
 * Campos com vírgula são colocados entre aspas.
 */
export function exportMonthlyBudgetCsv(data: MonthlyBudgetData): string {
  const escapeField = (v: string) => (v.includes(',') ? `"${v}"` : v)

  const header = ['categoria', 'subcategoria', ...data.months].map(escapeField).join(',')

  const rows = data.subcategorias.map(({ categoria, subcategoria }) => {
    const key = budgetKey(categoria, subcategoria)
    const values = data.months.map((month) => {
      const val = data.budgets.get(month)?.get(key)
      return val !== undefined ? String(val) : ''
    })
    return [escapeField(categoria), escapeField(subcategoria), ...values].join(',')
  })

  return [header, ...rows].join('\n')
}
```

- [ ] **Step 4: Verificar build**

```bash
npm run build 2>&1 | tail -20
```

Esperado: sem erros de TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/lib/budgetParser.ts
git commit -m "feat: add parseMonthlyBudgetCsv and exportMonthlyBudgetCsv"
```

---

## Task 4: Atualizar `src/hooks/useBudget.ts`

**Files:**
- Modify: `src/hooks/useBudget.ts`

Substituir o conteúdo completo do arquivo:

- [ ] **Step 1: Reescrever `useBudget.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { parseMonthlyBudgetCsv } from '../lib/budgetParser'
import { budgetKey } from '../lib/mapping'
import type { MonthlyBudgetData } from '../types'

export function useBudget() {
  const [data, setData] = useState<MonthlyBudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/data/budget_mensal.csv')
      .then((r) => {
        if (!r.ok) throw new Error('Arquivo de budget não encontrado')
        return r.text()
      })
      .then((text) => {
        setData(parseMonthlyBudgetCsv(text))
        setError(null)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Erro ao carregar budget')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [])

  /** Atualiza o valor de uma subcategoria em um mês específico. value=null remove o budget. */
  const updateBudget = useCallback(
    (month: string, categoria: string, subcategoria: string, value: number | null) => {
      setData((prev) => {
        if (!prev) return prev
        const key = budgetKey(categoria, subcategoria)
        const newBudgets = new Map(prev.budgets)

        // garantir que o mês existe no map e na lista de meses
        let monthMap = new Map(newBudgets.get(month) ?? [])
        if (value === null || value <= 0) {
          monthMap.delete(key)
        } else {
          monthMap.set(key, value)
        }
        newBudgets.set(month, monthMap)

        // adicionar mês à lista se ainda não existir
        const months = prev.months.includes(month)
          ? prev.months
          : [...prev.months, month].sort()

        return { ...prev, months, budgets: newBudgets }
      })
    },
    []
  )

  /** Substitui todo o estado com dados importados de um CSV. */
  const replaceBudget = useCallback((newData: MonthlyBudgetData) => {
    setData(newData)
    setError(null)
  }, [])

  return { data, loading, error, updateBudget, replaceBudget }
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | tail -20
```

Esperado: erros de TypeScript em `App.tsx` (pois o retorno de `useBudget` mudou) — isso é esperado, será corrigido na Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useBudget.ts
git commit -m "feat: update useBudget to load budget_mensal.csv with monthly data"
```

---

## Task 5: Atualizar `src/App.tsx`

**Files:**
- Modify: `src/App.tsx`

Adaptar `App.tsx` para usar o novo retorno de `useBudget` e derivar `BudgetMap` por mês selecionado.

- [ ] **Step 1: Atualizar import de `budgetParser` — adicionar `exportMonthlyBudgetCsv` nos imports do arquivo (não há import de budgetParser ainda, não precisa adicionar)**

Não há import de `budgetParser` em App.tsx atualmente; nenhuma mudança necessária nesse ponto.

- [ ] **Step 2: Substituir a linha de desestruturação de `useBudget` e adicionar derivação de `budget`**

Localizar (linha 37 do App.tsx atual):
```typescript
  const { budget, loading: budgetLoading, error: budgetError } = useBudget()
```

Substituir por:
```typescript
  const { data: monthlyBudgetData, loading: budgetLoading, error: budgetError, updateBudget, replaceBudget } = useBudget()

  const budgetMonthKey = useMemo(() => {
    if (monthFilter === 'all') return null
    if (monthFilter === 'current') return format(new Date(), 'yyyy-MM')
    return monthFilter
  }, [monthFilter])

  const budget = useMemo(() => {
    if (!monthlyBudgetData || !budgetMonthKey) return new Map<string, number>()
    return monthlyBudgetData.budgets.get(budgetMonthKey) ?? new Map<string, number>()
  }, [monthlyBudgetData, budgetMonthKey])
```

- [ ] **Step 3: Atualizar a referência `budget` na linha de `aggregated` (já funciona, pois `budget` agora é `BudgetMap` igual antes)**

Verificar linha atual (linha 49):
```typescript
    return budget ? compareWithBudget(agg, budget) : []
```

Substituir por (remover a checagem de null pois `budget` agora é sempre `Map`, não `null`):
```typescript
    return compareWithBudget(agg, budget)
```

- [ ] **Step 4: Atualizar `resumoBudgetTableData` (linha 112)**

Localizar:
```typescript
  const resumoBudgetTableData = useMemo(
    () => (budget ? aggregateResumoBudgetTable(lancamentos, budget, filteredMonth) : []),
    [lancamentos, budget, filteredMonth]
  )
```

Substituir por:
```typescript
  const resumoBudgetTableData = useMemo(
    () => (budget.size > 0 ? aggregateResumoBudgetTable(lancamentos, budget, filteredMonth) : []),
    [lancamentos, budget, filteredMonth]
  )
```

- [ ] **Step 5: Atualizar referência `budget` no `BudgetSubcategoriaHistoricoChart` (linha 364)**

Localizar:
```typescript
          {budget && (
            <section style={{ marginBottom: '2rem', marginTop: '2rem' }}>
              <BudgetSubcategoriaHistoricoChart lancamentos={lancamentos} budget={budget} />
            </section>
          )}
```

Substituir por:
```typescript
          {budget.size > 0 && (
            <section style={{ marginBottom: '2rem', marginTop: '2rem' }}>
              <BudgetSubcategoriaHistoricoChart lancamentos={lancamentos} budget={budget} />
            </section>
          )}
```

- [ ] **Step 6: Adicionar import do componente `GerenciarBudget` no topo do arquivo**

Adicionar após os outros imports de componentes (ex: após linha 17):
```typescript
import { GerenciarBudget } from './components/GerenciarBudget'
```

- [ ] **Step 7: Adicionar seção `GerenciarBudget` no JSX, após `</section>` do FileUpload e antes da tab bar**

Localizar o bloco (linha 158):
```typescript
      </section>

      {/* Tab bar — always visible */}
```

Substituir por:
```typescript
      </section>

      {monthlyBudgetData && (
        <section style={{ marginBottom: '1.5rem' }}>
          <GerenciarBudget
            data={monthlyBudgetData}
            selectedMonth={budgetMonthKey ?? format(new Date(), 'yyyy-MM')}
            onUpdate={updateBudget}
            onReplace={replaceBudget}
          />
        </section>
      )}

      {/* Tab bar — always visible */}
```

- [ ] **Step 8: Verificar build**

```bash
npm run build 2>&1 | tail -30
```

Esperado: erro de TypeScript apenas por `GerenciarBudget` ainda não existir — será criado na Task 6. Se houver outros erros, corrigi-los agora.

- [ ] **Step 9: Commit parcial (sem o import de GerenciarBudget ainda)**

```bash
git add src/App.tsx
git commit -m "feat: derive BudgetMap from monthly budget by selected month"
```

---

## Task 6: Criar `src/components/GerenciarBudget.tsx`

**Files:**
- Create: `src/components/GerenciarBudget.tsx`

- [ ] **Step 1: Criar o componente completo**

```typescript
import { useState, useRef } from 'react'
import { format, subMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { parseMonthlyBudgetCsv, exportMonthlyBudgetCsv } from '../lib/budgetParser'
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Agrupar subcategorias por categoria
  const grouped = data.subcategorias.reduce<Record<string, string[]>>((acc, { categoria, subcategoria }) => {
    if (!acc[categoria]) acc[categoria] = []
    acc[categoria].push(subcategoria)
    return acc
  }, {})

  function getBudgetValue(categoria: string, subcategoria: string): string {
    const key = `${categoria}|${subcategoria}`
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
      const [categoria, subcategoria] = key.split('|')
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
                ref={fileInputRef}
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
                    const currentVal = getBudgetValue(categoria, subcategoria)
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
                              onChange={(e) => handleValueChange(categoria, subcategoria, e.target.value)}
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
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | tail -30
```

Esperado: build sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/GerenciarBudget.tsx
git commit -m "feat: add GerenciarBudget component for monthly budget editing"
```

---

## Task 7: Verificação final e integração

**Files:**
- Modify: `src/App.tsx` (adicionar import de GerenciarBudget, se ainda não foi feito na Task 5)

- [ ] **Step 1: Garantir que o import de `GerenciarBudget` está em `App.tsx`**

Verificar se a linha já existe:
```typescript
import { GerenciarBudget } from './components/GerenciarBudget'
```

Se não, adicionar após os outros imports de componentes.

- [ ] **Step 2: Build limpo**

```bash
npm run build 2>&1
```

Esperado: `✓ built in Xs` sem erros nem warnings de TypeScript.

- [ ] **Step 3: Rodar dev server e testar manualmente**

```bash
npm run dev
```

Verificar:
1. App abre sem erros no console
2. Seção "Gerenciar Budget" aparece e expande/colapsa
3. Selecionar mês no filtro → título da seção atualiza
4. Editar um valor → barras de progresso e alertas refletem a mudança imediatamente
5. Clicar "Exportar CSV" → baixa arquivo correto
6. Importar o CSV exportado → app mantém os mesmos valores
7. "Copiar mês anterior" → valores do mês M-1 são copiados para o mês atual

- [ ] **Step 4: Commit final**

```bash
git add src/App.tsx
git commit -m "feat: integrate GerenciarBudget into App layout"
```

---

## Resumo dos commits esperados

1. `data: add budget_mensal.csv with monthly budget columns`
2. `feat: add MonthlyBudgetMap and MonthlyBudgetData types`
3. `feat: add parseMonthlyBudgetCsv and exportMonthlyBudgetCsv`
4. `feat: update useBudget to load budget_mensal.csv with monthly data`
5. `feat: derive BudgetMap from monthly budget by selected month`
6. `feat: add GerenciarBudget component for monthly budget editing`
7. `feat: integrate GerenciarBudget into App layout`
