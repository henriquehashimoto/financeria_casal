import { useCallback, useState } from 'react'
import { processExtratos, type CsvResults } from '../lib/pyodideService'

interface AutomacaoState {
  files: File[]
  loading: boolean
  progress: string
  results: (CsvResults & { logs: string[] }) | null
  error: string | null
}

export function useAutomacao() {
  const [state, setState] = useState<AutomacaoState>({
    files: [],
    loading: false,
    progress: '',
    results: null,
    error: null,
  })

  const addFiles = useCallback((newFiles: File[]) => {
    setState((prev) => {
      const existingNames = new Set(prev.files.map((f) => f.name))
      const filtered = newFiles.filter((f) => !existingNames.has(f.name))
      return { ...prev, files: [...prev.files, ...filtered], error: null }
    })
  }, [])

  const removeFile = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }))
  }, [])

  const clearFiles = useCallback(() => {
    setState((prev) => ({ ...prev, files: [], results: null, error: null }))
  }, [])

  const process = useCallback(() => {
    setState((prev) => {
      if (prev.files.length === 0) return prev

      const { files } = prev

      processExtratos(files, (msg) => {
        setState((s) => ({ ...s, progress: msg }))
      })
        .then((results) => {
          setState((s) => ({ ...s, loading: false, results, progress: '' }))
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Erro desconhecido'
          setState((s) => ({ ...s, loading: false, error: message, progress: '' }))
        })

      return { ...prev, loading: true, error: null, results: null, progress: 'Iniciando...' }
    })
  }, [])

  return {
    files: state.files,
    loading: state.loading,
    progress: state.progress,
    results: state.results,
    error: state.error,
    addFiles,
    removeFile,
    clearFiles,
    process,
  }
}
