function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

interface SummaryCardsProps {
  totalGastosMes: number
  totalGastosHistorico: number
  mediaGastosMensal: number
  mesesComDados: number
  totalReceitasMes: number
  totalReceitasHistorico: number
  mediaReceitasMensal: number
  mesSelecionadoLabel?: string
}

export function SummaryCards({
  totalGastosMes,
  totalGastosHistorico,
  mediaGastosMensal,
  mesesComDados,
  totalReceitasMes,
  totalReceitasHistorico,
  mediaReceitasMensal,
  mesSelecionadoLabel = 'Mês atual',
}: SummaryCardsProps) {
  const saldoMes = totalReceitasMes - totalGastosMes
  const saldoHistorico = totalReceitasHistorico - totalGastosHistorico

  const variantColor: Record<string, string> = {
    receita: 'var(--color-budget-ok)',
    gasto: 'var(--color-text)',
    positivo: 'var(--color-budget-ok)',
    negativo: 'var(--color-budget-over)',
  }

  const Card = ({
    label,
    value,
    variant,
    sub,
  }: {
    label: string
    value: number
    variant: string
    sub?: string
  }) => (
    <div
      style={{
        background: 'var(--color-surface)',
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-sm)',
        borderLeft: `3px solid ${variantColor[variant]}`,
      }}
    >
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: variantColor[variant] }}>
        {formatBrl(value)}
      </div>
      {sub && (
        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
          {sub}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.5rem',
          }}
        >
          {mesSelecionadoLabel}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
          }}
        >
          <Card label="Receitas" value={totalReceitasMes} variant="receita" />
          <Card label="Gastos" value={totalGastosMes} variant="gasto" />
          <Card
            label="Saldo"
            value={saldoMes}
            variant={saldoMes >= 0 ? 'positivo' : 'negativo'}
          />
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.5rem',
          }}
        >
          Histórico
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
          }}
        >
          <Card label="Receitas" value={totalReceitasHistorico} variant="receita" />
          <Card label="Gastos" value={totalGastosHistorico} variant="gasto" />
          <Card
            label="Saldo"
            value={saldoHistorico}
            variant={saldoHistorico >= 0 ? 'positivo' : 'negativo'}
          />
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.5rem',
          }}
        >
          Médias ({mesesComDados} meses)
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
          }}
        >
          <Card label="Média receitas/mês" value={mediaReceitasMensal} variant="receita" />
          <Card label="Média gastos/mês" value={mediaGastosMensal} variant="gasto" />
        </div>
      </div>
    </div>
  )
}
