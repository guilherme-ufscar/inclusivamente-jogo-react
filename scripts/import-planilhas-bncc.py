# -*- coding: utf-8 -*-
"""
Scenario C: import activities from atividades/*.xlsx + generate BNCC gap cards.
Writes content/import/scenario-c-extra.json for merge-scenario-c.mjs
"""
from __future__ import annotations

import json
import re
import zipfile
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ATIV = ROOT / "atividades"
CATALOG = ROOT / "content" / "import" / "catalog.json"
OUT = ROOT / "content" / "import" / "scenario-c-extra.json"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def enunciado_formatter(enunciado: str | None) -> str | None:
    if not enunciado:
        return None
    resultado = enunciado.upper()
    resultado = re.sub(r"<BR>", " ", resultado, flags=re.I)
    resultado = re.sub(r"/([A-ZÀ-Ü])/", r"SOM \1", resultado, flags=re.I)
    resultado = re.sub(r"[^A-Z0-9_ÁÀÂÃÉÊÍÓÔÕÚÇÜ ]", "", resultado, flags=re.I)
    resultado = resultado.upper()
    palavras = [p for p in re.split(r"\s+", resultado) if p]
    if not palavras:
        return None
    return "_".join(palavras[:5])


def load_shared(z):
    if "xl/sharedStrings.xml" not in z.namelist():
        return []
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    out = []
    for si in root.findall("m:si", NS):
        texts = [t.text or "" for t in si.findall(".//m:t", NS)]
        out.append("".join(texts))
    return out


def sheet_map(z):
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid = {rel.attrib.get("Id"): rel.attrib.get("Target") for rel in rels}
    sheets = []
    for s in wb.findall("m:sheets/m:sheet", NS):
        name = s.attrib.get("name", "")
        r = s.attrib.get(
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        )
        t = rid.get(r, "")
        if t and not t.startswith("xl/"):
            t = "xl/" + t.lstrip("/")
        sheets.append((name, t))
    return sheets


def sheet_rows(z, target, shared, max_col=16):
    if target not in z.namelist():
        return []
    root = ET.fromstring(z.read(target))
    grid = {}
    max_r = 0
    for c in root.findall(".//m:c", NS):
        ref = c.attrib.get("r") or ""
        m = re.match(r"([A-Z]+)(\d+)", ref)
        if not m:
            continue
        col_s, row = m.group(1), int(m.group(2))
        col = 0
        for ch in col_s:
            col = col * 26 + (ord(ch) - 64)
        if col > max_col:
            continue
        t = c.attrib.get("t")
        v = c.find("m:v", NS)
        if v is None or v.text is None:
            val = ""
        elif t == "s":
            try:
                val = shared[int(v.text)]
            except Exception:
                val = v.text
        else:
            val = v.text
        grid[(row, col)] = str(val).strip()
        max_r = max(max_r, row)
    rows = []
    for r in range(1, max_r + 1):
        rows.append([grid.get((r, c), "") for c in range(1, max_col + 1)])
    return rows


def parse_options_cell(cell: str):
    if not cell or not re.search(r"correto", cell, re.I):
        return None
    parts = re.split(r",|\se\s", cell)
    opts = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        correct = bool(re.search(r"\(correto", p, re.I))
        text = re.sub(r"\s*\([^)]*\)\s*", "", p).strip()
        if text:
            opts.append({"text": text, "correct": correct})
    if len(opts) >= 2 and any(o["correct"] for o in opts):
        return opts
    return None


def opt_ids(opts):
    out = []
    for i, o in enumerate(opts):
        out.append(
            {
                "id": chr(97 + i),
                "text": o["text"],
                "image_url": None,
                "correct": bool(o["correct"]),
            }
        )
    return out


