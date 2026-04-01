#!/usr/bin/env python3
"""
Atualiza planejamento_budget.csv com base nos gastos reais do Excel de lançamentos.
Identifica gastos recorrentes e parcelas pendentes, gerando gastos_planejados_proximos_meses.csv.

Regras:
- MBA: fixo R$ 1.605 (não recalcular)
- Parcela Ap e Parcela Ap 707: mesma despesa recorrente (não tratar como parcelado)
- Recorrentes fixos: usar média mensal
- Recorrentes variáveis: usar média × 1,1 (10% margem)
- Novas categorias com gasto: adicionar ao budget
"""

import argparse
import csv
import re
import sys
from pathlib import Path

import pandas as pd

# Paths relativos ao script
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
DATA_DIR = SCRIPT_DIR.parent / "data"
PUBLIC_DATA_DIR = SCRIPT_DIR.parent / "public" / "data"

# Valores fixos (não recalcular)
FIXOS = {
    "Educação|MBA": 1605.0,
}

# Descrições que são Parcela Ap recorrente (excluir da detecção de parcelas)
PARCELA_AP_PATTERNS = ["parcela ap", "parcela ap 707"]


def format_br(value: float) -> str:
    """Formata número no padrão pt-BR: 1.234,56"""
    if value == 0:
        return "---"
    s = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return s


def parse_br(value: str) -> float | None:
    """Parse valor pt-BR para float"""
    if not value or value.strip() == "---":
        return None
    cleaned = value.replace(".", "").replace(",", ".").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def load_lancamentos(excel_path: Path) -> pd.DataFrame:
    """Carrega e normaliza lançamentos do Excel."""
    df = pd.read_excel(excel_path)
    df["Data do evento"] = pd.to_datetime(df["Data do evento"])
    gastos = df[df["Valor"] < 0].copy()
    gastos["valor_abs"] = gastos["Valor"].abs()
    gastos["mes"] = gastos["Data do evento"].dt.to_period("M")
    return gastos


def is_parcela_ap(desc: str) -> bool:
    """Verifica se a descrição é da Parcela Ap recorrente."""
    if pd.isna(desc):
        return False
    d = str(desc).lower()
    return any(p in d for p in PARCELA_AP_PATTERNS)


def normalize_parcela_ap(gastos: pd.DataFrame) -> pd.DataFrame:
    """Unifica Parcela Ap e Parcela Ap 707 como mesma subcategoria."""
    g = gastos.copy()
    mask = (g["Categoria"] == "Moradia") & g["Descrição"].apply(is_parcela_ap)
    g.loc[mask, "Subcategoria"] = "Parcela Ap"
    return g


def extract_parcela_info(desc: str) -> tuple[int, int] | None:
    """Extrai (parcela_atual, total_parcelas) da descrição. Retorna None se não for parcela."""
    if pd.isna(desc):
        return None
    s = str(desc)
    if is_parcela_ap(s):
        return None  # Parcela Ap é recorrente, não parcelado
    m = re.search(r"[Pp]arcela\s+(\d+)\s*(?:/|de)\s*(\d+)", s)
    if m:
        return (int(m.group(1)), int(m.group(2)))
    m = re.search(r"(?:^|\s)(\d+)\s+de\s+(\d+)(?:\s|$|\.)", s)
    if m:
        return (int(m.group(1)), int(m.group(2)))
    return None


def get_media_mensal(gastos: pd.DataFrame) -> dict[str, float]:
    """Retorna média mensal por categoria|subcategoria.
    Para recorrentes: usa média dos meses em que houve pagamento (não total/n_meses).
    """
    gastos = normalize_parcela_ap(gastos)
    # Média por mês em que houve gasto (melhor para despesas recorrentes)
    por_mes = gastos.groupby(["Categoria", "Subcategoria", "mes"])["valor_abs"].sum().reset_index()
    media = por_mes.groupby(["Categoria", "Subcategoria"]).agg(
        total=("valor_abs", "sum"),
        meses_com_gasto=("mes", "nunique"),
    )
    media["media"] = media["total"] / media["meses_com_gasto"]
    return {
        f"{c}|{s}": v
        for (c, s), v in media["media"].items()
        if v > 0
    }


def get_recorrentes_fixos() -> set[str]:
    """Categorias com gasto fixo mensal (usar média sem margem)."""
    return {
        "Moradia|Parcela Ap",
        "Moradia|Aluguel",
        "Moradia|Condominio",
        "Moradia|Internet",
        "Moradia|Energia",
        "Educação|MBA",
        "Assinaturas|Seguro Celular",
        "Assinaturas|Streaming",
    }


