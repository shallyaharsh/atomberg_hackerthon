import threading
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Blueprint, jsonify, request, session
from utils import get_db_cursor
from auth import manager_required

manager_bp = Blueprint('manager_bp', __name__)

# --- 📧 BACKGROUND EMAIL ENGINE ---
def send_review_emails(emp_name, emp_email, quarter, action_summary):
    sender_email = os.environ.get("MAIL_USERNAME")
    sender_password = os.environ.get("MAIL_PASSWORD")
    
    if not sender_email or not sender_password:
        print("⚠️ Email credentials missing in .env! Skipping emails.")
        return

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)

        msg = MIMEMultipart()
        msg['From'] = f"Atomberg Portal <{sender_email}>"
        msg['To'] = emp_email
        msg['Subject'] = f"Update: Your {quarter} Objectives Review Status"

        # 🟢 EXACT TEXT FOR APPROVED
        approved_html = "".join([
            f"<li style='margin-bottom:8px;'><b>{item}</b><br><span style='color:#166534;'>Your objective has been approved.</span></li>" 
            for item in action_summary.get('approved', [])
        ])

        # 🔴 EXACT TEXT FOR REVISION
        revision_html = "".join([
            f"<li style='margin-bottom:8px;'><b>{item['title']}</b><br><span style='color:#DC2626;'>Your manager has reviewed your objective and left comments for the changes:</span><br><i>\"{item['note']}\"</i></li>" 
            for item in action_summary.get('revision', [])
        ])

        approved_section = f"<div style='background:#F0FDF4; border:1px solid #BBF7D0; padding:15px; border-radius:8px; margin-bottom:15px;'><h4 style='color:#166534; margin:0 0 10px 0;'>✅ Approved Objectives</h4><ul style='margin:0; padding-left:20px;'>{approved_html}</ul></div>" if action_summary.get('approved') else ""
        revision_section = f"<div style='background:#FFFBEB; border:1px solid #FDE68A; padding:15px; border-radius:8px; margin-bottom:15px;'><h4 style='color:#92400E; margin:0 0 10px 0;'>🔄 Revisions Requested</h4><ul style='margin:0; padding-left:20px;'>{revision_html}</ul></div>" if action_summary.get('revision') else ""

        body = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #334155;">
            <h3 style="color: #1E293B;">Hello {emp_name},</h3>
            <p>Your manager has processed your objectives for <b>{quarter}</b>.</p>
            {approved_section}
            {revision_section}
            <p>Please log back into the Performance Portal to check details.</p>
            <p>Best Regards,<br>Atomberg HR Team</p>
        </div>
        """
        msg.attach(MIMEText(body, 'html'))
        server.send_message(msg)
        server.quit()
        print(f"✅ Review emails sent to {emp_email}")
    except Exception as e:
        print("❌ Error sending review emails:", e)


# --- 📧 BACKGROUND BROADCAST EMAIL ENGINE ---
def send_broadcast_emails(emp_emails, quarter, goal):
    sender_email = os.environ.get("MAIL_USERNAME")
    sender_password = os.environ.get("MAIL_PASSWORD")
    
    if not sender_email or not sender_password:
        print("⚠️ Email credentials missing in .env! Skipping broadcast emails.")
        return

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)

        for emp_email in emp_emails:
            msg = MIMEMultipart()
            msg['From'] = f"Atomberg Portal <{sender_email}>"
            msg['To'] = emp_email
            msg['Subject'] = f"🚨 Action Required: New Team Objective for {quarter}"

            # Ensure uom is handled properly if it's Zero-based or %
            display_target = f"{goal.get('target')}%" if goal.get('uom') == '%' else goal.get('target')
            if goal.get('uom') == 'Zero-based': display_target = "0"

            body = f"""
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #334155;">
                <h3 style="color: #1E293B;">Hello,</h3>
                <p>Your manager has broadcasted a mandatory shared objective for <b>{quarter}</b>.</p>
                <div style='background:#FEFCE8; border:1px solid #FDE047; padding:15px; border-radius:8px; margin-bottom:15px;'>
                    <h4 style='color:#854D0E; margin:0 0 10px 0;'>📌 {goal.get('title')}</h4>
                    <ul style='margin:0; color:#422006; padding-left: 20px;'>
                        <li style='margin-bottom: 5px;'><b>Thrust Area:</b> {goal.get('thrustArea')}</li>
                        <li><b>Target:</b> {display_target}</li>
                    </ul>
                </div>
                <p style="color: #DC2626;"><b>Important:</b> Your {quarter} goal sheet has been temporarily unlocked. Please log in immediately, assign a weightage (min 10%) to this new objective, re-balance your total weight to exactly 100%, and re-submit your sheet.</p>
                <p>Best Regards,<br>Atomberg HR Team</p>
            </div>
            """
            msg.attach(MIMEText(body, 'html'))
            server.send_message(msg)
            # Recreate for next iteration to avoid overlapping headers
            del msg
            
        server.quit()
        print(f"✅ Broadcast emails sent successfully to {len(emp_emails)} employees.")
    except Exception as e:
        print("❌ Error sending broadcast emails:", e)

# ========================================================
# 📊 DASHBOARD SUMMARY ROUTE
# ========================================================
@manager_bp.route('/api/manager/dashboard-summary', methods=['GET'])
@manager_required # 🚀 ADDED SECURITY
def get_manager_dashboard_summary():
    try:
        manager_id = session.get('id') # 🚀 SECURITY FIX: Direct from session

        with get_db_cursor() as cur:
            roster_query = "SELECT id, name, email, role FROM users WHERE manager_id = %s ORDER BY name ASC;"
            cur.execute(roster_query, (manager_id,))
            team_roster = cur.fetchall()

            if not team_roster:
                return jsonify({"success": True, "team_members": [], "team_kpis": []}), 200

            kpi_query = """
                SELECT id, user_id, quarter, thrust_area, title, uom, target, weightage, 
                       manager_locked, admin_locked, actual_performance, performance_status, 
                       manager_note, manager_assessment
                FROM kpis 
                WHERE user_id IN (SELECT id FROM users WHERE manager_id = %s)
                ORDER BY user_id ASC, quarter ASC, id ASC;
            """
            cur.execute(kpi_query, (manager_id,))
            team_kpis = cur.fetchall()

        return jsonify({
            "success": True,
            "team_members": team_roster,
            "team_kpis": team_kpis
        }), 200
    except Exception as e:
        print("Error in dashboard summary:", e)
        return jsonify({"error": "Database read failure."}), 500

# --- 📧 BACKGROUND FINAL EVALUATION EMAIL ENGINE ---
def send_evaluation_emails(emp_name, emp_email, quarter, evaluations, kpi_titles):
    sender_email = os.environ.get("MAIL_USERNAME")
    sender_password = os.environ.get("MAIL_PASSWORD")
    
    if not sender_email or not sender_password:
        print("⚠️ Email credentials missing. Skipping evaluation emails.")
        return

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)

        msg = MIMEMultipart()
        msg['From'] = f"Atomberg Portal <{sender_email}>"
        msg['To'] = emp_email
        msg['Subject'] = f"Update: Your {quarter} Final Performance Evaluated"

        # Match KPI IDs with their Real Titles for the Email
        eval_html = "".join([
            f"<li style='margin-bottom:12px;'><b>{kpi_titles.get(str(k), 'Objective')}</b><br><span style='color:#1E40AF;'>Manager's Final Assessment:</span><br><i style='color:#4B5563;'>\"{v}\"</i></li>" 
            for k, v in evaluations.items() if v.strip()
        ])

        body = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #334155; line-height: 1.5;">
            <h3 style="color: #1E293B;">Hello {emp_name},</h3>
            <p>Your manager has completed the final performance evaluation for your <b>{quarter}</b> objectives.</p>
            <div style='background:#EFF6FF; border:1px solid #BFDBFE; padding:15px; border-radius:8px; margin-bottom:15px;'>
                <h4 style='color:#1E3A8A; margin:0 0 10px 0;'>📊 Final Assessment Remarks</h4>
                <ul style='margin:0; padding-left:20px;'>{eval_html}</ul>
            </div>
            <p>Please log back into the Performance Portal to review your overall achievement track record.</p>
            <p>Best Regards,<br>Atomberg HR Team</p>
        </div>
        """
        msg.attach(MIMEText(body, 'html'))
        server.send_message(msg)
        server.quit()
        print(f"✅ Final Evaluation email dispatched successfully to {emp_email}")
    except Exception as e:
        print("❌ Error sending evaluation emails:", e)