def extract_enunciado(text: str):
    if not text:
        return None
    t = str(text).strip()
    m = re.search(r"ENUNCIADO\s*:\s*[\"']?(.+?)[\"']?\s*$", t, re.I | re.S)
    if m:
        return m.group(1).strip().strip('"').strip("'")
    m = re.search(r"ENUNCIADO\s*:\s*(.+)", t, re.I | re.S)
    if m:
        return m.group(1).strip().strip('"').strip("'")
    if re.search(
        r"\b(QUAL|QUANTOS|QUANTAS|TOQUE|ONDE|O QUE|COMPLETE|LEIA|CONTE|MONTE|OUÇA|OUCA)\b",
        t,
        re.I,
    ):
        if len(t) < 200:
            return t
    return None


def make_activity(
    *,
    persona,
    year,
    matter,
    pill_index,
    pill_name,
    level,
    statement,
    options,
    source,
    bncc=None,
    seq=1,
    needs_review=False,
):
    key = enunciado_formatter(statement)
    sid = f"xc_{persona}_{year}_{matter}_p{pill_index}_n{level}_{seq}_{key or 'x'}"
    sid = re.sub(r"[^a-zA-Z0-9_]", "_", sid)[:120]
    steps = [
        {
            "prompt": statement,
            "options": opt_ids(options)
            if options and isinstance(options[0], dict) and "text" in options[0]
            else options,
        }
    ]
    # normalize options shape
    if steps[0]["options"] and "id" not in steps[0]["options"][0]:
        steps[0]["options"] = opt_ids(steps[0]["options"])
    return {
        "id": sid,
        "persona": persona,
        "year": str(year),
        "matter": matter,
        "pill_index": pill_index,
        "pill_name": pill_name or f"Pílula {pill_index}",
        "level": level,
        "bncc": bncc or [],
        "title": f"Atividade {seq}",
        "statement": statement,
        "choice_type": "single"
        if sum(1 for o in steps[0]["options"] if o.get("correct")) <= 1
        else "multiple",
        "layout_source": source,
        "randomize_options": True,
        "needs_review": needs_review,
        "notes": [],
        "source_path": source,
        "steps": steps,
        "dedupe_key": key,
    }


def catalog_keys():
    keys = set()
    if not CATALOG.exists():
        return keys
    cat = json.loads(CATALOG.read_text(encoding="utf-8"))
    for p in cat.get("personas") or []:
        for y in p.get("years") or []:
            for m in y.get("matters") or []:
                for pill in m.get("pills") or []:
                    for lv in pill.get("levels") or []:
                        for a in lv.get("activities") or []:
                            k = enunciado_formatter(a.get("statement") or "")
                            if k:
                                keys.add(k)
                            for st in a.get("steps") or []:
                                k2 = enunciado_formatter(st.get("prompt") or "")
                                if k2:
                                    keys.add(k2)
    return keys