def get_parcelas_pendentes(gastos: pd.DataFrame) -> list[dict]:
    """Identifica parcelas pendentes (exclui Parcela Ap)."""
    gastos = gastos[~gastos["Descrição"].apply(is_parcela_ap)]

    def desc_base(desc: str) -> str:
        s = str(desc)
        s = re.sub(r"[Pp]arcela\s+\d+\s*(?:/|de)\s*\d+", "", s)
        s = re.sub(r"\d+\s+de\s+\d+", "", s)
        return re.sub(r"\s+", " ", s).strip()[:60]

    gastos = gastos.copy()
    gastos["parcela_info"] = gastos["Descrição"].apply(extract_parcela_info)
    parcelados = gastos[gastos["parcela_info"].notna()].copy()
    parcelados["desc_base"] = parcelados["Descrição"].apply(desc_base)

    result = []
    for (desc_base_val, cat, sub), grp in parcelados.groupby(
        ["desc_base", "Categoria", "Subcategoria"]
    ):
        max_parcela = max(p[1] for p in grp["parcela_info"])
        parcelas_pagas = max(p[0] for p in grp["parcela_info"])
        parcelas_restantes = max_parcela - parcelas_pagas
        if parcelas_restantes <= 0:
            continue
        valor_medio = grp["valor_abs"].mean()
        result.append(
            {
                "descricao": desc_base_val,
                "categoria": cat,
                "subcategoria": sub,
                "parcelas_restantes": parcelas_restantes,
                "valor_parcela": round(valor_medio, 2),
                "valor_restante": round(valor_medio * parcelas_restantes, 2),
            }
        )
    return result


def get_recorrentes(gastos: pd.DataFrame) -> list[dict]:
    """Identifica gastos recorrentes (3+ meses, CV < 0.5)."""
    gastos = normalize_parcela_ap(gastos)
    rec = (
        gastos.groupby(["Categoria", "Subcategoria", "mes"])["valor_abs"]
        .sum()
        .reset_index()
    )
    rec2 = (
        rec.groupby(["Categoria", "Subcategoria"])
        .agg(meses=("mes", "nunique"), media=("valor_abs", "mean"), std=("valor_abs", "std"))
        .reset_index()
    )
    rec2["cv"] = rec2.apply(
        lambda r: r["std"] / r["media"] if r["media"] > 0 else 0, axis=1
    )
    rec2 = rec2[(rec2["meses"] >= 3) & (rec2["cv"] < 0.5)]
    return [
        {
            "categoria": r["Categoria"],
            "subcategoria": r["Subcategoria"],
            "valor_mensal": round(r["media"], 2),
        }
        for _, r in rec2.iterrows()
    ]


def parse_budget_csv(path: Path) -> list[tuple[str, str]]:
    """Lê budget CSV e retorna lista de (linha_label, valor_str)."""
    result = []
    with open(path, encoding="utf-8", newline="") as f:
        rows = list(csv.reader(f))
    for i, row in enumerate(rows):
        if i == 0 and row and row[0] == "Categorias e Subcategorias":
            continue  # Pula cabeçalho
        if len(row) >= 2:
            result.append((row[0].strip(), row[1].strip()))
        elif len(row) == 1:
            result.append((row[0].strip(), ""))
    return result


def get_budget_updates(
    media_mensal: dict[str, float], budget_lines: list[tuple[str, str]]
) -> dict[str, float]:
    """Calcula novos valores de budget com base na média real."""
    BUDGET_CATEGORIES = {
        "Alimentação", "Assinaturas", "Educação", "Gastos Pessoais", "Lazer",
        "Moradia", "Outros Gastos", "Pets", "Saúde", "Supermercado", "Transporte", "Viagem",
    }
    recorrentes_fixos = get_recorrentes_fixos()
    updates = {}

    for key, media in media_mensal.items():
        if key in FIXOS:
            updates[key] = FIXOS[key]
        elif key in recorrentes_fixos:
            updates[key] = round(media, 2)
        else:
            updates[key] = round(media * 1.1, 2)  # 10% margem

    return updates


def apply_budget_updates(
    budget_lines: list[tuple[str, str]], updates: dict[str, float]
) -> list[tuple[str, str]]:
    """Aplica updates ao budget, recalcula totais de categoria pai e Despesas Mensais."""
    BUDGET_CATEGORIES = {
        "Alimentação", "Assinaturas", "Educação", "Gastos Pessoais", "Lazer",
        "Moradia", "Outros Gastos", "Pets", "Saúde", "Supermercado", "Transporte", "Viagem",
    }
    DESPESAS_MENSAIS_LABEL = "Despesas Mensais"

    # 1. Atualiza subcategorias e coleta os novos valores por categoria pai
    parent = None
    parent_sums: dict[str, float] = {}  # {categoria: soma das subcategorias}
    subcategory_lines: list[tuple[str, str]] = []  # resultado intermediário

    for label, value_str in budget_lines:
        if label in BUDGET_CATEGORIES:
            parent = label
            parent_sums[label] = 0.0
            subcategory_lines.append((label, value_str))  # placeholder
            continue

        if parent:
            key = f"{parent}|{label}"
            if key in updates:
                new_val = updates[key]
                subcategory_lines.append((label, format_br(new_val)))
                parent_sums[parent] = parent_sums.get(parent, 0.0) + new_val
            else:
                # Preserva valor existente e soma ao total do pai (se for numérico)
                existing = parse_br(value_str)
                if existing is not None:
                    parent_sums[parent] = parent_sums.get(parent, 0.0) + existing
                subcategory_lines.append((label, value_str))
        else:
            subcategory_lines.append((label, value_str))

    # 2. Substitui os placeholders das categorias pai pelo total calculado
    result: list[tuple[str, str]] = []
    for label, value_str in subcategory_lines:
        if label in BUDGET_CATEGORIES:
            total = parent_sums.get(label, 0.0)
            result.append((label, format_br(total) if total > 0 else "---"))
        elif label == DESPESAS_MENSAIS_LABEL:
            # Recalcula Despesas Mensais como soma de todos os totais de categoria
            total_despesas = sum(
                v for k, v in parent_sums.items() if k != "Receitas"
            )
            result.append((label, format_br(total_despesas)))
        else:
            result.append((label, value_str))

    return result


