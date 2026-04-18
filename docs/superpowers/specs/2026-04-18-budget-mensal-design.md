# Budget Mensal por Subcategoria — Design Spec

**Data:** 2026-04-18  
**Status:** Aprovado

---

## Contexto

Atualmente o app carrega um único arquivo `public/data/planejamento_budget.csv` com valores de budget fixos por subcategoria, iguais para todos os meses. O objetivo é permitir definir e modificar o budget de cada subcategoria mês a mês.

---

## Objetivo

Permitir que o usuário defina budgets mensais individuais por subcategoria, editáveis dentro do app, exportáveis e importáveis via CSV.

---

## Solução: novo arquivo CSV com colunas mensais

### Formato do arquivo `public/data/budget_mensal.csv`

```
categoria,subcategoria,2026-01,2026-02,2026-03
Alimentação,Restaurantes e Bares,384.73,400.00,
Alimentação,Delivery,111.70,111.70,120.00
Alimentação,Padaria,38.78,,
Moradia,Parcela Ap,4056.87,4056.87,4056.87
...
```

- **Linhas:** uma por subcategoria, identificada pelo par `categoria + subcategoria`
- **Colunas de mês:** formato `YYYY-MM`, uma por mês com budget definido
- **Célula vazia ou coluna ausente:** sem budget para aquele mês (sem comparação na UI)
- **Valores:** ponto decimal (`.`) internamente no CSV
- A chave de join continua sendo `budgetKey(categoria, subcategoria)` = `"categoria|subcategoria"` (inalterada)

### Migração inicial

O arquivo `planejamento_budget.csv` atual é convertido em `budget_mensal.csv` com uma coluna `2026-01` usando os valores existentes como ponto de partida. O arquivo antigo pode ser mantido como backup, mas deixa de ser carregado pelo app.

---

## Estrutura de dados

### Tipo novo: `MonthlyBudgetMap`

```ts
// src/types/index.ts (adição)
type MonthlyBudgetMap = Map<string, Map<string, number>>
// chave externa: "YYYY-MM"
// chave interna: "categoria|subcategoria"
// valor: número (BRL)
```

### `BudgetMap` (existente, sem mudança de interface)

```ts
type BudgetMap = Map<string, number>
// derivado de MonthlyBudgetMap.get(filteredMonth) ?? new Map()
```

Todos os componentes downstream recebem `BudgetMap` igual antes — sem mudança de interface.

---

## Mudanças em arquivos existentes

### `src/lib/budgetParser.ts`

- Adicionar `parseMonthlyBudgetCsv(text: string): MonthlyBudgetMap`
  - Lê cabeçalho, identifica colunas de mês (`/^\d{4}-\d{2}$/`)
  - Para cada linha: extrai `categoria`, `subcategoria`, e o valor de cada coluna de mês
  - Valores vazios ou não numéricos → ignorados (não inseridos no map)
- Manter `parseBudgetCsv` existente durante período de transição (pode ser removido após migração confirmada)

### `src/hooks/useBudget.ts`

- Passar a carregar `budget_mensal.csv` em vez de `planejamento_budget.csv`
- Retornar:
  ```ts
  {
    monthlyBudget: MonthlyBudgetMap,
    loading: boolean,
    error: string | null,
    updateMonthlyBudget: (month: string, key: string, value: number | null) => void,
    replaceMonthlyBudget: (newMap: MonthlyBudgetMap) => void,
  }
  ```

### `src/App.tsx`

- Derivar `budget: BudgetMap` a partir de `monthlyBudget.get(filteredMonth) ?? new Map()`
- Quando `filteredMonth` for null (visão "todos os meses"): `budget = new Map()` (sem comparação)
- Passar `monthlyBudget` e `updateMonthlyBudget` para o novo componente `GerenciarBudget`

---

## Novo componente: `GerenciarBudget.tsx`

Seção colapsável no topo do app (abaixo do `FileUpload`, acima das métricas).

### Interface

- **Cabeçalho colapsável:** "Gerenciar Budget" com ícone de expand/collapse
- **Seletor de mês:** sincronizado com o filtro global `filteredMonth`; lista os meses com coluna no CSV + opção de adicionar novo mês
- **Tabela editável:**
  - Agrupada por `categoria`
  - Linhas: uma por subcategoria com `<input type="number" step="0.01">` mostrando o valor do mês selecionado
  - Células vazias = sem budget (input em branco)
  - Atualizações chamam `updateMonthlyBudget` imediatamente (sem botão "salvar" intermediário — a UI do app reflete em tempo real)
- **Botão "Exportar CSV":** gera e baixa `budget_mensal.csv` com todos os meses do estado atual
- **Botão "Importar CSV":** `<input type="file" accept=".csv">` que faz parse e chama `replaceMonthlyBudget`; exibe erro inline se formato inválido
- **Botão "Copiar mês anterior":** preenche o mês selecionado com os valores do mês imediatamente anterior (se existir)

### Geração do CSV para exportação

```
categoria,subcategoria,2026-01,2026-02,...
Alimentação,Restaurantes e Bares,384.73,400.00,...
```

Subcategorias sem nenhum valor definido em nenhum mês são omitidas do CSV exportado.

---

## Tratamento de erros

| Situação | Comportamento |
|---|---|
| `budget_mensal.csv` não encontrado no carregamento | `monthlyBudget` = mapa vazio; app funciona sem budget |
| CSV importado com formato inválido | Mensagem de erro inline no `GerenciarBudget`; estado não é alterado |
| Mês selecionado sem coluna no CSV | `BudgetMap` vazio → sem barras de progresso, sem alertas |
| Valor não numérico numa célula | Ignorado (não inserido no map) |
| `filteredMonth` = null (todos os meses) | `BudgetMap` vazio; sem comparação de budget na UI |

---

## Fora do escopo

- Salvar automaticamente no servidor (sem backend)
- Histórico de versões do CSV
- Budget por semana ou quinzena
- Autenticação ou perfis de usuário
- Sincronização entre dispositivos

---

## Impacto nos componentes existentes

| Componente | Impacto |
|---|---|
| `CategoryTable`, `BudgetProgressBar`, `AlertasBudget`, `TabelaResumoBudget`, `SaldoDisponivelGrid`, `SaudeFinanceira` | Nenhum — continuam recebendo `BudgetMap` igual antes |
| `App.tsx` | Derivação de `BudgetMap` a partir de `MonthlyBudgetMap` |
| `useBudget.ts` | Substituição da fonte de dados e retorno expandido |
| `budgetParser.ts` | Novo parser adicionado |
| `types/index.ts` | Adição de `MonthlyBudgetMap` |

---

## Arquivos novos/modificados

| Arquivo | Ação |
|---|---|
| `public/data/budget_mensal.csv` | Criar (migração do CSV atual) |
| `src/lib/budgetParser.ts` | Modificar (adicionar `parseMonthlyBudgetCsv`) |
| `src/hooks/useBudget.ts` | Modificar (nova fonte, novo retorno) |
| `src/types/index.ts` | Modificar (adicionar `MonthlyBudgetMap`) |
| `src/App.tsx` | Modificar (derivação de `BudgetMap`, passar props) |
| `src/components/GerenciarBudget.tsx` | Criar (novo componente) |
| `docs/superpowers/specs/2026-04-18-budget-mensal-design.md` | Criar (este documento) |
