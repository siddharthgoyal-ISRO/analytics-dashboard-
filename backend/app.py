from flask import Flask, jsonify, request, send_from_directory
import sqlite3
import re
import os

BASE_DIR = os.path.dirname(__file__)
FRONTEND_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "frontend "))

app = Flask(__name__)

# Local sqlite DB path (created by backend/db_script.py)
DATABASE = os.path.join(BASE_DIR, "cop_endpoints_db")


def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


@app.route("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route('/css/<path:filename>')
def css_file(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'css'), filename)


@app.route('/js/<path:filename>')
def js_file(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), filename)


@app.route("/metrics")
def metrics():
    return "OK", 200
    
@app.route("/api/session", methods=["GET"])
def search_session():

    session_input = request.args.get("session_id", "").strip()

    if session_input == "":
        return jsonify({"error": "Session ID is required"}), 400

    # Auto add ssid_ prefix if not present
    if not session_input.lower().startswith("ssid_"):
        session_input = f"ssid_{session_input}"

    # Safe page parsing
    try:
        page = int(request.args.get("page", 1))
        if page < 1:
            page = 1
    except (ValueError, TypeError):
        page = 1

    per_page = 10
    offset = (page - 1) * per_page

    conn = get_db_connection()
    cursor = conn.cursor()

    # Fetch all joined session + observation rows
    cursor.execute("""
        SELECT o.*, s.SESS_ID
        FROM observation o
        JOIN session_observation s
        ON o.REFOBS_ID = s.REFOBS_ID
    """)

    rows = cursor.fetchall()
    conn.close()

    # Convert wildcard to regex
    # *  → any sequence
    # ?  → single character
    regex_pattern = session_input.replace("*", ".*").replace("?", ".")

    try:
        full_regex = re.compile(f"^{regex_pattern}", re.IGNORECASE)
    except re.error:
        return jsonify({"error": "Invalid session regex pattern"}), 400

    # Apply regex filtering
    matched_rows = [
        dict(row)
        for row in rows
        if full_regex.search(row["SESS_ID"])
    ]

    total = len(matched_rows)

    # Pagination
    paginated = matched_rows[offset:offset + per_page]

    return jsonify({
        "data": paginated,
        "total": total,
        "page": page,
        "per_page": per_page
    })


@app.route("/api/observation", methods=["GET"])
def search_observations():

    pattern = request.args.get("pattern")
    config = request.args.get("config")
    start = request.args.get("start")
    end = request.args.get("end")

    # Safe page parsing
    try:
        page = int(request.args.get("page", 1))
        if page < 1:
            page = 1
    except (ValueError, TypeError):
        page = 1

    per_page = 10
    offset = (page - 1) * per_page

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM observation")
    rows = cursor.fetchall()
    conn.close()

    rows = [dict(row) for row in rows]

    # ----------------------------
    # FILTER 1 → Observation ID (regex supported)
    # ----------------------------
    if pattern:
        regex_pattern = pattern.replace("*", ".*").replace("?", ".")
        try:
            full_regex = re.compile(f"^oid_{regex_pattern}", re.IGNORECASE)
        except re.error:
            return jsonify({"error": "Invalid observation regex"}), 400

        rows = [
            row for row in rows
            if full_regex.search(row["REFOBS_ID"])
        ]

    # ----------------------------
    # FILTER 2 → Config ID
    # ----------------------------
    if config:
        rows = [
            row for row in rows
            if str(row.get("SSAR_CONFIG_ID", "")) == str(config)
        ]

    # ----------------------------
    # FILTER 3 → CMD Start Time (partial match allowed)
    # ----------------------------
    if start:
        rows = [
            row for row in rows
            if start in str(row.get("CMD_SSAR_START_DATETIME", ""))
        ]

    # ----------------------------
    # FILTER 4 → CMD End Time (partial match allowed)
    # ----------------------------
    if end:
        rows = [
            row for row in rows
            if end in str(row.get("CMD_SSAR_END_DATETIME", ""))
        ]

    total = len(rows)
    paginated = rows[offset:offset + per_page]

    return jsonify({
        "data": paginated,
        "total": total,
        "page": page,
        "per_page": per_page
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, debug=True)