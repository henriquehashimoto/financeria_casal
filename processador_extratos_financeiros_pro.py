
"""
Processador Profissional de Extratos Financeiros

Suporta:
- CSV
- XLSX
- OFX

Saídas:
Henrique_Nubank_Conta.csv
Henrique_Nubank_Cartao.csv
Henrique_Itau_Conta.csv
Keth_Cartao.csv
"""

import pandas as pd
import re
from pathlib import Path

OUTPUT_COLUMNS = ["Data","Descricao","Valor"]


def clean_description(text):
    if pd.isna(text):
        return ""
    text = str(text)
    text = text.replace("\n"," ")
    text = re.sub(r"\s+"," ",text)
    return text.strip()


def normalize_value(v):
    if pd.isna(v):
        return 0.0

    if isinstance(v,str):
        v = v.replace("R$","").replace(".","").replace(",",".").strip()

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

    date_col=None
    desc_col=None
    val_col=None

    for c in df.columns:

        cl=c.lower()

        if "data" in cl or "date" in cl:
            date_col=c

        if "desc" in cl or "descr" in cl or "estabelecimento" in cl or "historico" in cl:
            desc_col=c

        if "valor" in cl or "amount" in cl:
            val_col=c

    return date_col,desc_col,val_col


def normalize_dataframe(df):

    date_col,desc_col,val_col = detect_columns(df)

    if not date_col or not desc_col or not val_col:
        raise Exception("Não foi possível detectar colunas automaticamente")

    out = pd.DataFrame({
        "Data":df[date_col].apply(normalize_date),
        "Descricao":df[desc_col].apply(clean_description),
        "Valor":df[val_col].apply(normalize_value)
    })

    out = out[out["Descricao"]!="SALDO DO DIA"]

    return out[OUTPUT_COLUMNS]


def parse_ofx(path):

    data=[]
    desc=[]
    val=[]

    with open(path,"r",encoding="latin-1") as f:
        txt=f.read()

    blocks=re.findall(r"<STMTTRN>(.*?)</STMTTRN>",txt,re.S)

    for b in blocks:

        d=re.search("<DTPOSTED>(\d+)",b)
        a=re.search("<TRNAMT>([-0-9.]+)",b)
        m=re.search("<MEMO>(.*)",b)

        if d:
            data.append(pd.to_datetime(d.group(1)[:8]).strftime("%Y-%m-%d"))
        else:
            data.append("")

        if m:
            desc.append(m.group(1).strip())
        else:
            desc.append("")

        if a:
            val.append(float(a.group(1)))
        else:
            val.append(0.0)

    return pd.DataFrame({
        "Data":data,
        "Descricao":desc,
        "Valor":val
    })


def read_file(file):

    ext=file.suffix.lower()

    if ext==".csv":
        try:
            return pd.read_csv(file)
        except:
            return pd.read_csv(file,sep=";")

    if ext==".xlsx":
        return pd.read_excel(file)

    if ext==".ofx":
        return parse_ofx(file)

    raise Exception(f"Formato não suportado: {ext}")


def classify_file(name):

    n=name.lower()

    if "nubank" in n and "cartao" in n:
        return "Henrique_Nubank_Cartao"

    if "nubank" in n and "conta" in n:
        return "Henrique_Nubank_Conta"

    if "itau" in n:
        return "Henrique_Itau_Conta"

    if "keth" in n:
        return "Keth_Cartao"

    return None


def process_folder(input_folder,output_folder):

    input_folder=Path(input_folder)
    output_folder=Path(output_folder)

    output_folder.mkdir(exist_ok=True)

    buffers={
        "Henrique_Nubank_Conta":[],
        "Henrique_Nubank_Cartao":[],
        "Henrique_Itau_Conta":[],
        "Keth_Cartao":[]
    }

    for file in input_folder.glob("*"):

        try:

            category=classify_file(file.name)

            if not category:
                print("Arquivo ignorado:",file.name)
                continue

            df=read_file(file)

            if "Data" not in df.columns:
                df=normalize_dataframe(df)

            buffers[category].append(df)

            print("Processado:",file.name)

        except Exception as e:
            print("Erro no arquivo",file.name,str(e))


    for k,v in buffers.items():

        if v:
            out=pd.concat(v).drop_duplicates().sort_values("Data")
        else:
            out=pd.DataFrame(columns=OUTPUT_COLUMNS)

        out.to_csv(output_folder/f"{k}.csv",index=False)


    print("\nArquivos gerados em:",output_folder)


if __name__=="__main__":

    import argparse

    parser=argparse.ArgumentParser()

    parser.add_argument("input",help="Pasta com extratos")
    parser.add_argument("--output",default="output",help="Pasta de saída")

    args=parser.parse_args()

    process_folder(args.input,args.output)