# ========================================================
# 🚀 ROUTE 3: TEAM PROGRESS FINAL EVALUATION ENGINE
# ========================================================
@manager_bp.route('/api/manager/evaluate-progress', methods=['POST'])
@manager_required # 🚀 ADDED SECURITY
def evaluate_progress():
    try:
        data = request.json
        manager_id = session.get('id') # 🚀 SECURITY FIX: Direct from session
        employee_id = data.get('employee_id')
        quarter = data.get('quarter')
        evaluations = data.get('evaluations', {}) 

        if not employee_id or not quarter:
            return jsonify({"error": "Missing execution context."}), 400

        with get_db_cursor() as cur:
            # Batch update all the final remarks
            for kpi_id_str, assessment in evaluations.items():
                if assessment and str(assessment).strip() != '':
                    cur.execute("""
                        UPDATE kpis 
                        SET manager_assessment = %s 
                        WHERE id = %s AND user_id = %s AND quarter = %s;
                    """, (str(assessment).strip(), int(kpi_id_str), employee_id, quarter))
            
            # Fetch Employee Details and KPI Titles for the Email
            cur.execute("SELECT name, email FROM users WHERE id = %s", (employee_id,))
            emp_info = cur.fetchone()
            
            kpi_ids = list(evaluations.keys())
            kpi_titles = {}
            if kpi_ids:
                cur.execute("SELECT id, title FROM kpis WHERE id IN %s", (tuple(kpi_ids),))
                kpi_titles = {str(row['id']): row['title'] for row in cur.fetchall()}

        # Fire Email Thread
        if emp_info:
            threading.Thread(
                target=send_evaluation_emails,
                args=(emp_info['name'], emp_info['email'], quarter, evaluations, kpi_titles)
            ).start()

        return jsonify({"success": True, "message": "Employee achievements officially evaluated and signed off!"}), 200

    except Exception as e:
        print("Error in evaluation pipeline:", e)
        return jsonify({"error": "Failed to save performance evaluation."}), 500


