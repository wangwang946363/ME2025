from flask import Flask, request, jsonify, render_template, session, redirect, url_for, flash
from datetime import datetime
import sqlite3, os, re

app = Flask(__name__)
app.secret_key = 'dev-secret'


# -----------------------------
# 建立資料庫連線
# -----------------------------
def get_db_connection():
    db_path = os.path.join(os.path.dirname(__file__), 'shopping_data.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS user_table(
            username TEXT PRIMARY KEY,
            password TEXT,
            email TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS order_table(
            product TEXT,
            price INTEGER,
            number INTEGER,
            total_price INTEGER,
            time TEXT
        )
    """)
    return conn


# -----------------------------
# 首頁導向登入
# -----------------------------
@app.route('/')
def index():
    return redirect('/page_login')


# -----------------------------
# 登入頁
# -----------------------------
@app.route('/page_login', methods=['GET', 'POST'])
def page_login():
    if request.method == 'POST':
        data = request.get_json(silent=True) or request.form
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM user_table WHERE username=? AND password=?", (username, password))
        user = cur.fetchone()
        conn.close()

        if user:
            session['username'] = username
            return jsonify({"status": "success", "message": "登入成功", "redirect": "/shopping"})
        else:
            return jsonify({"status": "error", "message": "帳號或密碼錯誤"})
    return render_template('page_login.html')


# -----------------------------
# 註冊頁
# -----------------------------
@app.route('/page_register', methods=['GET', 'POST'])
def page_register():
    if request.method == 'POST':
        data = request.get_json(silent=True) or request.form
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        email = data.get('email', '').strip()

        # --- 密碼規則 ---
        if len(password) < 8 or not re.search(r'[a-z]', password) or not re.search(r'[A-Z]', password):
            return jsonify({"status": "error", "message": "密碼需超過8字且包含英文大小寫"})

        # --- Email 規則 ---
        if not re.match(r'^[A-Za-z0-9._%+-]+@gmail\.com$', email):
            return jsonify({"status": "error", "message": "Email 格式錯誤，請使用 xxx@gmail.com"})

        # --- 資料庫檢查 ---
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM user_table WHERE username=?", (username,))
        user = cur.fetchone()

        if user:
            # 帳號存在 → 更新密碼與信箱
            cur.execute("UPDATE user_table SET password=?, email=? WHERE username=?", (password, email, username))
            conn.commit()
            conn.close()
            return jsonify({"status": "update", "message": "帳號已存在，成功修改密碼與信箱"})
        else:
            # 新註冊
            cur.execute("INSERT INTO user_table VALUES (?,?,?)", (username, password, email))
            conn.commit()
            conn.close()
            return jsonify({"status": "success", "message": "註冊成功", "redirect": "/page_login"})
    return render_template('page_register.html')


# -----------------------------
# 登出
# -----------------------------
@app.route('/logout')
def logout():
    session.clear()
    return redirect('/page_login')


# -----------------------------
# 購物頁
# -----------------------------
@app.route('/shopping')
def shopping():
    username = session.get('username')
    if not username:
        return redirect('/page_login')
    return render_template('index.html', username=username)


# -----------------------------
# 下單
# -----------------------------
@app.route('/place_order', methods=['POST'])
def place_order():
    data = request.get_json() or {}
    items = data.get('items', [])
    if not items:
        return jsonify({"status": "error", "message": "未選擇任何商品"})

    now = datetime.now().strftime('%Y/%m/%d %H:%M')
    conn = get_db_connection()
    cur = conn.cursor()
    total_sum = 0
    for it in items:
        name, price, qty = it['name'], int(it['price']), int(it['qty'])
        subtotal = price * qty
        total_sum += subtotal
        cur.execute("INSERT INTO order_table VALUES (?,?,?,?,?)", (name, price, qty, subtotal, now))
    conn.commit()
    conn.close()

    msg = f"{now}，已成功下單：\n"
    for it in items:
        msg += f"{it['name']}: {it['price']} NT/件 x {it['qty']} 共 {int(it['price']) * int(it['qty'])} NT\n"
    msg += f"\n此單花費總金額: {total_sum} NT"
    return jsonify({"status": "success", "message": msg})


# -----------------------------
# 啟動
# -----------------------------
if __name__ == '__main__':
    app.run(debug=True)
