const GEMINI_BASE = 'https://generativelanguage.googleapis.com'
const GEMINI_MODEL = 'gemini-2.0-flash'

const SYSTEM_PROMPT = `Você é um Engenheiro de Dados focado em automação de finanças pessoais. Seu objetivo é receber múltiplos arquivos de extratos bancários (PDFs e CSVs) e padronizá-los em arquivos CSV consolidados, prontos para serem ingeridos por um aplicativo de gestão financeira.

**Regras de Processamento de Dados (Obrigatórias):**

1. **Estrutura Final:** Todos os arquivos de saída devem conter estritamente 3 colunas, com o seguinte cabeçalho exato: \`Data,Descricao,Valor\`.

2. **Formatação de Data:** A coluna \`Data\` deve ser convertida e padronizada para o formato ISO \`YYYY-MM-DD\`.

3. **Formatação de Valor:** A coluna \`Valor\` deve ser do tipo numérico (float). Remova separadores de milhar (pontos) e utilize apenas ponto (\`.\`) como separador decimal.

4. **Limpeza de Descrição:** Remova quebras de linha (\`\\n\`), espaços duplos e caracteres especiais invisíveis da coluna \`Descricao\`.

5. **Filtro de Conta Corrente:** É estritamente proibido incluir linhas cuja descrição seja "SALDO DO DIA". Estas linhas devem ser removidas em todos os extratos de conta.

**Regras de Separação e Agrupamento:**

Você deve analisar o nome ou o conteúdo dos arquivos enviados para gerar 4 blocos de saída distintos:

* **Henrique_Itau_Conta:** Extratos da conta corrente do Itaú (geralmente enviados em PDF). Extraia as datas, descrições e valores ignorando os cabeçalhos e rodapés do banco.

* **Henrique_Nubank_Conta:** Movimentações da conta corrente Nubank (geralmente CSV).

* **Henrique_Nubank_Cartao:** Fatura do cartão de crédito Nubank (geralmente CSV).

* **Keth_Cartao:** Faturas de cartão com o nome Keth (geralmente CSVs separados por ponto e vírgula \`;\` ou imagens de print da conta). Consolide todos os arquivos da Keth em um único output, empilhando as transações cronologicamente.

Garanta que todos os dados estejam no output final e que não haja duplicação de informação.

**Formato de Saída:**

Entregue o conteúdo em blocos de código CSV. Use EXATAMENTE este formato para cada bloco, com o nome da categoria como identificador:

\`\`\`csv:Henrique_Itau_Conta
Data,Descricao,Valor
...dados...
\`\`\`

\`\`\`csv:Henrique_Nubank_Conta
Data,Descricao,Valor
...dados...
\`\`\`

\`\`\`csv:Henrique_Nubank_Cartao
Data,Descricao,Valor
...dados...
\`\`\`

\`\`\`csv:Keth_Cartao
Data,Descricao,Valor
...dados...
\`\`\`

Se não houver dados para uma categoria, inclua o bloco com apenas o cabeçalho.`

export interface CsvResults {
  Henrique_Itau_Conta: string
  Henrique_Nubank_Conta: string
  Henrique_Nubank_Cartao: string
  Keth_Cartao: string
}

function getMimeType(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    csv: 'text/plain',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    ofx: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
  }
  return map[ext ?? ''] ?? 'application/octet-stream'
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // result is "data:<mime>;base64,<data>" — extract only the base64 part
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error(`Erro ao ler o arquivo "${file.name}"`))
    reader.readAsDataURL(file)
  })
}

function parseResponse(content: string): CsvResults {
  const categories = ['Henrique_Itau_Conta', 'Henrique_Nubank_Conta', 'Henrique_Nubank_Cartao', 'Keth_Cartao'] as const
  const results: CsvResults = {
    Henrique_Itau_Conta: 'Data,Descricao,Valor\n',
    Henrique_Nubank_Conta: 'Data,Descricao,Valor\n',
    Henrique_Nubank_Cartao: 'Data,Descricao,Valor\n',
    Keth_Cartao: 'Data,Descricao,Valor\n',
  }

  for (const cat of categories) {
    const regex = new RegExp('```(?:csv)?[:_]?' + cat + '[\\s\\S]*?\\n([\\s\\S]*?)```', 'i')
    const match = content.match(regex)
    if (match?.[1]) {
      results[cat] = match[1].trim()
      if (!results[cat].startsWith('Data,')) {
        results[cat] = 'Data,Descricao,Valor\n' + results[cat]
      }
    }
  }

  return results
}

export async function processExtratos(
  files: File[],
  onProgress?: (msg: string) => void
): Promise<CsvResults> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      'Configure VITE_GEMINI_API_KEY no arquivo .env na raiz do projeto (veja .env.example).'
    )
  }

  onProgress?.('Lendo arquivos...')

  const fileParts: { inlineData: { mimeType: string; data: string }; text?: undefined }[] = []

  for (let i = 0; i < files.length; i++) {
    onProgress?.(`Preparando arquivo ${i + 1}/${files.length}: ${files[i].name}`)
    const base64 = await fileToBase64(files[i])
    fileParts.push({
      inlineData: {
        mimeType: getMimeType(files[i]),
        data: base64,
      },
    })
  }

  onProgress?.('Enviando para o Gemini...')

  const fileList = files.map((f) => `- ${f.name}`).join('\n')
  const userText = `Processe os seguintes arquivos de extrato bancário e gere os 4 blocos CSV conforme as instruções:\n\n${fileList}\n\nSiga rigorosamente o formato de saída especificado.`

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          ...fileParts,
          { text: userText },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 65536,
    },
  }

  const genRes = await fetch(
    `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!genRes.ok) {
    const err = await genRes.json().catch(() => ({}))
    const msg = (err as { error?: { message?: string } })?.error?.message ?? genRes.statusText
    throw new Error(`Erro na geração: ${msg}`)
  }

  const genData = await genRes.json()
  const responseText: string =
    genData?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? '')
      .join('\n') ?? ''

  if (!responseText) {
    const blockReason = genData?.promptFeedback?.blockReason
    throw new Error(
      blockReason
        ? `Requisição bloqueada pelo Gemini: ${blockReason}`
        : 'O Gemini não retornou conteúdo. Verifique os arquivos enviados.'
    )
  }

  onProgress?.('Parseando CSVs...')
  return parseResponse(responseText)
}
