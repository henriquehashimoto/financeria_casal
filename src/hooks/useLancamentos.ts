import { useState, useCallback } from 'react'
import { parseLancamentosXlsx } from '../lib/lancamentosParser'
import type { Lancamento } from '../types'

export function useLancamentos(): {
  lancamentos: Lancamento[]
  loading: boolean
  error: string | null
  loadFile: (file: File) => void
} {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFile = useCallback((file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      setError('Apenas arquivos .xlsx são aceitos')
      return
    }
    setLoading(true)
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const buffer = reader.result as ArrayBuffer
        const data = parseLancamentosXlsx(buffer)
        setLancamentos(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao ler arquivo')
        setLancamentos([])
      } finally {
        setLoading(false)
      }
    }
    reader.onerror = () => {
      setError('Erro ao ler arquivo')
      setLoading(false)
    }
    reader.readAsArrayBuffer(file)
  }, [])

  return { lancamentos, loading, error, loadFile }
}