# ---------- Planilha 3-5 structured ----------
def import_345(existing: set, out: list):
    files = {
        "Atividades 3º ano -  DI + TEA e Pilulas (1).xlsx": "03",
        "Atividades 4º ano -  DI + TEA e Pilulas.xlsx": "04",
        "Atividades 5º ano -  DI + TEA e Pilulas.xlsx": "05",
    }
    seq = defaultdict(int)
    for fname, year in files.items():
        path = ATIV / fname
        if not path.exists():
            continue
        with zipfile.ZipFile(path) as z:
            shared = load_shared(z)
            for sname, target in sheet_map(z):
                if "Ano" not in sname:
                    continue
                rows = sheet_rows(z, target, shared, max_col=16)
                pill_lp = 1
                pill_ma = 1
                for row in rows:
                    if any(re.search(r"PILULA\s*(\d+)|P[ií]lula\s*(\d+)", c, re.I) for c in row):
                        for c in row:
                            m = re.search(r"(?:PILULA|P[ií]lula)\s*(\d+)", c, re.I)
                            if m:
                                # left side LP updates more often
                                n = int(m.group(1))
                                if row.index(c) < 6:
                                    pill_lp = n
                                else:
                                    pill_ma = n
                    if not row or not re.match(r"Atividade\s*\d+", row[0] or "", re.I):
                        continue
                    st_lp = row[1] if len(row) > 1 else ""
                    steps_opts = []
                    for i in range(2, 5):
                        if len(row) > i:
                            o = parse_options_cell(row[i])
                            if o:
                                steps_opts.append(o)
                    if st_lp and re.search(
                        r"QUAL|QUANTOS|TOQUE|ONDE|O QUE|COMPLETE|FIGURA|PALAVRA",
                        st_lp,
                        re.I,
                    ):
                        opts = steps_opts[0] if steps_opts else None
                        if not opts:
                            # invent simple distractors from other cells
                            opts = [
                                {"text": "Opção A", "correct": True},
                                {"text": "Opção B", "correct": False},
                                {"text": "Opção C", "correct": False},
                            ]
                            nr = True
                        else:
                            nr = False
                        k = enunciado_formatter(st_lp)
                        if k and k not in existing:
                            seq[("di_tea", year, "lp")] += 1
                            act = make_activity(
                                persona="di_tea",
                                year=year,
                                matter="lp",
                                pill_index=pill_lp,
                                pill_name=f"Pílula {pill_lp}",
                                level=1,
                                statement=st_lp,
                                options=opts,
                                source=f"planilha:{fname}",
                                seq=seq[("di_tea", year, "lp")],
                                needs_review=nr,
                            )
                            # multi-step if more option groups
                            if len(steps_opts) > 1:
                                act["steps"] = [
                                    {
                                        "prompt": st_lp,
                                        "options": opt_ids(o),
                                    }
                                    for o in steps_opts
                                ]
                            out.append(act)
                            existing.add(k)

                    st_ma = ""
                    if len(row) > 8 and re.match(r"Atividade\s*\d+", row[7] or "", re.I):
                        st_ma = row[8]
                    else:
                        for i, c in enumerate(row):
                            if i >= 6 and c and re.search(
                                r"QUAL|QUANTOS|ONDE|CONTE|NÚMERO|NUMERO|MAIS|IGUAL",
                                c,
                                re.I,
                            ):
                                if "Atividade" not in c:
                                    st_ma = c
                                    break
                    if st_ma:
                        k = enunciado_formatter(st_ma)
                        if k and k not in existing:
                            # try options after MA statement columns
                            opts = None
                            for i in range(9, 12):
                                if len(row) > i:
                                    opts = parse_options_cell(row[i]) or opts
                            if not opts:
                                opts = [
                                    {"text": "1", "correct": False},
                                    {"text": "2", "correct": True},
                                    {"text": "3", "correct": False},
                                ]
                                nr = True
                            else:
                                nr = False
                            seq[("di_tea", year, "ma")] += 1
                            out.append(
                                make_activity(
                                    persona="di_tea",
                                    year=year,
                                    matter="ma",
                                    pill_index=pill_ma,
                                    pill_name=f"Pílula {pill_ma}",
                                    level=1,
                                    statement=st_ma,
                                    options=opts,
                                    source=f"planilha:{fname}",
                                    seq=seq[("di_tea", year, "ma")],
                                    needs_review=nr,
                                )
                            )
                            existing.add(k)


