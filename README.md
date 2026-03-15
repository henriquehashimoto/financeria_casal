# Relatório Financeiro

Web app para visualizar gastos domésticos por categoria e subcategoria, com comparação contra o budget planejado.

## Como usar

1. Instale as dependências: `npm install`
2. Inicie o servidor: `npm run dev`
3. Acesse http://localhost:5173
4. Faça upload do arquivo .xlsx de lançamentos (export do banco)
5. O budget é carregado automaticamente de `public/data/planejamento_budget.csv`

## Estrutura

- **data/** - Arquivos de dados (budget, lançamentos)
- **src/lib/mapping.ts** - **Importante:** centraliza o mapeamento entre xlsx e budget. Atualize este arquivo ao alterar a estrutura dos dados.

## Scripts

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run preview` - Preview do build