# ========================================================
# 🚀 ROUTE: REVIEW EMPLOYEE GOALS
# ========================================================
@manager_bp.route('/api/manager/review-goals', methods=['POST'])
@manager_required # 🚀 ADDED SECURITY
def review_employee_goals():
    try:
        data = request.json
        manager_id = session.get('id') # 🚀 SECURITY FIX: Direct from session
        employee_id = data.get('employee_id')
        quarter = data.get('quarter')
        updates = data.get('updates', []) 

        if not employee_id or not quarter or not updates:
            return jsonify({"error": "Missing payload context (employee_id, quarter, updates)."}), 400

        action_summary = {'approved': [], 'revision': []}

        with get_db_cursor() as cur:
            # HR Admin Lock Check
            cur.execute("SELECT admin_locked FROM kpis WHERE user_id = %s AND quarter = %s LIMIT 1", (employee_id, quarter))
            lock_check = cur.fetchone()
            if lock_check and lock_check['admin_locked']:
                return jsonify({"error": "Cycle Frozen: HR Admin has locked this cycle globally."}), 403

            for row in updates:
                kpi_id = row.get('id')
                action = row.get('action') 
                note = row.get('note', '').strip()

                if action == 'approve':
                    cur.execute("""
                        WITH updated_kpi AS (
                            UPDATE kpis SET manager_locked = true, admin_locked = true, manager_note = NULL
                            WHERE id = %s AND user_id = %s AND quarter = %s
                            RETURNING id, title
                        ),
                        audit_insert AS (
                            INSERT INTO audit_logs (kpi_id, action_type, details)
                            SELECT id, 'MANAGER_APPROVED', 'Manager approved and completely locked the objective for Phase 1.' FROM updated_kpi
                        )
                        SELECT title FROM updated_kpi;
                    """, (kpi_id, employee_id, quarter))
                    result = cur.fetchone()
                    if result:
                        action_summary['approved'].append(result['title'])
                    else:
                        action_summary['approved'].append("Objective")

                elif action == 'revision':
                    rev_note = note if note else 'Please revise.'
                    log_detail = f"Manager requested revision with feedback: '{rev_note}'"
                    cur.execute("""
                        WITH updated_kpi AS (
                            UPDATE kpis SET manager_locked = false, manager_note = %s 
                            WHERE id = %s AND user_id = %s AND quarter = %s
                            RETURNING id, title
                        ),
                        audit_insert AS (
                            INSERT INTO audit_logs (kpi_id, action_type, details)
                            SELECT id, 'REVISION_REQUESTED', %s FROM updated_kpi
                        )
                        SELECT title FROM updated_kpi;
                    """, (rev_note, kpi_id, employee_id, quarter, log_detail))
                    result = cur.fetchone()
                    if result:
                        action_summary['revision'].append({'title': result['title'], 'note': rev_note})
                    else:
                        action_summary['revision'].append({'title': "Objective", 'note': rev_note})
            # Fetch Employee info for email
            cur.execute("SELECT name, email FROM users WHERE id = %s", (employee_id,))
            emp_info = cur.fetchone()

        # Fire email thread safely
        if emp_info:
            threading.Thread(
                target=send_review_emails, 
                args=(emp_info['name'], emp_info['email'], quarter, action_summary)
            ).start()

        return jsonify({"success": True, "message": "Goals processed successfully!"}), 200

    except Exception as e:
        print("Error in manager action pipeline:", e)
        return jsonify({"error": "Database write failure."}), 500


