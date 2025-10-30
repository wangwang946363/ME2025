import re
import sqlite3
from datetime import datetime

DB_PATH = "users.db"

#資料庫準備
def ensure_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute
    ("""
        CREATE TABLE IF NOT EXISTS users
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """
    )
    conn.commit()
    return conn

#驗證工具
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@gmail\.com$")

def is_valid_email(email: str) -> bool:
    return EMAIL_RE.match(email) is not None

def has_sequential_digits(pw: str) -> bool:
    # 檢查是否包含長度>=3 的連號 (升/降)，例 123、456、987、321
    digits = [ord(c) - ord('0') for c in pw if c.isdigit()]
    if len(digits) < 3:
        return False
    # 逐一檢查連號片段
    for i in range(len(digits) - 2):
        a, b, c = digits[i:i+3]
        if (b == a + 1 and c == b + 1) or (b == a - 1 and c == b - 1):
            return True
    return False

def validate_password(pw: str) -> (bool, str):
    # 規則：>=8、含大小寫、數字、特殊字元、不得空白、不得含連號
    if len(pw) < 8:
        return False, "密碼至少 8 碼"
    if any(ch.isspace() for ch in pw):
        return False, "密碼不可包含空白字元"
    if not re.search(r"[A-Z]", pw):
        return False, "需包含大寫英文"
    if not re.search(r"[a-z]", pw):
        return False, "需包含小寫英文"
    if not re.search(r"\d", pw):
        return False, "需包含數字"
    if not re.search(r"[^A-Za-z0-9]", pw):
        return False, "需包含特殊字元"
    if has_sequential_digits(pw):
        return False, "不可包含連號（例如 123 或 321）"
    return True, "OK"

#資料庫操作
def find_user_by_name_email(cur, name: str, email: str):
    cur.execute("SELECT id, name, email, password FROM users WHERE name=? AND email=?", (name, email))
    return cur.fetchone()

def find_user_by_email(cur, email: str):
    cur.execute("SELECT id, name, email, password FROM users WHERE email=?", (email,))
    return cur.fetchone()

def insert_user(cur, name: str, email: str, password: str):
    now = datetime.now().isoformat(sep=' ', timespec='seconds')
    cur.execute(
        "INSERT INTO users(name, email, password, created_at, updated_at) VALUES(?,?,?,?,?)",
        (name, email, password, now, now)
    )

def update_user_by_email(cur, name: str, email: str, password: str):
    now = datetime.now().isoformat(sep=' ', timespec='seconds')
    cur.execute(
        "UPDATE users SET name=?, password=?, updated_at=? WHERE email=?",
        (name, password, now, email)
    )

#互動
def prompt_non_empty(prompt_text: str) -> str:
    while True:
        s = input(prompt_text).strip()
        if s:
            return s
        print("不可為空，請重新輸入。")

def signup_flow(conn):
    cur = conn.cursor()

    #Name
    name = prompt_non_empty("Name：")

    #Email
    while True:
        email = input("Email（需為 XXX@gmail.com）：").strip()
        if is_valid_email(email):
            break
        print("Email 格式不符，請重新輸入（必須為 XXX@gmail.com）。")

    #Password
    while True:
        password = input("Password（至少 8 碼，含大小寫、數字、特殊字元，且不得連號）：")
        ok, msg = validate_password(password)
        if ok:
            break
        print(f"密碼不符規則：{msg}，請重新輸入。")
    print()

    #顯示註冊資料並確認
    print(f"顯示註冊資料：save {name} | {email} | {password} | Y / N ?")
    yn = input().strip().upper()
    if yn != "Y":
        print("已返回主選單。\n")
        return

    #寫入or更新
    exists = find_user_by_email(cur, email)
    if exists is None:
        try:
            insert_user(cur, name, email, password)
            conn.commit()
            print("✅ 新增成功！帳號已寫入資料庫。\n")
        except sqlite3.IntegrityError:
            print("❌ 寫入失敗（Email 已存在或其它錯誤）。\n")
    else:
        print("⚠️ 該 Email 已存在，是否要更新資訊（姓名/密碼）？ Y / N")
        yn2 = input().strip().upper()
        if yn2 == "Y":
            update_user_by_email(cur, name, email, password)
            conn.commit()
            print("✅ 已更新現有 Email 的資料。\n")
        else:
            print("已取消更新，返回主選單。\n")

def signin_flow(conn):
    cur = conn.cursor()

    name = prompt_non_empty("輸入姓名：")
    email = prompt_non_empty("輸入 Email：")

    user = find_user_by_name_email(cur, name, email)
    if user is None:
        print("❌ 名字或 Email 錯誤。請選擇：a) sign up  /  b) sign in（返回主選單）\n")
        return

    #有此人->驗密碼
    pw = input("輸入密碼：")
    if pw != user[3]:
        print("❌ 密碼錯誤，忘記密碼 Y / N ?（Y 進入註冊模式以重設密碼）")
        yn = input().strip().upper()
        if yn == "Y":
            print("\n— 進入重設流程（註冊模式）—")
            signup_flow(conn)
        else:
            print("已返回主選單。\n")
        return

    print("✅ 登入成功！\n")

def main():
    conn = ensure_db()
    print("=== 註冊系統（users.db）===")
    while True:
        print("請選擇模式： (a) sign up  /  (b) sign in  /  (q) 離開")
        choice = input("> ").strip().lower()
        if choice == "a":
            print("\n— 註冊模式 —")
            signup_flow(conn)
        elif choice == "b":
            print("\n— 登入模式 —")
            signin_flow(conn)
        elif choice == "q":
            print("Bye!")
            break
        else:
            print("無效選項，請重新輸入。\n")
    conn.close()

if __name__ == "__main__":
    main()