# ---------- DEV file ----------
def import_dev(existing: set, out: list):
    path = ATIV / "TEA + DI  1º ao 5º Ano DEV.xlsx"
    if not path.exists():
        return
    seq = defaultdict(int)
    with zipfile.ZipFile(path) as z:
        shared = load_shared(z)
        for sname, target in sheet_map(z):
            if not re.search(r"Ativ", sname, re.I):
                continue
            ym = re.search(r"([1-5])", sname)
            year = f"0{ym.group(1)}" if ym else "01"
            rows = sheet_rows(z, target, shared, max_col=12)
            for row in rows[2:]:
                if len(row) < 6:
                    continue
                perfil = (row[3] or "").upper()
                nivel = row[2] or ""
                bloco = row[1] or "Bloco"
                ativ = row[5] or ""
                st = extract_enunciado(ativ)
                if not st:
                    continue
                k = enunciado_formatter(st)
                if not k or k in existing:
                    continue
                blob = (bloco + " " + st).upper()
                matter = (
                    "ma"
                    if re.search(
                        r"MATEM|NÚMERO|NUMERO|SOMA|QUANTIDADE|MEDID|OPERAC|GEOMETR",
                        blob,
                    )
                    else "lp"
                )
                if "TEA + DI" in perfil or perfil.replace(" ", "") == "TEA+DI":
                    persona = "tea_di"
                elif "DI + TEA" in perfil or "DI+TEA" in perfil.replace(" ", ""):
                    persona = "di_tea"
                elif perfil.strip() == "TEA" or (
                    "TEA" in perfil and "DI" not in perfil
                ):
                    persona = "tea"
                else:
                    persona = "di_tea"
                lvl = 2 if "2" in str(nivel) else 1
                # distractors from common sets by matter
                if matter == "ma":
                    opts = [
                        {"text": "2", "correct": True},
                        {"text": "3", "correct": False},
                        {"text": "5", "correct": False},
                    ]
                else:
                    opts = [
                        {"text": "Sim", "correct": True},
                        {"text": "Não", "correct": False},
                        {"text": "Talvez", "correct": False},
                    ]
                # better: extract from scenario technical if has words in quotes
                quoted = re.findall(r"[\"']([^\"']{2,30})[\"']", ativ + " " + (row[7] if len(row) > 7 else ""))
                if len(quoted) >= 2:
                    opts = [{"text": quoted[0], "correct": True}] + [
                        {"text": q, "correct": False} for q in quoted[1:3]
                    ]
                    while len(opts) < 3:
                        opts.append({"text": f"Opção {len(opts)+1}", "correct": False})
                seq[(persona, year, matter)] += 1
                out.append(
                    make_activity(
                        persona=persona,
                        year=year,
                        matter=matter,
                        pill_index=1,
                        pill_name=(bloco[:48] if bloco else "Pílula 1"),
                        level=lvl,
                        statement=st,
                        options=opts,
                        source="planilha:DEV",
                        seq=seq[(persona, year, matter)],
                        needs_review=True,
                    )
                )
                existing.add(k)


# ---------- Infantil ----------
def import_infantil(existing: set, out: list):
    # Prefer DI file; TEA file same content → only infantil_di unless profile TEA-only line
    path = ATIV / "DI + TEA Infantil 4 e 5 anos Atividades Inclusivamente  11 02 2026 (1).xlsx"
    if not path.exists():
        path = ATIV / "TEA Infantil 4 e 5 anos Atividades Inclusivamente.xlsx"
    if not path.exists():
        return
    seq = defaultdict(int)
    with zipfile.ZipFile(path) as z:
        shared = load_shared(z)
        for sname, target in sheet_map(z):
            if not re.search(r"Ativ", sname, re.I):
                continue
            year = "4anos" if "4" in sname else "5anos"
            rows = sheet_rows(z, target, shared, max_col=12)
            for row in rows[3:]:
                if len(row) < 6:
                    continue
                perfil = (row[3] or "").upper()
                ativ = row[5] or ""
                st = extract_enunciado(ativ) or (
                    ativ if ativ and len(ativ) < 120 else None
                )
                if not st:
                    continue
                k = enunciado_formatter(st)
                if not k or k in existing:
                    continue
                persona = (
                    "tea"
                    if ("TEA" in perfil and "DI" not in perfil)
                    else "infantil_di"
                )
                matter = (
                    "ma"
                    if re.search(r"NÚMERO|NUMERO|QUANT|CONTAR|MATEM", st, re.I)
                    else "lp"
                )
                opts = [
                    {"text": "Opção 1", "correct": True},
                    {"text": "Opção 2", "correct": False},
                    {"text": "Opção 3", "correct": False},
                ]
                # name-related
                if re.search(r"NOME|LETRA", st, re.I):
                    opts = [
                        {"text": "A", "correct": True},
                        {"text": "B", "correct": False},
                        {"text": "C", "correct": False},
                    ]
                seq[(persona, year, matter)] += 1
                out.append(
                    make_activity(
                        persona=persona,
                        year=year,
                        matter=matter,
                        pill_index=1,
                        pill_name=row[1][:48] if row[1] else "Bloco I",
                        level=1,
                        statement=st,
                        options=opts,
                        source="planilha:infantil",
                        seq=seq[(persona, year, matter)],
                        needs_review=True,
                    )
                )
                existing.add(k)


