/**
 * MAPEAMENTO OBRIGATÓRIO: XLSX (lancamentos) <-> Budget (planejamento_budget.csv)
 *
 * Este módulo centraliza a lógica de conexão entre os dois arquivos.
 * SEMPRE atualize este arquivo ao alterar:
 * - Estrutura/colunas do xlsx de lançamentos
 * - Estrutura do planejamento_budget.csv
 * - Lista de categorias (BUDGET_CATEGORIES)
 *
 * REGRA DE LOOKUP:
 * - XLSX coluna C (Categoria)    -> Budget: subcategoria de 2º nível (ex: Alimentação, Supermercado)
 * - XLSX coluna D (Subcategoria) -> Budget: sub-subcategoria / folha (ex: Delivery, Lojinha)
 *
 * Chave composta para lookup: "${categoria}|${subcategoria}"
 * Exemplos: "Alimentação|Delivery", "Supermercado|Lojinha", "Assinaturas|Streaming"
 */

export const XLSX_COLUMNS = {
  DATA_EVENTO: 0,      // A
  DATA_EFETIVACAO: 1,  // B
  CATEGORIA: 2,        // C - mapeia para subcategoria 2º nível do budget
  SUBCATEGORIA: 3,     // D - mapeia para sub-subcategoria (folha) do budget
  INST_FINANCEIRA: 4,
  CARTAO: 5,
  DESCRICAO: 6,
  VALOR: 7,
  STATUS: 8,
} as const

/** Gera a chave de lookup para buscar budget a partir de um lançamento */
export function budgetKey(categoria: string, subcategoria: string): string {
  return `${categoria}|${subcategoria}`
}

/** Separa a chave em categoria e subcategoria */
export function parseBudgetKey(key: string): { categoria: string; subcategoria: string } {
  const pipe = key.indexOf('|')
  if (pipe === -1) return { categoria: key, subcategoria: '' }
  return {
    categoria: key.slice(0, pipe),
    subcategoria: key.slice(pipe + 1),
  }
}

/**
 * Categorias de 2º nível no budget (que possuem sub-subcategorias).
 * Atualize esta lista ao alterar planejamento_budget.csv.
 */
export const BUDGET_CATEGORIES: readonly string[] = [
  'Receitas', 'Alimentação', 'Assinaturas', 'Educação', 'Gastos Pessoais', 'Lazer', 'Moradia',
  'Outros Gastos', 'Pets', 'Saúde', 'Supermercado', 'Transporte', 'Viagem',
]
