from flask import Flask, render_template, request, redirect, url_for, jsonify, session, flash
from werkzeug.security import check_password_hash
import sqlite3, os

app = Flask(__name__)
app.secret_key = "mysecret"  # demo 用

# 固定使用專案資料夾下的 users.db（避免抓到別處同名檔）
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "users.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ---------- Login ----------
@app.route("/")
def index():
    if "teacher" in session:
        return redirect(url_for("grades_form"))
    return render_template("login.html")

@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT * FROM teachers WHERE username = ?", (username,))
        user = cur.fetchone()
        conn.close()
    except sqlite3.Error as e:
        flash(f"登入資料表錯誤：{e}")
        return redirect(url_for("index"))

    if not user:
        flash("錯誤的名稱：查無此帳號")
        return redirect(url_for("index"))

    keys = user.keys()
    if "password_hash" in keys:
        ok = check_password_hash(user["password_hash"], password)
    elif "password" in keys:
        ok = (user["password"] == password)
    else:
        ok = False

    if not ok:
        flash("錯誤的密碼")
        return redirect(url_for("index"))

    session["teacher"] = username
    return redirect(url_for("grades_form"))

@app.route("/logout")
def logout():
    session.pop("teacher", None)
    return redirect(url_for("index"))

# ---------- HTML 表單版 ----------
@app.route("/grades/form")
def grades_form():
    if "teacher" not in session:
        return redirect(url_for("index"))
    conn = get_db()
    cur = conn.cursor()
    # 以別名輸出，模板統一使用 student_name / student_id / score
    cur.execute("""
        SELECT
          name       AS student_name,
          student_id AS student_id,
          score      AS score
        FROM grades
        ORDER BY CAST(student_id AS INTEGER) ASC, student_id ASC
    """)
    rows = cur.fetchall()
    conn.close()
    return render_template("grades_form.html", teacher=session["teacher"], rows=rows)

@app.route("/grades/add", methods=["POST"])
def grades_add():
    name  = request.form.get("student_name","").strip()
    sid   = request.form.get("student_id","").strip()
    score = request.form.get("score","").strip()

    if not name or not sid or score == "":
        flash("請填寫完整資料")
        return redirect(url_for("grades_form"))
    try:
        score_val = float(score)
    except ValueError:
        flash("成績必須是數字")
        return redirect(url_for("grades_form"))

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("INSERT OR REPLACE INTO grades(name, student_id, score) VALUES (?,?,?)",
                    (name, sid, score_val))
        conn.commit()
        conn.close()
        flash("新增/更新成功")
    except sqlite3.Error as e:
        flash(f"寫入失敗：{e}")
    return redirect(url_for("grades_form"))

@app.route("/grades/delete", methods=["POST"])
def grades_delete():
    sid = request.form.get("delete_student_id","").strip()
    if not sid:
        flash("請輸入要刪除的學號")
        return redirect(url_for("grades_form"))
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("DELETE FROM grades WHERE student_id = ?", (sid,))
        conn.commit()
        conn.close()
        flash(f"刪除完成（學號 {sid} 若存在）")
    except sqlite3.Error as e:
        flash(f"刪除失敗：{e}")
    return redirect(url_for("grades_form"))

# ---------- AJAX 版頁面 ----------
@app.route("/grades/ajax")
def grades_ajax():
    if "teacher" not in session:
        return redirect(url_for("index"))
    return render_template("grades_ajax.html", teacher=session["teacher"])

# ---------- REST API（AJAX 版使用） ----------
@app.route("/api/grades", methods=["GET"])
def api_list():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT
          name       AS student_name,
          student_id AS student_id,
          score      AS score
        FROM grades
        ORDER BY CAST(student_id AS INTEGER) ASC, student_id ASC
    """)
    data = [dict(r) for r in cur.fetchall()]
    conn.close()
    return jsonify(data)

@app.route("/api/grades", methods=["POST"])
def api_add():
    data = request.get_json(force=True, silent=True) or {}
    name  = str(data.get("student_name","")).strip()
    sid   = str(data.get("student_id","")).strip()
    score = data.get("score","")
    if not name or not sid or score == "":
        return jsonify({"error":"缺少必要欄位"}), 400
    try:
        score_val = float(score)
    except (ValueError, TypeError):
        return jsonify({"error":"成績必須是數字"}), 400

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("INSERT OR REPLACE INTO grades(name, student_id, score) VALUES (?,?,?)",
                    (name, sid, score_val))
        conn.commit()
        conn.close()
        return jsonify({"ok": True})
    except sqlite3.Error as e:
        return jsonify({"error": f"寫入失敗：{e}"}), 500

@app.route("/api/grades/<sid>", methods=["DELETE"])
def api_del(sid):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("DELETE FROM grades WHERE student_id = ?", (sid,))
        conn.commit()
        conn.close()
        return jsonify({"ok": True})
    except sqlite3.Error as e:
        return jsonify({"error": f"刪除失敗：{e}"}), 500

if __name__ == "__main__":
    app.run(debug=True)
