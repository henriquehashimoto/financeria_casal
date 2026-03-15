// Pyodide is loaded as a global via CDN script tag in index.html
declare global {
  function loadPyodide(opts: { indexURL: string }): Promise<PyodideInterface>
}

interface PyodideInterface {
  loadPackage(pkg: string | string[]): Promise<void>
  runPythonAsync(code: string): Promise<unknown>
  FS: {
    mkdir(path: string): void
    writeFile(path: string, data: Uint8Array): void
    readFile(path: string, opts: { encoding: 'utf8' }): string
    analyzePath(path: string): { exists: boolean }
  }
}

const PYTHON_SCRIPT = `
import pandas as pd
import re
from pathlib import Path
import io

OUTPUT_COLUMNS = ["Data", "Descricao", "Valor"]


def clean_description(text):
    if pd.isna(text):
        return ""
    text = str(text)
    text = text.replace("\\n", " ")
    text = re.sub(r"\\s+", " ", text)
    return text.strip()


def normalize_value(v):
    if pd.isna(v):
        return 0.0
    if isinstance(v, str):
        v = v.replace("R$", "").replace(".", "").replace(",", ".").strip()
    try:
        return float(v)
    except:
        return 0.0


def normalize_date(d):
    try:
        return pd.to_datetime(d).strftime("%Y-%m-%d")
    except:
        return ""


def detect_columns(df):
    date_col = None
    desc_col = None
    val_col = None
    for c in df.columns:
        cl = c.lower()
        if "data" in cl or "date" in cl:
            date_col = c
        if "desc" in cl or "descr" in cl or "estabelecimento" in cl or "historico" in cl:
            desc_col = c
        if "valor" in cl or "amount" in cl:
            val_col = c
    return date_col, desc_col, val_col


def normalize_dataframe(df):
    date_col, desc_col, val_col = detect_columns(df)
    if not date_col or not desc_col or not val_col:
        raise Exception("Nao foi possivel detectar colunas automaticamente")
    out = pd.DataFrame({
        "Data": df[date_col].apply(normalize_date),
        "Descricao": df[desc_col].apply(clean_description),
        "Valor": df[val_col].apply(normalize_value),
    })
    out = out[out["Descricao"] != "SALDO DO DIA"]
    return out[OUTPUT_COLUMNS]


def parse_itau_pdf(content_bytes):
    import pypdf
    reader = pypdf.PdfReader(io.BytesIO(content_bytes))
    full_text = "\\n".join(page.extract_text() or "" for page in reader.pages)
    line_re = re.compile(r"^(\\d{2}/\\d{2}/\\d{4})\\s+(.+?)\\s+([-]?\\d[\\d.]*,\\d{2})\\s*$")
    rows = []
    for line in full_text.splitlines():
        m = line_re.match(line.strip())
        if m:
            date_str = m.group(1)
            desc = m.group(2).strip()
            val_str = m.group(3)
            if desc == "SALDO DO DIA":
                continue
            rows.append({
                "Data": normalize_date(date_str),
                "Descricao": clean_description(desc),
                "Valor": normalize_value(val_str),
            })
    return pd.DataFrame(rows, columns=OUTPUT_COLUMNS)


def parse_ofx(content_bytes):
    txt = content_bytes.decode("latin-1")
    data = []
    desc = []
    val = []
    blocks = re.findall(r"<STMTTRN>(.*?)</STMTTRN>", txt, re.S)
    for b in blocks:
        d = re.search("<DTPOSTED>(\\d+)", b)
        a = re.search("<TRNAMT>([-0-9.]+)", b)
        m = re.search("<MEMO>(.*)", b)
        data.append(pd.to_datetime(d.group(1)[:8]).strftime("%Y-%m-%d") if d else "")
        desc.append(m.group(1).strip() if m else "")
        val.append(float(a.group(1)) if a else 0.0)
    return pd.DataFrame({"Data": data, "Descricao": desc, "Valor": val})


def read_file_bytes(name, content_bytes):
    ext = Path(name).suffix.lower()
    if ext == ".csv":
        try:
            return pd.read_csv(io.BytesIO(content_bytes))
        except:
            return pd.read_csv(io.BytesIO(content_bytes), sep=";")
    if ext in (".xlsx", ".xls"):
        return pd.read_excel(io.BytesIO(content_bytes))
    if ext == ".ofx":
        return parse_ofx(content_bytes)
    if ext == ".pdf":
        return parse_itau_pdf(content_bytes)
    raise Exception(f"Formato nao suportado: {ext}")


def classify_file(name):
    n = name.lower()
    if "nubank" in n and "cartao" in n:
        return "Henrique_Nubank_Cartao"
    if "nubank" in n and "conta" in n:
        return "Henrique_Nubank_Conta"
    if "keth" in n and "itau" in n:
        return "Keth_Itau_Conta"
    if "itau" in n:
        return "Henrique_Itau_Conta"
    if "keth" in n:
        return "Keth_Cartao"
    return None


def process_files(file_map):
    """
    file_map: dict { filename: bytes }
    Returns: dict { category: csv_string }
    """
    buffers = {
        "Henrique_Nubank_Conta": [],
        "Henrique_Nubank_Cartao": [],
        "Henrique_Itau_Conta": [],
        "Keth_Itau_Conta": [],
        "Keth_Cartao": [],
    }
    logs = []

    for name, content_bytes in file_map.items():
        try:
            category = classify_file(name)
            if not category:
                logs.append(f"Ignorado (nao classificado): {name}")
                continue
            df = read_file_bytes(name, content_bytes)
            if "Data" not in df.columns:
                df = normalize_dataframe(df)
            buffers[category].append(df)
            logs.append(f"Processado: {name} -> {category}")
        except Exception as e:
            logs.append(f"Erro em {name}: {str(e)}")

    results = {}
    for k, v in buffers.items():
        if v:
            out = pd.concat(v).drop_duplicates().sort_values("Data")
        else:
            out = pd.DataFrame(columns=OUTPUT_COLUMNS)
        results[k] = out.to_csv(index=False)

    return results, logs
`

