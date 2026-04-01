# Relatório Financeiro

Web app para visualizar gastos domésticos por categoria e subcategoria, com comparação contra o budget planejado.

## Como usar

1. Instale as dependências: `npm install`
2. (Opcional) Para fluxos que chamam o Gemini, copie `.env.example` para `.env` e defina `VITE_GEMINI_API_KEY`.
3. Inicie o servidor: `npm run dev`
4. Acesse http://localhost:5173
5. Faça upload do arquivo .xlsx de lançamentos (export do banco)
6. O budget é carregado automaticamente de `public/data/planejamento_budget.csv`

## Estrutura

- **data/** - Arquivos de dados (budget, lançamentos)
- **src/lib/mapping.ts** - **Importante:** centraliza o mapeamento entre xlsx e budget. Atualize este arquivo ao alterar a estrutura dos dados.

## Scripts

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run preview` - Preview do build
