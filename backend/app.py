import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask import session, jsonify
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
from werkzeug.middleware.proxy_fix import ProxyFix
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
from automation import run_auto_escalation_job
from utils import get_db_cursor
from werkzeug.security import check_password_hash
from admin import admin_bp
from employee import employee_bp  # 🚀 Import our new modular blueprint
from manager import manager_bp  # 🚀 Added the modular manager import
load_dotenv()

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "super-secret-hackathon-key")
# Enable CORS globally for all communication workflows
# 🚀 YEH RAHA DOMAIN SHARING KA MAGIC
app.config.update(
    SESSION_COOKIE_SECURE=True,     
    SESSION_COOKIE_SAMESITE='Lax',  # 'None' ki zaroorat nahi kyunki dono same domain par hain
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_DOMAIN='.printslelo.com'  # 👈 YEH MAGIC LINE DONO KO COOKIE SHARE KARNE DEGI
)

CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://atomberg.printslelo.com",  # 👈 NAYA SUBDOMAIN ALLOW KIYA
            "https://printslelo.com"
                             
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        "supports_credentials": True  
    }
})
# Initialize WebSocket for real-time state alerts
socketio = SocketIO(app, cors_allowed_origins="*")

# Register Blueprints pipeline to active routing channels
app.register_blueprint(employee_bp)
app.register_blueprint(manager_bp)
app.register_blueprint(admin_bp)
# ==========================================
# 🚀 CORE ROUTE 1: SINGLE HIT LOGIN ENGINE
# ==========================================
@app.route('/api/login', methods=['POST'])
def login_user():
    print("\n--------------------------------------------------")
    print("🔐 [LOGIN ATTEMPT DETECTED] Starting authentication pipeline...")
    print("--------------------------------------------------")
    try:
        data = request.json
        print(f"📥 [PAYLOAD RECEIVED]: {data}")
        
        email = data.get('email')
        password = data.get('password') 

        print(f"📧 [PARSED DATA] Email extracted: '{email}'")
        print(f"🔑 [PARSED DATA] Password length received: {len(str(password)) if password else 0} characters")

        if not email or not password:
            print("⚠️ [VALIDATION FAILED] Missing email or password keys in payload JSON.")
            return jsonify({"error": "Please provide both email and password keys."}), 400

        # 🔥 MODIFIED: Added e.password to extract the original string/hash from database
        query = """
            SELECT 
                e.id AS emp_id,
                e.name AS emp_name,
                e.email AS emp_email,
                e.role AS emp_role,
                e.password AS emp_password,
                m.name AS mgr_name,
                m.email AS mgr_email
            FROM users e
            LEFT JOIN users m ON e.manager_id = m.id
            WHERE e.email = %s;
        """
        
        print("🗄️ [DATABASE] Executing user lookup query against Supabase instance...")
        with get_db_cursor() as cur:
            cur.execute(query, (email,))
            user_record = cur.fetchone()

        print(f"🔍 [DATABASE RESPONSE] Record found profile state: {user_record}")

        if not user_record:
            print(f"❌ [AUTH FAILED] No account exists matching the email string: '{email}'")
            return jsonify({"error": "Invalid login credentials match sequence."}), 401

        # =============================================================
        # 🛡️ THE MISSING SECURITY BARRIER: CRITICAL PASSWORD CHECK!
        # =============================================================
        db_password = user_record.get('emp_password')
        print("🕵️ [SECURITY COMPARISON] Verifying password hash...")
        
        # Check if the DB password is a hash (starts with pbkdf2) or legacy plaintext
        if db_password and db_password.startswith('scrypt:') or db_password.startswith('pbkdf2:'):
            is_valid = check_password_hash(db_password, password)
        else:
            is_valid = (db_password == password) # Legacy fallback for old test accounts

        if not is_valid:
            print("❌ [AUTH FAILED] Password mismatch! Access explicitly Denied.")
            return jsonify({"error": "Invalid login credentials."}), 401
        session_payload = {
            "id": user_record["emp_id"],
            "name": user_record["emp_name"],
            "email": user_record["emp_email"],
            "role": user_record["emp_role"],
            "managerDetails": {
                "name": user_record["mgr_name"] if user_record["mgr_name"] else "N/A",
                "email": user_record["mgr_email"] if user_record["mgr_email"] else "N/A"
            } if user_record["emp_role"] == 'employee' else None
        }
        session['id'] = user_record["emp_id"]
        session['role'] = user_record["emp_role"]
        session['email'] = user_record["emp_email"]
        session['name'] = user_record["emp_name"]

        # Save manager details ONLY if they are an employee
        if user_record["emp_role"] == 'employee':
            session['mgr_name'] = user_record["mgr_name"] if user_record["mgr_name"] else "N/A"
            session['mgr_email'] = user_record["mgr_email"] if user_record["mgr_email"] else "N/A"
        print(f"🚀 [PIPELINE COMPLETE] Returning session state token to frontend: {session_payload}")
        return jsonify({
            "success": True, 
            "message": f"Welcome back, {user_record['emp_name']}!",
            "user": session_payload
        }), 200

    except Exception as e:
        print(f"💥 [CRASH EVENT] Login pipeline encountered an unhandled exception: {str(e)}")
        import traceback
        traceback.print_exc() # Terminal par poora error stack trace dikhayega
        return jsonify({"error": "Internal authentication server loop block error."}), 500

# --- WEBSOCKETS ---
@socketio.on('connect')
def handle_connect():
    print("A user connected via WebSocket!")
    emit('server_message', {'data': 'Connected to Atomberg Realtime Engine'})


scheduler = BackgroundScheduler()
# Yeh job har raat 12:00 AM baje automatic chalegi
scheduler.add_job(func=run_auto_escalation_job, trigger="cron", hour=0, minute=0)
scheduler.start()

# Jab Flask server band ho, toh scheduler ko safely band kar do
atexit.register(lambda: scheduler.shutdown())

if __name__ == '__main__':
    print("Starting Modular Flask server on port 5000...")
    socketio.run(app, debug=True, port=5000)