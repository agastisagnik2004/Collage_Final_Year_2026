import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


async def send_otp_email(to_email: str, otp: str) -> bool:
    email_user = os.getenv("EMAIL_USER", "")
    email_pass = os.getenv("EMAIL_PASS", "")

    if not email_user or not email_pass:
        return False

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body {{ font-family: 'Inter', Arial, sans-serif; background: #020817; margin: 0; padding: 0; }}
    .wrapper {{ max-width: 520px; margin: 40px auto; background: linear-gradient(160deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(148,163,184,0.18); border-radius: 16px; overflow: hidden; }}
    .header {{ background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%); padding: 28px 32px; text-align: center; }}
    .header h1 {{ color: white; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.02em; }}
    .body {{ padding: 32px; }}
    .otp-box {{ background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.4); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }}
    .otp {{ font-size: 42px; font-weight: 800; letter-spacing: 0.25em; color: #a5b4fc; font-family: 'Courier New', monospace; }}
    .label {{ font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin-bottom: 8px; }}
    p {{ color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 12px; }}
    .warning {{ color: #f87171; font-size: 12px; margin-top: 16px; }}
    .footer {{ padding: 16px 32px; border-top: 1px solid rgba(148,163,184,0.1); text-align: center; font-size: 11px; color: #475569; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🎓 Classroom Monitor — Admin Access</h1>
    </div>
    <div class="body">
      <p>You requested admin access to the Classroom Monitor system. Use the OTP below to complete your login.</p>
      <div class="otp-box">
        <div class="label">Your One-Time Password</div>
        <div class="otp">{otp}</div>
      </div>
      <p>This code is valid for <strong style="color:#a5b4fc">5 minutes</strong> and can only be used once.</p>
      <p class="warning">⚠️ If you did not request this, please ignore this email. Your account is secure.</p>
    </div>
    <div class="footer">Classroom Monitor &bull; Admin Security System</div>
  </div>
</body>
</html>
"""

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your Admin OTP — Classroom Monitor"
        msg["From"] = email_user
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(email_user, email_pass)
            server.sendmail(email_user, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False