export interface CsvResults {
  Henrique_Itau_Conta: string
  Henrique_Nubank_Conta: string
  Henrique_Nubank_Cartao: string
  Keth_Itau_Conta: string
  Keth_Cartao: string
}

let pyodideInstance: PyodideInterface | null = null

async function getPyodide(onProgress?: (msg: string) => void): Promise<PyodideInterface> {
  if (pyodideInstance) return pyodideInstance

  onProgress?.('Inicializando Python (primeira vez ~15s)...')
  pyodideInstance = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/',
  })

  onProgress?.('Instalando dependências Python...')
  await pyodideInstance.loadPackage(['pandas', 'micropip'])
  await pyodideInstance.runPythonAsync(
    'import micropip; await micropip.install(["openpyxl", "pypdf"])'
  )

  return pyodideInstance
}

function readFileAsBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(new Error(`Erro ao ler "${file.name}"`))
    reader.readAsArrayBuffer(file)
  })
}

const SUPPORTED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls', '.ofx', '.pdf'])

export function isSupportedFile(file: File): boolean {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
  return SUPPORTED_EXTENSIONS.has(ext)
}

export async function processExtratos(
  files: File[],
  onProgress?: (msg: string) => void
): Promise<CsvResults & { logs: string[] }> {
  const pyodide = await getPyodide(onProgress)

  const supportedFiles = files.filter(isSupportedFile)
  if (supportedFiles.length === 0) {
    throw new Error('Nenhum arquivo suportado. Formatos aceitos: CSV, XLSX, OFX, PDF (extrato Itaú).')
  }

  onProgress?.(`Lendo ${supportedFiles.length} arquivo(s)...`)

  // Build a JS object mapping filename -> Uint8Array, then pass to Python
  const fileMap: Record<string, Uint8Array> = {}
  for (let i = 0; i < supportedFiles.length; i++) {
    onProgress?.(`Lendo ${i + 1}/${supportedFiles.length}: ${supportedFiles[i].name}`)
    fileMap[supportedFiles[i].name] = await readFileAsBytes(supportedFiles[i])
  }

  onProgress?.('Executando processador Python...')

  // Mount the script and call process_files
  pyodide.runPythonAsync  // ensure namespace warm
  await pyodide.runPythonAsync(PYTHON_SCRIPT)

  // Pass file map to Python via globals
  const pyGlobals = (pyodide as unknown as { globals: { set: (k: string, v: unknown) => void } }).globals
  pyGlobals.set('js_file_map', fileMap)

  const resultProxy = await pyodide.runPythonAsync(`
import js
file_map_py = {}
file_map_raw = js_file_map.to_py()
for name, arr in file_map_raw.items():
    file_map_py[name] = bytes(arr)

results, logs = process_files(file_map_py)
(results, logs)
`) as [Map<string, string>, string[]]

  // resultProxy is a Python tuple converted to JS — access via index
  const rawResults = resultProxy as unknown as [unknown, unknown]
  const csvMap = rawResults[0] as Map<string, string>
  const logsArr = rawResults[1] as string[]

  // Convert pyodide proxy maps to plain JS
  const csvObj: Record<string, string> = {}
  if (typeof csvMap.forEach === 'function') {
    csvMap.forEach((v: string, k: string) => { csvObj[k] = v })
  } else {
    // fallback: it's already a plain object
    Object.assign(csvObj, csvMap)
  }

  const logsPlain: string[] = []
  if (typeof (logsArr as unknown as { forEach: (cb: (v: string) => void) => void }).forEach === 'function') {
    ;(logsArr as unknown as { forEach: (cb: (v: string) => void) => void }).forEach((v) => logsPlain.push(v))
  }

  const empty = 'Data,Descricao,Valor\n'

  onProgress?.('Concluído.')

  return {
    Henrique_Itau_Conta: csvObj['Henrique_Itau_Conta'] ?? empty,
    Henrique_Nubank_Conta: csvObj['Henrique_Nubank_Conta'] ?? empty,
    Henrique_Nubank_Cartao: csvObj['Henrique_Nubank_Cartao'] ?? empty,
    Keth_Itau_Conta: csvObj['Keth_Itau_Conta'] ?? empty,
    Keth_Cartao: csvObj['Keth_Cartao'] ?? empty,
    logs: logsPlain,
  }
}