def write_budget_csv(path: Path, lines: list[tuple[str, str]]) -> None:
    """Escreve budget CSV."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Categorias e Subcategorias", "Planejamento"])
        for label, value in lines:
            w.writerow([label, value])


def write_gastos_planejados(
    path: Path,
    recorrentes: list[dict],
    parcelas: list[dict],
) -> None:
    """Escreve CSV de gastos planejados."""
    rows = []
    for r in recorrentes:
        rows.append({
            "Tipo": "Recorrente",
            "Descricao": f"{r['categoria']} - {r['subcategoria']}",
            "Categoria": r["categoria"],
            "Subcategoria": r["subcategoria"],
            "Valor_Mensal": r["valor_mensal"],
            "Parcelas_Restantes": "",
            "Valor_Total_Restante": "",
            "Meses_Impacto": "todos",
        })
    for p in parcelas:
        rows.append({
            "Tipo": "Parcelado",
            "Descricao": p["descricao"],
            "Categoria": p["categoria"],
            "Subcategoria": p["subcategoria"],
            "Valor_Mensal": p["valor_parcela"],
            "Parcelas_Restantes": p["parcelas_restantes"],
            "Valor_Total_Restante": p["valor_restante"],
            "Meses_Impacto": p["parcelas_restantes"],
        })

    df = pd.DataFrame(rows)
    df.to_csv(path, index=False, decimal=",", sep=";")


def main():
    parser = argparse.ArgumentParser(description="Atualiza budget com base em lançamentos")
    parser.add_argument(
        "excel",
        nargs="?",
        default=str(PROJECT_ROOT / "lancamentos_20260317_221726_030981fa.xlsx"),
        help="Caminho do Excel de lançamentos",
    )
    parser.add_argument("--dry-run", action="store_true", help="Não gravar arquivos")
    args = parser.parse_args()

    excel_path = Path(args.excel)
    if not excel_path.exists():
        print(f"Erro: arquivo não encontrado: {excel_path}", file=sys.stderr)
        sys.exit(1)

    budget_path = DATA_DIR / "planejamento_budget.csv"
    if not budget_path.exists():
        print(f"Erro: budget não encontrado: {budget_path}", file=sys.stderr)
        sys.exit(1)

    print("Carregando lançamentos...")
    gastos = load_lancamentos(excel_path)
    print(f"  {len(gastos)} gastos em {gastos['mes'].nunique()} meses")

    print("Calculando médias e identificando parcelas...")
    media_mensal = get_media_mensal(gastos)
    parcelas = get_parcelas_pendentes(gastos)
    recorrentes = get_recorrentes(gastos)

    print(f"  {len(media_mensal)} categorias com gasto")
    print(f"  {len(parcelas)} itens parcelados pendentes")
    print(f"  {len(recorrentes)} gastos recorrentes")

    print("Lendo budget atual...")
    budget_lines = parse_budget_csv(budget_path)
    updates = get_budget_updates(media_mensal, budget_lines)
    new_lines = apply_budget_updates(budget_lines, updates)

    if args.dry_run:
        print("\n[DRY-RUN] Alterações que seriam aplicadas:")
        for label, value in new_lines:
            if value and value != "---":
                print(f"  {label}: {value}")
        print("\nParcelas pendentes:")
        for p in parcelas[:10]:
            print(f"  {p['descricao'][:40]} | R$ {p['valor_parcela']:,.2f}/mês x {p['parcelas_restantes']}")
        if len(parcelas) > 10:
            print(f"  ... e mais {len(parcelas) - 10}")
        return

    print("Gravando planejamento_budget.csv...")
    write_budget_csv(budget_path, new_lines)
    if PUBLIC_DATA_DIR.exists():
        write_budget_csv(PUBLIC_DATA_DIR / "planejamento_budget.csv", new_lines)
        print("  (também em public/data/)")

    gastos_path = DATA_DIR / "gastos_planejados_proximos_meses.csv"
    print(f"Gravando {gastos_path.name}...")
    write_gastos_planejados(gastos_path, recorrentes, parcelas)

    print("Concluído.")


if __name__ == "__main__":
    main()