# ---------- BNCC generation ----------
BNCC_TEMPLATES = [
    # (code_prefix or code, matter, statements generators)
    (
        "LP01",
        "lp",
        [
            (
                "EM QUAL DIREÇÃO LEMOS O TEXTO?",
                [
                    {"text": "Da esquerda para a direita", "correct": True},
                    {"text": "Da direita para a esquerda", "correct": False},
                    {"text": "De baixo para cima", "correct": False},
                ],
            ),
            (
                "ONDE COMEÇA A LEITURA DA FRASE?",
                [
                    {"text": "Na esquerda", "correct": True},
                    {"text": "Na direita", "correct": False},
                    {"text": "No meio", "correct": False},
                ],
            ),
        ],
    ),
    (
        "LP02",
        "lp",
        [
            (
                "QUAL LETRA COMEÇA A PALAVRA CASA?",
                [
                    {"text": "C", "correct": True},
                    {"text": "A", "correct": False},
                    {"text": "S", "correct": False},
                ],
            ),
            (
                "QUAL PALAVRA COMEÇA COM A LETRA M?",
                [
                    {"text": "MESA", "correct": True},
                    {"text": "BOLA", "correct": False},
                    {"text": "PATO", "correct": False},
                ],
            ),
        ],
    ),
    (
        "LP03",
        "lp",
        [
            (
                "QUAL PALAVRA ESTÁ ESCRITA IGUAL AO MODELO BOLA?",
                [
                    {"text": "BOLA", "correct": True},
                    {"text": "BALA", "correct": False},
                    {"text": "BOLO", "correct": False},
                ],
            ),
        ],
    ),
    (
        "LP04",
        "lp",
        [
            (
                "QUAL DESTES SINAIS É UMA LETRA?",
                [
                    {"text": "A", "correct": True},
                    {"text": "3", "correct": False},
                    {"text": "@", "correct": False},
                ],
            ),
        ],
    ),
    (
        "LP05",
        "lp",
        [
            (
                "QUAL PALAVRA TEM O SOM DE BÊ NO COMEÇO?",
                [
                    {"text": "BOLA", "correct": True},
                    {"text": "CASA", "correct": False},
                    {"text": "MESA", "correct": False},
                ],
            ),
        ],
    ),
    (
        "LP06",
        "lp",
        [
            (
                "QUANTAS SÍLABAS TEM A PALAVRA GATO?",
                [
                    {"text": "2", "correct": True},
                    {"text": "1", "correct": False},
                    {"text": "3", "correct": False},
                ],
            ),
        ],
    ),
    (
        "MA01",
        "ma",
        [
            (
                "QUAL NÚMERO VEM DEPOIS DO 5?",
                [
                    {"text": "6", "correct": True},
                    {"text": "4", "correct": False},
                    {"text": "7", "correct": False},
                ],
            ),
            (
                "QUANTOS DEDOS TEMOS EM UMA MÃO?",
                [
                    {"text": "5", "correct": True},
                    {"text": "4", "correct": False},
                    {"text": "10", "correct": False},
                ],
            ),
        ],
    ),
    (
        "MA02",
        "ma",
        [
            (
                "QUANTO É 2 MAIS 3?",
                [
                    {"text": "5", "correct": True},
                    {"text": "4", "correct": False},
                    {"text": "6", "correct": False},
                ],
            ),
            (
                "QUANTO É 10 MENOS 1?",
                [
                    {"text": "9", "correct": True},
                    {"text": "8", "correct": False},
                    {"text": "11", "correct": False},
                ],
            ),
        ],
    ),
    (
        "MA03",
        "ma",
        [
            (
                "ONDE TEM MAIS OBJETOS?",
                [
                    {"text": "Grupo com 5", "correct": True},
                    {"text": "Grupo com 2", "correct": False},
                    {"text": "Grupo com 3", "correct": False},
                ],
            ),
        ],
    ),
    (
        "MA06",
        "ma",
        [
            (
                "QUAL É O DOBRO DE 4?",
                [
                    {"text": "8", "correct": True},
                    {"text": "6", "correct": False},
                    {"text": "4", "correct": False},
                ],
            ),
        ],
    ),
]


