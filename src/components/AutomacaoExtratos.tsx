import { useCallback } from 'react'
import { useAutomacao } from '../hooks/useAutomacao'
import { isSupportedFile, type CsvResults } from '../lib/pyodideService'

const ACCEPTED_TYPES = '.csv,.xlsx,.xls,.ofx,.pdf'

const CATEGORIES: { key: keyof CsvResults; label: string; description: string }[] = [
  { key: 'Henrique_Itau_Conta', label: 'Henrique — Itaú Conta', description: 'Extrato conta corrente Itaú' },
  { key: 'Henrique_Nubank_Conta', label: 'Henrique — Nubank Conta', description: 'Movimentações conta Nubank' },
  { key: 'Henrique_Nubank_Cartao', label: 'Henrique — Nubank Cartão', description: 'Fatura cartão Nubank' },
  { key: 'Keth_Itau_Conta', label: 'Keth — Itaú Conta', description: 'Extrato conta corrente Itaú da Keth' },
  { key: 'Keth_Cartao', label: 'Keth — Cartão', description: 'Faturas de cartão da Keth' },
]

function countRows(csv: string): number {
  const lines = csv.trim().split('\n')
  return Math.max(0, lines.length - 1)
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function AutomacaoExtratos() {
  const { files, loading, progress, results, error, addFiles, removeFile, clearFiles, process } =
    useAutomacao()

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const dropped = Array.from(e.dataTransfer.files)
      if (dropped.length) addFiles(dropped)
    },
    [addFiles]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? [])
      if (selected.length) addFiles(selected)
      e.target.value = ''
    },
    [addFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), [])

  const unsupportedFiles = files.filter((f) => !isSupportedFile(f))
  const supportedFiles = files.filter(isSupportedFile)

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          padding: '0.875rem 1rem',
          background: '#f0f7f2',
          border: '1px solid #c3deca',
          borderRadius: 'var(--radius)',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: '#2d5a3d',
        }}
      >
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>🔒</span>
        <span>
          <strong>Processamento 100% local</strong> — seus dados não saem do browser.
          O Python roda diretamente aqui via WebAssembly (Pyodide). Suporta: <strong>CSV, XLSX, XLS, OFX, PDF</strong> (extrato Itaú).
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          border: '2px dashed var(--color-border)',
          borderRadius: 'var(--radius)',
          padding: '2rem',
          textAlign: 'center',
          background: 'var(--color-surface)',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.2s, background 0.2s',
          marginBottom: '1rem',
          opacity: loading ? 0.6 : 1,
        }}
      >
        <input
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={handleChange}
          disabled={loading}
          style={{ display: 'none' }}
          id="automacao-upload"
        />
        <label htmlFor="automacao-upload" style={{ cursor: loading ? 'not-allowed' : 'pointer' }}>
          <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '1rem' }}>
            Arraste os arquivos aqui
          </span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            ou clique para selecionar — CSV, XLSX, XLS, OFX, PDF
          </span>
        </label>
      </div>

      {/* Unsupported files warning */}
      {unsupportedFiles.length > 0 && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: '#fffbe6',
            border: '1px solid #f5d77e',
            borderRadius: 'var(--radius)',
            fontSize: '0.85rem',
            color: '#7a5c00',
            marginBottom: '0.75rem',
          }}
        >
          <strong>Arquivos ignorados</strong> (formato não suportado pelo processador local):{' '}
          {unsupportedFiles.map((f) => f.name).join(', ')}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            marginBottom: '1.25rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {supportedFiles.length} arquivo{supportedFiles.length !== 1 ? 's' : ''} para processar
              {unsupportedFiles.length > 0 && (
                <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                  ({unsupportedFiles.length} ignorado{unsupportedFiles.length !== 1 ? 's' : ''})
                </span>
              )}
            </span>
            {!loading && (
              <button
                onClick={clearFiles}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  padding: '0.25rem 0.5rem',
                }}
              >
                Limpar tudo
              </button>
            )}
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {files.map((f, i) => {
              const supported = isSupportedFile(f)
              return (
                <li
                  key={`${f.name}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 1rem',
                    borderBottom: i < files.length - 1 ? '1px solid var(--color-border)' : 'none',
                    fontSize: '0.875rem',
                    opacity: supported ? 1 : 0.5,
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                    {f.name}
                    <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                      ({(f.size / 1024).toFixed(0)} KB)
                    </span>
                    {!supported && (
                      <span
                        style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.75rem',
                          background: '#f5d77e',
                          color: '#7a5c00',
                          borderRadius: 4,
                          padding: '0.1rem 0.4rem',
                        }}
                      >
                        ignorado
                      </span>
                    )}
                  </span>
                  {!loading && (
                    <button
                      onClick={() => removeFile(i)}
                      aria-label={`Remover ${f.name}`}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-budget-over)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '0 0.25rem',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={process}
          disabled={loading || supportedFiles.length === 0}
          style={{
            padding: '0.75rem 1.5rem',
            background: loading || supportedFiles.length === 0 ? 'var(--color-border)' : 'var(--color-accent)',
            color: loading || supportedFiles.length === 0 ? 'var(--color-text-muted)' : '#fff',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: loading || supportedFiles.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Processando...' : 'Processar Extratos'}
        </button>
      </div>

      {/* Progress */}
      {loading && progress && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            marginBottom: '1.5rem',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 16,
              height: 16,
              border: '2px solid var(--color-accent)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{progress}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '1rem',
            background: '#fde8e8',
            border: '1px solid #f5c6c6',
            borderRadius: 'var(--radius)',
            color: 'var(--color-budget-over)',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
          }}
        >
          <strong>Erro:</strong> {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div>
          <h3
            style={{
              margin: '0 0 1rem',
              fontSize: '1.05rem',
              fontWeight: 600,
              color: 'var(--color-accent)',
            }}
          >
            Arquivos gerados com sucesso
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {CATEGORIES.map(({ key, label, description }) => {
              const rows = countRows(results[key])
              return (
                <div
                  key={key}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{description}</div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: rows > 0 ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    }}
                  >
                    {rows} transaç{rows === 1 ? 'ão' : 'ões'}
                  </div>
                  <button
                    onClick={() => downloadCsv(results[key], `${key}.csv`)}
                    disabled={rows === 0}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      background: rows > 0 ? 'var(--color-accent)' : 'var(--color-border)',
                      color: rows > 0 ? '#fff' : 'var(--color-text-muted)',
                      border: 'none',
                      borderRadius: 6,
                      fontFamily: 'inherit',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: rows > 0 ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Baixar {key}.csv
                  </button>
                </div>
              )
            })}
          </div>

          {/* Processing log */}
          {results.logs.length > 0 && (
            <details style={{ marginTop: '0.5rem' }}>
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: 'var(--color-text-muted)',
                  userSelect: 'none',
                }}
              >
                Ver log de processamento ({results.logs.length} entradas)
              </summary>
              <ul
                style={{
                  margin: '0.5rem 0 0',
                  padding: '0.75rem 1rem',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                  listStyle: 'none',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  lineHeight: 1.6,
                }}
              >
                {results.logs.map((log, i) => (
                  <li
                    key={i}
                    style={{
                      color: log.startsWith('Erro') ? 'var(--color-budget-over)' : 'var(--color-text-muted)',
                    }}
                  >
                    {log}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
