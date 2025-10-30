from flask import Flask, request, jsonify, render_template, session, redirect
from datetime import datetime
import sqlite3
import logging
import re
import os

app = Flask(__name__)
app.secret_key = "dev-secret"

# -------------------- DB 連線與建表 --------------------
def get_db_connection():
    db_path = os.path.join(os.path.dirname(__file__), 'shopping_data.db')
    # 若檔案不存在也會自動建立
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    # 使用者表
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_table(
            username TEXT PRIMARY KEY,
            password TEXT,
            email    TEXT
        )
    """)
    # 訂單表（購物頁用得到）
    cur.execute("""
        CREATE TABLE IF NOT EXISTS order_table(
            product     TEXT,
            price       INTEGER,
            number      INTEGER,
            total_price INTEGER,
            time        TEXT
        )
    """)
    conn.commit()
    return conn


# -------------------- 首頁：依是否登入導頁 --------------------
@app.route('/')
def root():
    return redirect('/shopping' if 'username' in session else '/page_login')


# -------------------- 登入頁 --------------------
@app.route('/page_login', methods=['GET', 'POST'])
def page_login():
    try:
        if request.method == 'POST':
            # 支援表單或 JSON 兩種
            data = request.get_json(silent=True) or request.form
            username = (data.get('username') or '').strip()
            password = data.get('password') or ''

            result = login_user(username, password)

            # 表單送出：成功直接導到購物頁；失敗回登入頁
            if request.content_type is None or 'application/x-www-form-urlencoded' in (request.content_type or ''):
                if result["status"] == "success":
                    session['username'] = username
                    return redirect('/shopping')
                return render_template('page_login_.html', alert_text='帳號或密碼錯誤'), 400

            # JSON（例如 fetch）就回 JSON
            if result["status"] == "success":
                session['username'] = username
            return jsonify(result)

        # GET：顯示頁面
        return render_template('page_login_.html')
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# 後台登入檢查副程式
def login_user(username, password):
    conn = get_db_connection()
    if conn is not None:
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM user_table WHERE username = ? AND password = ?",
                (username, password)
            )
            user = cursor.fetchone()
            if user:
                return {"status": "success", "message": "登入成功"}
            else:
                return {"status": "error", "message": "帳號或密碼錯誤"}
        except sqlite3.Error as e:
            logging.error(f"Database query error: {e}")
            return {"status": "error", "message": "系統錯誤，請稍後再試"}
        finally:
            conn.close()
    else:
        return {"status": "error", "message": "資料庫連線錯誤"}


# -------------------- 註冊頁 --------------------
@app.route('/page_register', methods=['GET', 'POST'])
def page_register():
    if request.method == 'POST':
        data = request.get_json(silent=True) or request.form
        username = (data.get('username') or '').strip()
        password = data.get('password') or ''
        email    = (data.get('email') or '').strip()

        # 規則檢查（題目 c、d）
        # 密碼：至少 8 碼，且同時包含英文大小寫
        if len(password) < 8 or not re.search(r'[a-z]', password) or not re.search(r'[A-Z]', password):
            msg = "密碼須超過8個字且包含英文字大小寫，重新輸入"
            # 表單提交：直接回頁面提示；JSON：回 JSON
            if request.content_type and 'application/json' in request.content_type:
                return jsonify({"status": "error", "message": msg})
            return render_template('page_register.html', alert_text=msg), 400

        # 信箱：必須是 xxx@gmail.com
        if not re.match(r'^[A-Za-z0-9._%+-]+@gmail\.com$', email):
            msg = "Email 格式不符，重新輸入"
            if request.content_type and 'application/json' in request.content_type:
                return jsonify({"status": "error", "message": msg})
            return render_template('page_register.html', alert_text=msg), 400

        # 寫入或更新（題目 e、f、g、h）
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM user_table WHERE username=?", (username,))
        exists = cur.fetchone()

        if exists:
            # 帳號已存在：更新密碼或信箱
            cur.execute("UPDATE user_table SET password=?, email=? WHERE username=?",
                        (password, email, username))
            conn.commit()
            conn.close()
            msg = "帳號已存在，成功修改密碼或信箱"
            if request.content_type and 'application/json' in request.content_type:
                return jsonify({"status": "success", "message": msg})
            # 表單成功 → 顯示 alert 後導回登入
            return redirect('/page_login')
        else:
            # 新增
            cur.execute("INSERT INTO user_table(username, password, email) VALUES (?,?,?)",
                        (username, password, email))
            conn.commit()
            conn.close()
            msg = "註冊成功"
            if request.content_type and 'application/json' in request.content_type:
                return jsonify({"status": "success", "message": msg})
            return redirect('/page_login')

    # GET
    return render_template('page_register.html')


# -------------------- 其他路由：註冊捷徑 / 登出 / 購物頁 / 下單 --------------------
@app.route('/register')
def register_alias():
    return redirect('/page_register')

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/page_login')

@app.route('/shopping')
def shopping():
    # 在模板裡可以用 {{ username }} 或把 username 放在 data-username 讓 JS 讀
    return render_template('index.html', username=session.get('username', 'Guest'))

@app.route('/place_order', methods=['POST'])
def place_order():
    data = request.get_json(silent=True) or {}
    items = data.get('items', [])  # [{name, price, qty}]
    if not items:
        return jsonify({"status": "error", "message": "未選擇任何商品"}), 400

    now = datetime.now().strftime('%Y/%m/%d %H:%M')

    lines = [f"{now}，已成功下單:", ""]
    total_sum = 0
    rows = []
    for it in items:
        name  = it.get('name', '')
        price = int(it.get('price', 0))
        qty   = int(it.get('qty', 0))
        if qty <= 0:
            continue
        subtotal = price * qty
        total_sum += subtotal
        lines.append(f"{name}:  {price} NT/件 x{qty} 共 {subtotal} NT")
        rows.append((name, price, qty, subtotal, now))

    if not rows:
        return jsonify({"status": "error", "message": "未選擇任何商品"}), 400

    lines.append("")
    lines.append(f"此單花費總金額: {total_sum} NT")
    msg = "\n".join(lines)

    conn = get_db_connection()
    cur = conn.cursor()
    cur.executemany(
        "INSERT INTO order_table(product, price, number, total_price, time) VALUES (?,?,?,?,?)",
        rows
    )
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": msg})


# -------------------- 主程式 --------------------
if __name__ == '__main__':
    # host/port 可保持預設
    app.run()
