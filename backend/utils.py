import os
import smtplib
import psycopg2
from contextlib import contextmanager
from psycopg2.extras import RealDictCursor
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import requests
import json
# Load environment variables once in the utility layer
load_dotenv()
DB_PASSWORD = os.environ.get("DB_PASSWORD")

# --- 🔥 SAFE CONTEXT MANAGER UTILITY 🔥 ---
@contextmanager
def get_db_cursor():
    conn = psycopg2.connect(
        host="aws-1-ap-northeast-2.pooler.supabase.com",
        port="6543",
        database="postgres",
        user="postgres.asfpdhgqrfomnznswdfz",
        password=DB_PASSWORD
    )
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        yield cur
        conn.commit()  # Commits transactions automatically if queries succeed
    except Exception as e:
        conn.rollback()  # Rolls back edits if an error pops up mid-flight
        raise e
    finally:
        cur.close()
        conn.close()  # Safely closes local connection after every query


# ==========================================
# 📧 BACKGROUND EMAIL ENGINE (NON-BLOCKING)
# ==========================================
def send_submission_emails(emp_name, emp_email, mgr_email, quarter, goals_list):
    sender_email = os.environ.get("MAIL_USERNAME")
    sender_password = os.environ.get("MAIL_PASSWORD")
    
    if not sender_email or not sender_password:
        print("⚠️ Email credentials missing in .env! Skipping emails.")
        return

    try:
        # 1. Format the goals into a neat HTML list
        goals_html = "".join([
            f"<li style='margin-bottom: 8px;'>"
            f"<b>{g.get('title')}</b> <br>"
            f"<span style='color: #6B7280; font-size: 0.9em;'>Area: {g.get('thrustArea')} | Target: {g.get('target')} {g.get('uom')} | Weight: {g.get('weight')}%</span>"
            f"</li>" 
            for g in goals_list
        ])

        # 2. Setup Server
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)

        # 3. MANAGER EMAIL
        if mgr_email and mgr_email != 'N/A':
            mgr_msg = MIMEMultipart()
            mgr_msg['From'] = f"Atomberg Portal <{sender_email}>"
            mgr_msg['To'] = mgr_email
            mgr_msg['Subject'] = f"Action Required: Objective Verification for {emp_name} ({quarter})"
            mgr_body = f"""
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h3 style="color: #92400E;">Pending Goal Verification</h3>
                <p>Hi Manager,</p>
                <p>The employee <b>{emp_name}</b> has just submitted their objectives for <b>{quarter}</b>.</p>
                <p>Please log in to the Performance Portal to verify, suggest edits, or lock these goals.</p>
                <div style="background: #F9FAFB; padding: 15px; border-radius: 8px; border: 1px solid #E5E7EB;">
                    <ul style="margin: 0; padding-left: 20px;">{goals_html}</ul>
                </div>
                <br>
                <p>Best Regards,<br>Atomberg HR System</p>
            </div>
            """
            mgr_msg.attach(MIMEText(mgr_body, 'html'))
            server.send_message(mgr_msg)

        # 4. EMPLOYEE EMAIL
        emp_msg = MIMEMultipart()
        emp_msg['From'] = f"Atomberg Portal <{sender_email}>"
        emp_msg['To'] = emp_email
        emp_msg['Subject'] = f"Success: Your {quarter} Objectives are Submitted"
        emp_body = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h3 style="color: #065F46;">Goals Submitted Successfully</h3>
            <p>Hi {emp_name},</p>
            <p>You have successfully submitted your objectives for <b>{quarter}</b>. Your manager has been notified to review them.</p>
            <p>Below is the summary of what you submitted:</p>
            <div style="background: #F9FAFB; padding: 15px; border-radius: 8px; border: 1px solid #E5E7EB;">
                <ul style="margin: 0; padding-left: 20px;">{goals_html}</ul>
            </div>
            <p>You can check the portal for any feedback or revision requests.</p>
            <br>
            <p>Best Regards,<br>Atomberg HR System</p>
        </div>
        """
        emp_msg.attach(MIMEText(emp_body, 'html'))
        server.send_message(emp_msg)

        server.quit()
        print(f"✅ Submission emails sent successfully for {emp_name}!")
        
    except Exception as e:
        print("❌ Error sending emails in background thread:", e)

def send_teams_alert(title, message):
    # ⚠️ AHIYA TARO TEAMS WEBHOOK URL NAKH:
    webhook_url = "https://webhook.site/7f59e59e-bce0-4756-bb9a-84acf85ec1bd"
    
    if webhook_url =="https://webhook.site/7f59e59e-bce0-4756-bb9a-84acf85ec1bd":
        print("⚠️ Teams Webhook URL is missing! Add it in utils.py")
        return

    headers = {
        "Content-Type": "application/json"
    }
    
    # MS Teams "MessageCard" Design Format (Atomberg Yellow theme)
    payload = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "FCD34D", 
        "summary": title,
        "sections": [{
            "activityTitle": f"🔔 **{title}**",
            "activitySubtitle": "Atomberg Performance Portal",
            "text": message,
            "markdown": True
        }]
    }
    
    try:
        response = requests.post(webhook_url, headers=headers, data=json.dumps(payload))
        if response.status_code == 200:
            print("✅ MS Teams alert sent successfully!")
        else:
            print(f"❌ Failed to send Teams alert. Status: {response.status_code}")
    except Exception as e:
        print(f"💥 Error sending Teams alert: {e}")