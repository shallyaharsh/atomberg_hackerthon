import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from utils import get_db_cursor
import threading

# 📧 EMAIL ENGINE FOR AUTO-ESCALATION
def send_auto_lock_emails(emp_email, emp_name, mgr_email, mgr_name, quarter, goals):
    sender_email = os.environ.get("MAIL_USERNAME")
    sender_password = os.environ.get("MAIL_PASSWORD")
    
    if not sender_email or not sender_password:
        print("⚠️ Email credentials missing. Skipping auto-lock emails.")
        return

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)

        goals_html = "".join([f"<li style='margin-bottom:5px; color:#374151;'><b>{g}</b></li>" for g in goals])

        # 1. EMAIL TO MANAGER (Warning/Info)
        msg_mgr = MIMEMultipart()
        msg_mgr['From'] = f"Atomberg System <{sender_email}>"
        msg_mgr['To'] = mgr_email
        msg_mgr['Subject'] = f"⚠️ SYSTEM ACTION: Auto-Approval of {quarter} Objectives"
        
        body_mgr = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #E5E7EB; border-radius: 8px;">
            <h3 style="color: #991B1B;">Automatic System Override</h3>
            <p>Dear {mgr_name},</p>
            <p>As per the 7-day SLA policy, objectives submitted by your team member <b>{emp_name}</b> have remained unreviewed for over 7 days.</p>
            <p>To prevent workflow delays, the system has <b>automatically approved and locked</b> the following objectives:</p>
            <ul>{goals_html}</ul>
            <p style="color: #4B5563; font-size: 0.85rem;"><i>Action taken automatically by the Atomberg Cron Scheduler.</i></p>
        </div>
        """
        msg_mgr.attach(MIMEText(body_mgr, 'html'))
        server.send_message(msg_mgr)

        # 2. EMAIL TO EMPLOYEE (Info)
        msg_emp = MIMEMultipart()
        msg_emp['From'] = f"Atomberg System <{sender_email}>"
        msg_emp['To'] = emp_email
        msg_emp['Subject'] = f"✅ Update: Your {quarter} Objectives are Auto-Approved"
        
        body_emp = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #E5E7EB; border-radius: 8px;">
            <h3 style="color: #065F46;">Goals Verified Automatically</h3>
            <p>Dear {emp_name},</p>
            <p>Your pending objectives for <b>{quarter}</b> have crossed the 7-day manager review window.</p>
            <p>The system has automatically approved and locked them for you. You can now start tracking your achievements.</p>
            <ul>{goals_html}</ul>
        </div>
        """
        msg_emp.attach(MIMEText(body_emp, 'html'))
        server.send_message(msg_emp)

        server.quit()
        print(f"✅ Auto-lock emails successfully dispatched to {mgr_email} & {emp_email}")
    except Exception as e:
        print("❌ Failed to send auto-lock emails:", e)

# ⚙️ THE CRON JOB ENGINE
def run_auto_escalation_job():
    print("\n⏳ [CRON] Triggering SLA Auto-Escalation Engine...")
    try:
        with get_db_cursor() as cur:
            # 🚀 THE GENIUS QUERY: Group by audit log timestamps!
            cur.execute("""
                SELECT k.id, k.title, k.quarter, e.name as emp_name, e.email as emp_email, m.name as mgr_name, m.email as mgr_email
                FROM kpis k
                JOIN users e ON k.user_id = e.id
                JOIN users m ON e.manager_id = m.id
                WHERE k.manager_locked = false 
                  AND k.admin_locked = false
                  AND k.id IN (
                      SELECT kpi_id FROM audit_logs 
                      GROUP BY kpi_id 
                      HAVING MAX(timestamp) < NOW() - INTERVAL '7 days'
                  )
            """)
            stale_kpis = cur.fetchall()
            
            if not stale_kpis:
                print("✅ [CRON] No stale pending goals found. Everything is within SLA.")
                return
            
            # Group goals by employee so we send only 1 combined email per person
            grouped_data = {}
            kpi_ids_to_lock = []
            
            for row in stale_kpis:
                kpi_ids_to_lock.append(row['id'])
                key = (row['emp_email'], row['emp_name'], row['mgr_email'], row['mgr_name'], row['quarter'])
                if key not in grouped_data:
                    grouped_data[key] = []
                grouped_data[key].append(row['title'])
            
            # 💾 1-HIT BATCH UPDATE + AUDIT LOGGING
            if kpi_ids_to_lock:
                cur.execute("""
                    WITH auto_locked AS (
                        UPDATE kpis 
                        SET manager_locked = true, 
                            admin_locked = true, 
                            manager_note = 'SYSTEM AUTO-LOCKED: SLA breached (Manager inactivity > 7 days).'
                        WHERE id IN %s
                        RETURNING id
                    )
                    INSERT INTO audit_logs (kpi_id, action_type, details)
                    SELECT id, 'SYSTEM_AUTO_APPROVE', 'System auto-locked goal due to 7 days of inactivity.'
                    FROM auto_locked;
                """, (tuple(kpi_ids_to_lock),))

            # 📧 Fire Emails via Background Threads
            for (emp_email, emp_name, mgr_email, mgr_name, quarter), titles in grouped_data.items():
                threading.Thread(
                    target=send_auto_lock_emails, 
                    args=(emp_email, emp_name, mgr_email, mgr_name, quarter, titles)
                ).start()
                
            print(f"🚀 [CRON] Successfully auto-locked {len(kpi_ids_to_lock)} goals!")

    except Exception as e:
        print("💥 [CRON ERROR] Engine crashed:", e)