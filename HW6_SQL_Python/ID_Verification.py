import sqlite3
from typing import List, Tuple

DB_PATH = "ID_data.db"
SOURCE_TABLE = "ID_table"
TARGET_TABLE = "Verified_IDs" 

#字母->轉換值，驗證用；字母->縣市
LETTER_TO_NUM = {
    'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15,
    'G': 16, 'H': 17, 'I': 34, 'J': 18, 'K': 19, 'L': 20,
    'M': 21, 'N': 22, 'O': 35, 'P': 23, 'Q': 24, 'R': 25,
    'S': 26, 'T': 27, 'U': 28, 'V': 29, 'W': 32, 'X': 30,
    'Y': 31, 'Z': 33
}
CITY_MAP = {
    'A': '臺北市', 'B': '臺中市', 'C': '基隆市', 'D': '臺南市', 'E': '高雄市',
    'F': '新北市', 'G': '宜蘭縣', 'H': '桃園市', 'I': '嘉義市', 'J': '新竹縣',
    'K': '苗栗縣', 'L': '臺中縣(已裁撤)', 'M': '南投縣', 'N': '彰化縣', 'O': '新竹市',
    'P': '雲林縣', 'Q': '嘉義縣', 'R': '臺南縣(已裁撤)', 'S': '高雄縣(已裁撤)', 'T': '屏東縣',
    'U': '花蓮縣', 'V': '臺東縣', 'W': '金門縣', 'X': '澎湖縣', 'Y': '陽明山管理局(已裁撤)', 'Z': '連江縣'
}
WEIGHTS = [1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1]  # a1,a2,n1..n9

def checksum_ok(id10: str) -> bool:
    s = id10.strip().upper()
    if len(s) != 10 or not s[0].isalpha() or not s[1:].isdigit():
        return False
    a = LETTER_TO_NUM.get(s[0])
    if a is None:
        return False
    a1, a2 = divmod(a, 10)
    digits = [a1, a2] + [int(c) for c in s[1:]]
    return sum(d*w for d, w in zip(digits, WEIGHTS)) % 10 == 0

def fill_check_digit(id9: str) -> str:
    s = id9.strip().upper()
    if len(s) != 9 or not s[0].isalpha() or not s[1:].isdigit():
        return s
    a = LETTER_TO_NUM.get(s[0])
    if a is None: return s
    a1, a2 = divmod(a, 10)
    base = [a1, a2] + [int(c) for c in s[1:]]  #長度10（未含檢查碼）
    base_sum = sum(d*w for d, w in zip(base, WEIGHTS[:10]))
    for d in range(10):
        if (base_sum + d) % 10 == 0:
            return s + str(d)
    return s

def parse_gender(d2: str) -> str:
    return "男性" if d2 == '1' else ("女性" if d2 == '2' else "未知")

def parse_citizenship(d3: str) -> str:
    if d3 in '012345': return "台灣出生之本籍國民"
    if d3 == '6': return "入籍國民（原為外國人）"
    if d3 == '7': return "入籍國民（原為無戶籍國民）"
    if d3 == '8': return "入籍國民（原為港澳居民）"
    if d3 == '9': return "入籍國民（原為大陸地區居民）"
    return "未知"

def ensure_citycode(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS CityCode(
          letter TEXT PRIMARY KEY,
          a1 INTEGER NOT NULL,
          a2 INTEGER NOT NULL,
          city TEXT NOT NULL
        )
    """)
    rows = [(ch, v//10, v%10, CITY_MAP.get(ch, "未知地區")) for ch, v in LETTER_TO_NUM.items()]
    cur.executemany("""
        INSERT INTO CityCode(letter,a1,a2,city)
        VALUES(?,?,?,?)
        ON CONFLICT(letter) DO UPDATE SET a1=excluded.a1, a2=excluded.a2, city=excluded.city
    """, rows)
    conn.commit()

def ensure_verified_table(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS {TARGET_TABLE}(
            ID          TEXT PRIMARY KEY,
            City        TEXT,
            Gender      TEXT,
            Citizenship TEXT,
            Valid       INTEGER
        )
    """)
    conn.commit()

def process_id_table(conn: sqlite3.Connection, write_verified: bool = True) -> None:
    cur = conn.cursor()
    cur.execute(f"SELECT ID FROM {SOURCE_TABLE}")
    ids = [r[0] for r in cur.fetchall()]

    ensure_verified_table(conn) if write_verified else None

    valid_cnt = 0
    invalid_ids: List[str] = []
    verified_rows: List[Tuple[str,str,str,str,int]] = []

    for raw in ids:
        s = raw.strip().upper()
        #補檢查碼
        if len(s) == 9:                    
            new_id = fill_check_digit(s)
            cur.execute(f"UPDATE {SOURCE_TABLE} SET ID=? WHERE ID=?", (new_id, raw))
            s = new_id

        if not checksum_ok(s):
            invalid_ids.append(s)
            if write_verified:
                verified_rows.append((s, CITY_MAP.get(s[:1],'未知地區'), "未知", "未知", 0))
            continue

        #合法->解析欄位並更新
        city = CITY_MAP.get(s[0], "未知地區")
        gender = parse_gender(s[1])
        citizen = parse_citizenship(s[2])
        cur.execute(f"""
            UPDATE {SOURCE_TABLE}
            SET country=?, gender=?, citizenship=?
            WHERE ID=?""", (city, gender, citizen, s))
        valid_cnt += 1
        if write_verified:
            verified_rows.append((s, city, gender, citizen, 1))

    #刪除不合法
    if invalid_ids:
        cur.executemany(f"DELETE FROM {SOURCE_TABLE} WHERE ID=?", [(x,) for x in invalid_ids])
        print(f"❌ 已刪除不合法 {len(invalid_ids)} 筆")

    #寫Verified_IDs
    if write_verified and verified_rows:
        cur.executemany(f"""
            INSERT OR REPLACE INTO {TARGET_TABLE}
            (ID, City, Gender, Citizenship, Valid)
            VALUES (?,?,?,?,?)""", verified_rows)

    conn.commit()
    print(f"✅ 已更新合法 {valid_cnt} 筆；目前表內剩餘筆數：{count_rows(conn, SOURCE_TABLE)}")

def count_rows(conn: sqlite3.Connection, table: str) -> int:
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {table}")
    return cur.fetchone()[0]

def interactive_check() -> None:
    print("\n🟢 互動檢查（輸入 q 結束）")
    while True:
        s = input("請輸入身分證字號：").strip().upper()
        if s.lower() == 'q':
            break
        if checksum_ok(s):
            print(f"✅ 真 → {s} {CITY_MAP.get(s[0],'未知地區')} {parse_gender(s[1])} {parse_citizenship(s[2])}\n")
        else:
            print("❌ 假，請重新輸入。\n")

def main():
    conn = sqlite3.connect(DB_PATH)
    #建立/更新 CityCode 對照表
    ensure_citycode(conn)  
    #清理並更新 ID_table（含寫 Verified_IDs）               
    process_id_table(conn, write_verified=True)  
    conn.close()
    #互動式輸入檢查
    interactive_check()                   

if __name__ == "__main__":
    main()
