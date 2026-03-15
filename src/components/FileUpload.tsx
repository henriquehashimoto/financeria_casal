import { useCallback } from 'react'

interface FileUploadProps {
  onFile: (file: File) => void
  accept?: string
  loading?: boolean
}

export function FileUpload({ onFile, accept = '.xlsx', loading }: FileUploadProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFile(file)
      e.target.value = ''
    },
    [onFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file?.name.endsWith('.xlsx')) onFile(file)
    },
    [onFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), [])

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{
        border: '2px dashed var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: '2rem',
        textAlign: 'center',
        background: 'var(--color-surface)',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
      }}
      className="file-upload-zone"
    >
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={loading}
        style={{ display: 'none' }}
        id="xlsx-upload"
      />
      <label htmlFor="xlsx-upload" style={{ cursor: loading ? 'wait' : 'pointer' }}>
        {loading ? (
          <span>Carregando...</span>
        ) : (
          <>
            <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              Arraste o arquivo .xlsx aqui
            </span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              ou clique para selecionar
            </span>
          </>
        )}
      </label>
    </div>
  )
}
