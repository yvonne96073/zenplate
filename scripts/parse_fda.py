"""
Parse Taiwan FDA Food Nutrition Database (2025 UPDATE1)
Input : fda_nutrition_raw.xlsx  (in project root)
Output: src/data/fdaNutrition.json
"""

import pandas as pd
import json
import re
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

# ── Load ─────────────────────────────────────────────────────────────────────
print("Reading Excel …")
df = pd.read_excel(
    '../fda_nutrition_raw.xlsx',
    header=1,          # row 1 (0-indexed) = actual header row
    dtype=str,         # read everything as string first; we'll coerce later
)

print(f"  Rows: {len(df)}, Columns: {len(df.columns)}")

# ── Column map ────────────────────────────────────────────────────────────────
# Map Excel column name → our field name
COL = {
    '整合編號':         'id',
    '食品分類':         'category',
    '樣品名稱':         'nameZh',
    '俗名':             'aliasesRaw',
    '廢棄率(%)':        'wasteRate',
    '熱量(kcal)':       'calories',
    '修正熱量(kcal)':   'caloriesAdj',
    '水分(g)':          'water',
    '粗蛋白(g)':        'protein',
    '粗脂肪(g)':        'fat',
    '飽和脂肪(g)':      'fatSaturated',
    '灰分(g)':          'ash',
    '總碳水化合物(g)':  'carbs',
    '膳食纖維(g)':      'fiber',
    '糖質總量(g)':      'sugar',
    '鈉(mg)':           'sodium',
    '鉀(mg)':           'potassium',
    '鈣(mg)':           'calcium',
    '鐵(mg)':           'iron',
    '鋅(mg)':           'zinc',
    '磷(mg)':           'phosphorus',
    '維生素C(mg)':      'vitaminC',
    '膽固醇(mg)':       'cholesterol',
    '反式脂肪(mg)':     'fatTrans',
}

# Keep only columns that exist in the sheet
available = {k: v for k, v in COL.items() if k in df.columns}
missing   = [k for k in COL if k not in df.columns]
if missing:
    print(f"  ⚠ Columns not found (skipped): {missing}")

df = df.rename(columns=available)[list(available.values())]

# ── Numeric coercion ──────────────────────────────────────────────────────────
NUM_FIELDS = [f for f in available.values() if f not in ('id', 'category', 'nameZh', 'aliasesRaw')]

def to_num(val):
    """Convert string value to float, return None for blanks / non-numeric."""
    if val is None or (isinstance(val, str) and val.strip() in ('', '-', 'N/A', 'Tr', 'tr')):
        return None
    try:
        # Strip footnote markers like 0.1, 0.2 that appear as superscripts
        cleaned = re.sub(r'[^\d.\-]', '', str(val))
        return round(float(cleaned), 4) if cleaned else None
    except ValueError:
        return None

for col in NUM_FIELDS:
    df[col] = df[col].apply(to_num)

# ── Skip rows with no ID or no name ──────────────────────────────────────────
df = df[df['id'].notna() & df['nameZh'].notna()].copy()
df['id']     = df['id'].str.strip()
df['nameZh'] = df['nameZh'].str.strip()
print(f"  Valid records after filter: {len(df)}")

# ── Aliases ───────────────────────────────────────────────────────────────────
def parse_aliases(raw):
    if not raw or str(raw).strip() in ('', 'nan', 'None'):
        return []
    parts = re.split(r'[,，、；;]', str(raw))
    return [p.strip() for p in parts if p.strip()]

df['aliasesZh'] = df['aliasesRaw'].apply(parse_aliases)

# ── Category cleanup ──────────────────────────────────────────────────────────
df['category'] = df['category'].fillna('其他').str.strip()

# ── Build records ─────────────────────────────────────────────────────────────
records = []
for _, row in df.iterrows():
    rec = {
        'id':             row['id'],
        'nameZh':         row['nameZh'],
        'aliasesZh':      row['aliasesZh'],
        'category':       row.get('category', '其他'),
        # Core nutrition per 100g
        'caloriesPer100g':    row.get('calories'),
        'proteinPer100g':     row.get('protein'),
        'carbsPer100g':       row.get('carbs'),
        'fatPer100g':         row.get('fat'),
        'fiberPer100g':       row.get('fiber'),
        'sugarPer100g':       row.get('sugar'),
        'sodiumPer100g':      row.get('sodium'),
        'fatSaturatedPer100g':row.get('fatSaturated'),
        'fatTransPer100g':    row.get('fatTrans'),
        'cholesterolPer100g': row.get('cholesterol'),
        'waterPer100g':       row.get('water'),
        'potassiumPer100g':   row.get('potassium'),
        'calciumPer100g':     row.get('calcium'),
        'ironPer100g':        row.get('iron'),
        'vitaminCPer100g':    row.get('vitaminC'),
        'source': 'Taiwan FDA Food Nutrition Database 2025 UPDATE1',
    }
    records.append(rec)

# ── Write JSON ────────────────────────────────────────────────────────────────
out_dir = '../src/data'
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, 'fdaNutrition.json')

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(records, f, ensure_ascii=False, indent=None, separators=(',', ':'))

size_kb = os.path.getsize(out_path) / 1024
print(f"\n✅ Written {len(records)} records → {out_path} ({size_kb:.0f} KB)")

# ── Print category distribution ───────────────────────────────────────────────
cats = df['category'].value_counts()
print("\nCategories:")
for cat, cnt in cats.items():
    print(f"  {cat}: {cnt}")

# ── Sample output ─────────────────────────────────────────────────────────────
print("\nSample record:")
print(json.dumps(records[0], ensure_ascii=False, indent=2))