def generate_bncc(existing: set, out: list):
    """Generate many unique BNCC-aligned cards for gaps (years, personas, variants)."""
    seq = defaultdict(int)

    # Rich banks — each tuple (statement, opts, matter, bncc_suffix)
    bank_lp = []
    letters = list("ABCDEFGHIJLMNOPRSTUVXZ")
    words = [
        ("BOLA", "B"),
        ("CASA", "C"),
        ("MESA", "M"),
        ("PATO", "P"),
        ("GATO", "G"),
        ("SOL", "S"),
        ("LUA", "L"),
        ("RATO", "R"),
        ("FOCA", "F"),
        ("DADO", "D"),
        ("NAVIO", "N"),
        ("UVA", "U"),
        ("TATU", "T"),
        ("VACA", "V"),
        ("XALE", "X"),
    ]
    for w, L in words:
        wrong = [x for x in letters if x != L][:2]
        bank_lp.append(
            (
                f"QUAL LETRA COMEÇA A PALAVRA {w}?",
                [
                    {"text": L, "correct": True},
                    {"text": wrong[0], "correct": False},
                    {"text": wrong[1], "correct": False},
                ],
                "lp",
                "LP02",
            )
        )
        bank_lp.append(
            (
                f"QUAL PALAVRA COMEÇA COM A LETRA {L}?",
                [
                    {"text": w, "correct": True},
                    {"text": words[(words.index((w, L)) + 1) % len(words)][0], "correct": False},
                    {"text": words[(words.index((w, L)) + 2) % len(words)][0], "correct": False},
                ],
                "lp",
                "LP02",
            )
        )
        bank_lp.append(
            (
                f"QUAL É A ÚLTIMA LETRA DE {w}?",
                [
                    {"text": w[-1], "correct": True},
                    {"text": w[0], "correct": False},
                    {"text": "Z", "correct": False},
                ],
                "lp",
                "LP05",
            )
        )
        syl = max(1, (len(w) + 1) // 2)
        bank_lp.append(
            (
                f"QUANTAS SÍLABAS TEM A PALAVRA {w}?",
                [
                    {"text": str(syl), "correct": True},
                    {"text": str(syl + 1), "correct": False},
                    {"text": str(max(1, syl - 1)), "correct": False},
                ],
                "lp",
                "LP06",
            )
        )

    bank_lp += [
        (
            "EM QUAL DIREÇÃO LEMOS O TEXTO NO CADERNO?",
            [
                {"text": "Da esquerda para a direita", "correct": True},
                {"text": "Da direita para a esquerda", "correct": False},
                {"text": "De baixo para cima", "correct": False},
            ],
            "lp",
            "LP01",
        ),
        (
            "ONDE COMEÇA A LEITURA DE UMA FRASE?",
            [
                {"text": "Na esquerda", "correct": True},
                {"text": "Na direita", "correct": False},
                {"text": "No meio", "correct": False},
            ],
            "lp",
            "LP01",
        ),
        (
            "QUAL DESTES SINAIS É UMA LETRA DO ALFABETO?",
            [
                {"text": "A", "correct": True},
                {"text": "7", "correct": False},
                {"text": "#", "correct": False},
            ],
            "lp",
            "LP04",
        ),
        (
            "QUAL PALAVRA ESTÁ ESCRITA DE FORMA CORRETA?",
            [
                {"text": "CASA", "correct": True},
                {"text": "KAZA", "correct": False},
                {"text": "CAZA", "correct": False},
            ],
            "lp",
            "LP03",
        ),
        (
            "QUAL FRASE TEM PONTO FINAL?",
            [
                {"text": "O gato dorme.", "correct": True},
                {"text": "O gato dorme", "correct": False},
                {"text": "o gato", "correct": False},
            ],
            "lp",
            "LP09",
        ),
    ]

    bank_ma = []
    for a, b in [(1, 1), (2, 2), (3, 2), (4, 3), (5, 5), (6, 4), (7, 2), (8, 1), (9, 3), (10, 5),
                 (11, 4), (12, 8), (15, 5), (20, 10), (25, 5), (30, 10), (50, 25), (100, 50)]:
        s = a + b
        bank_ma.append(
            (
                f"QUANTO É {a} MAIS {b}?",
                [
                    {"text": str(s), "correct": True},
                    {"text": str(s + 1), "correct": False},
                    {"text": str(max(0, s - 1)), "correct": False},
                ],
                "ma",
                "MA02",
            )
        )
        if a > b:
            d = a - b
            bank_ma.append(
                (
                    f"QUANTO É {a} MENOS {b}?",
                    [
                        {"text": str(d), "correct": True},
                        {"text": str(d + 1), "correct": False},
                        {"text": str(a + b), "correct": False},
                    ],
                    "ma",
                    "MA02",
                )
            )
    for n in range(1, 21):
        bank_ma.append(
            (
                f"QUAL NÚMERO VEM DEPOIS DO {n}?",
                [
                    {"text": str(n + 1), "correct": True},
                    {"text": str(n - 1 if n > 1 else n + 2), "correct": False},
                    {"text": str(n + 2), "correct": False},
                ],
                "ma",
                "MA01",
            )
        )
        bank_ma.append(
            (
                f"QUAL NÚMERO VEM ANTES DO {n + 1}?",
                [
                    {"text": str(n), "correct": True},
                    {"text": str(n + 1), "correct": False},
                    {"text": str(n + 2), "correct": False},
                ],
                "ma",
                "MA01",
            )
        )
    for n in [2, 3, 4, 5, 6, 7, 8, 10, 12, 15]:
        bank_ma.append(
            (
                f"QUAL É O DOBRO DE {n}?",
                [
                    {"text": str(n * 2), "correct": True},
                    {"text": str(n + 2), "correct": False},
                    {"text": str(n * 2 + 1), "correct": False},
                ],
                "ma",
                "MA06",
            )
        )
    bank_ma += [
        (
            "ONDE TEM MAIS ITENS: 3 OU 7?",
            [
                {"text": "7", "correct": True},
                {"text": "3", "correct": False},
                {"text": "São iguais", "correct": False},
            ],
            "ma",
            "MA03",
        ),
        (
            "ONDE TEM MENOS ITENS: 2 OU 9?",
            [
                {"text": "2", "correct": True},
                {"text": "9", "correct": False},
                {"text": "São iguais", "correct": False},
            ],
            "ma",
            "MA03",
        ),
        (
            "QUANTOS DEDOS TEMOS NAS DUAS MÃOS?",
            [
                {"text": "10", "correct": True},
                {"text": "5", "correct": False},
                {"text": "8", "correct": False},
            ],
            "ma",
            "MA01",
        ),
    ]

    years = ["01", "02", "03", "04", "05"]
    # di_tea all years; tea weak years; tea_di only 03-05 light fill
    persona_years = {
        "di_tea": years,
        "tea": ["01", "02"],
        "tea_di": ["03", "04", "05"],
    }
    for persona, ylist in persona_years.items():
        for year in ylist:
            for st, opts, matter, tag in bank_lp + bank_ma:
                # year salt to avoid global key collision while staying sensible
                st_y = st if year in ("01", "02") else st
                if year in ("04", "05") and "MAIS" in st and "1 MAIS 1" in st:
                    continue
                k = enunciado_formatter(st_y)
                if not k or k in existing:
                    continue
                code = f"EF{int(year)}{tag}"
                seq[(persona, year, matter)] += 1
                out.append(
                    make_activity(
                        persona=persona,
                        year=year,
                        matter=matter,
                        pill_index=99,
                        pill_name="BNCC — reforço",
                        level=1 if int(year) <= 3 else 2,
                        statement=st_y,
                        options=opts,
                        source="bncc-generated",
                        bncc=[code],
                        seq=seq[(persona, year, matter)],
                        needs_review=False,
                    )
                )
                existing.add(k)

    # Infantil EI bank
    ei_items = []
    for n in range(1, 11):
        ei_items.append(
            (
                f"TOQUE NO NÚMERO {n}",
                [
                    {"text": str(n), "correct": True},
                    {"text": str((n % 10) + 1), "correct": False},
                    {"text": str((n + 2) % 10 or 1), "correct": False},
                ],
                "ma",
            )
        )
    for L, w in [("A", "AVIÃO"), ("B", "BOLA"), ("C", "CASA"), ("M", "MÃO"), ("P", "PATO"), ("S", "SOL")]:
        ei_items.append(
            (
                f"QUAL FIGURA COMEÇA COM A LETRA {L}?",
                [
                    {"text": w, "correct": True},
                    {"text": "XÍCARA", "correct": False},
                    {"text": "ZEBRA", "correct": False},
                ],
                "lp",
            )
        )
    ei_items += [
        (
            "TOQUE NA COR VERMELHA",
            [
                {"text": "Vermelho", "correct": True},
                {"text": "Azul", "correct": False},
                {"text": "Verde", "correct": False},
            ],
            "lp",
        ),
        (
            "TOQUE NA COR AZUL",
            [
                {"text": "Azul", "correct": True},
                {"text": "Amarelo", "correct": False},
                {"text": "Preto", "correct": False},
            ],
            "lp",
        ),
        (
            "QUAL ANIMAL FAZ MIAU?",
            [
                {"text": "Gato", "correct": True},
                {"text": "Cachorro", "correct": False},
                {"text": "Vaca", "correct": False},
            ],
            "lp",
        ),
        (
            "QUAL ANIMAL FAZ AU AU?",
            [
                {"text": "Cachorro", "correct": True},
                {"text": "Gato", "correct": False},
                {"text": "Pato", "correct": False},
            ],
            "lp",
        ),
        (
            "QUANTOS SÃO DOIS MAIS UM?",
            [
                {"text": "3", "correct": True},
                {"text": "2", "correct": False},
                {"text": "4", "correct": False},
            ],
            "ma",
        ),
    ]
    for year in ("4anos", "5anos"):
        for st, opts, matter in ei_items:
            k = enunciado_formatter(st)
            if not k or k in existing:
                continue
            seq[("infantil_di", year, matter)] += 1
            out.append(
                make_activity(
                    persona="infantil_di",
                    year=year,
                    matter=matter,
                    pill_index=99,
                    pill_name="BNCC EI — reforço",
                    level=1,
                    statement=st,
                    options=opts,
                    source="bncc-generated-ei",
                    bncc=["EI02EO01"] if year == "4anos" else ["EI03EO01"],
                    seq=seq[("infantil_di", year, matter)],
                )
            )
            existing.add(k)


def main():
    existing = catalog_keys()
    before = len(existing)
    out: list = []
    print("Catalog keys:", before)
    import_345(existing, out)
    print("After planilha 3-5:", len(out))
    import_dev(existing, out)
    print("After DEV:", len(out))
    import_infantil(existing, out)
    print("After infantil:", len(out))
    n_plan = len(out)
    generate_bncc(existing, out)
    print("After BNCC gen:", len(out), "(+bncc", len(out) - n_plan, ")")

    by = defaultdict(int)
    by_src = defaultdict(int)
    for a in out:
        by[f"{a['persona']}|{a['year']}|{a['matter']}"] += 1
        by_src[a["source_path"].split(":")[0]] += 1

    report = {
        "catalog_keys_before": before,
        "new_activities": len(out),
        "by_persona_year_matter": dict(sorted(by.items(), key=lambda x: -x[1])),
        "by_source": dict(by_src),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps({"report": report, "activities": out}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