# ==========================================
# 📢 CORE ROUTE: BROADCAST SHARED GROUP OBJECTIVE
# ==========================================
@manager_bp.route('/api/manager/broadcast-goal', methods=['POST'])
@manager_required # 🚀 ADDED SECURITY
def broadcast_goal():
    try:
        data = request.json
        manager_id = session.get('id') # 🚀 SECURITY FIX: Direct from session
        quarter = data.get('quarter')
        goal = data.get('goal')
        
        if not quarter or not goal:
            return jsonify({"error": "Missing payload."}), 400
            
        with get_db_cursor() as cur:
            # 🛡️ SECURITY CHECK 1: Ensure HR Admin hasn't frozen anyone in this team!
            cur.execute("""
                SELECT u.name 
                FROM users u
                JOIN kpis k ON u.id = k.user_id
                WHERE u.manager_id = %s AND k.quarter = %s AND k.admin_locked = true
                LIMIT 1;
            """, (manager_id, quarter))
            
            if cur.fetchone():
                return jsonify({"error": "Broadcast Blocked: HR Admin has locked this quarter. You cannot force changes now."}), 403

            # 🚀 OPTIMIZATION 1: MASS UNLOCK
            cur.execute("""
                UPDATE kpis SET manager_locked = false 
                WHERE quarter = %s AND user_id IN (SELECT id FROM users WHERE manager_id = %s)
            """, (quarter, manager_id))

            # 🚀 OPTIMIZATION 2: MASS INSERT
            manager_note = "⭐ SHARED TEAM OBJECTIVE: The Target is fixed by your Manager. Please assign a weightage (min 10%) based on your bandwidth and balance your sheet to exactly 100%."
            
            cur.execute("""
                INSERT INTO kpis (user_id, quarter, thrust_area, title, uom, target, weightage, manager_locked, manager_note, is_shared)
                SELECT id, %s, %s, %s, %s, %s, 0, false, %s, true 
                FROM users WHERE manager_id = %s
            """, (
                quarter, goal['thrustArea'], goal['title'], 
                goal['uom'], str(goal['target']), manager_note, manager_id
            ))

            # Fetch team members' emails for the notification thread
            cur.execute("SELECT email FROM users WHERE manager_id = %s", (manager_id,))
            employees = cur.fetchall()
            
            if not employees:
                return jsonify({"error": "No team members found to broadcast to."}), 404
                
            emp_emails = [emp['email'] for emp in employees]

        # 📧 FIRE BACKGROUND EMAIL THREAD
        threading.Thread(target=send_broadcast_emails, args=(emp_emails, quarter, goal)).start()
                
        return jsonify({"success": True, "message": f"Goal successfully broadcasted to {len(employees)} team members! Emails dispatched."}), 200

    except Exception as e:
        print("Crash in broadcast API:", e)
        return jsonify({"error": "Failed to broadcast objective."}), 500