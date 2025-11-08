import traceback
import os
import subprocess
import random
import string
import time
import json
from email.mime.text import MIMEText
import smtplib
import requests

LOG_FILE_PATH = "/var/log/email_records.json"
BASE_EMAIL = "base@localhost"
SMTP_HOST = "localhost"
SMTP_PORT = 25
USER_COUNT = 50
FLASK_API = "http://43.230.201.125:60025"
LOCAL_SPANISH_QUOTES = [
    "La vida es un sueño, y los sueños, sueños son. — Calderón de la Barca",
    "El secreto de la felicidad no está en hacer siempre lo que se quiere, sino en querer siempre lo que se hace. — Tolstoi",
    "La imaginación lo es todo. Es la vista previa de las próximas atracciones de la vida. — Albert Einstein",
    "Cree en ti y todo será posible. — Anónimo",
    "La paciencia es un árbol de raíz amarga pero de frutos muy dulces. — Proverbio persa",
    "No hay camino para la paz, la paz es el camino. — Mahatma Gandhi",
    "El sabio puede cambiar de opinión. El necio, nunca. — Kant"
]
def get_templates():
    try:
        response = requests.get(f"{FLASK_API}/mails")
        response.raise_for_status()
        templates = response.json()
        print(f"✅ Retrieved {len(templates)} templates from backend.")
        return templates
    except Exception as e:
        print(f"❌ Failed to fetch templates: {e}")
        return []

def fetch_spanish_quote():
    """Try to fetch a Spanish quote from the web, fallback to local list if it fails."""
    try:
        res = requests.get("https://zenquotes.io/api/random", timeout=5)
        if res.status_code == 200:
            data = res.json()
            quote = data[0]['q']
            author = data[0]['a']
            return f"{quote} — {author}"
    except Exception:
        pass
    # fallback: random local quote
    return random.choice(LOCAL_SPANISH_QUOTES)

def generate_message_body(recipient):
    """Create a meaningful Spanish message body."""
    intro = f"Hola {recipient},\n\n"
    quote = fetch_spanish_quote()
    random_data = random_string(16)
    outro = f"\n\nEste es un mensaje automático de prueba.\nIdentificador: {random_data}\n¡Ten un buen día!"
    return intro + quote + outro
def ensure_users():
    """Create users user1 to user50 inside the container if they don't exist."""
    for i in range(1, USER_COUNT + 1):
        username = f"user{i}"
        try:
            subprocess.run(['id', username], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except subprocess.CalledProcessError:
            subprocess.run(['useradd', '-m', username], check=True)
            maildir = f"/home/{username}/Maildir"
            for d in ['cur', 'new', 'tmp']:
                os.makedirs(os.path.join(maildir, d), exist_ok=True)
            print(f"Created user {username}")

def random_string(n=32):
    """Generate a random string for email body."""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=n))

def load_email_logs():
    """Load existing email logs from file or return empty list."""
    if os.path.exists(LOG_FILE_PATH):
        try:
            with open(LOG_FILE_PATH, 'r') as f:
                return json.load(f)
        except Exception:
            traceback.print_exc()
            return []
    return []

def save_email_logs(logs):
    """Save email logs to file."""
    with open(LOG_FILE_PATH, 'w') as f:
        json.dump(logs, f)

# def send_emails():
#     logs = load_email_logs()
#     smtp = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
#     sent_count, failed_count = 0, 0

#     for i in range(1, USER_COUNT + 1):
#         recipient = f"user{i}@localhost"
#         subject = f"Automated Test {random.randint(1000, 9999)}"
#         body_content = generate_message_body(recipient)

#         msg = MIMEText(body_content)
#         msg['Subject'] = subject
#         msg['From'] = BASE_EMAIL
#         msg['To'] = recipient

#         record = {
#             "to": recipient,
#             "subject": subject,
#             "body_snippet": body_content[:100],
#             "timestamp": time.time(),
#             "status": "pending"
#         }

#         try:
#             smtp.sendmail(BASE_EMAIL, [recipient], msg.as_string())
#             record['status'] = "success"
#             sent_count += 1
#             print(f"Sent email to {recipient}")
#         except Exception as e:
#             record['status'] = f"failure: {str(e)}"
#             failed_count += 1
#             print(f"Failed to send email to {recipient}: {e}")

#         logs.append(record)
#         # Save logs after each email to persist incrementally
#         save_email_logs(logs)

#     smtp.quit()

#     print(f"\nEmail sending completed: {sent_count} succeeded, {failed_count} failed.")
#     print(f"Logs saved to {LOG_FILE_PATH}")
def distribute_users_among_templates(users, templates):
    """Distribute users roughly equally among available templates."""
    random.shuffle(users)
    group_size = len(users) // len(templates)
    groups = []
    start = 0
    for tpl in templates:
        end = start + group_size
        groups.append({
            "template": tpl,
            "recipients": users[start:end]
        })
        start = end
    # distribute any leftovers
    if start < len(users):
        groups[-1]["recipients"].extend(users[start:])
    return groups


def send_emails():
    logs = load_email_logs()
    smtp = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    sent_count, failed_count = 0, 0

    # 1️⃣ Fetch templates from Flask backend
    templates = get_templates()
    if not templates:
        print("⚠️ No templates found. Using fallback messages with quotes.")
        templates = [{"name": "Default", "html": None}]

    users = [f"user{i}@localhost" for i in range(1, USER_COUNT + 1)]
    mail_groups = distribute_users_among_templates(users, templates)

    for group in mail_groups:
        tpl = group["template"]
        tpl_name = tpl.get("name", "Untitled")
        tpl_html = tpl.get("html")

        for recipient in group["recipients"]:
            if tpl_html:
                # Use saved template HTML as email body
                body_content = tpl_html.replace("{{user}}", recipient.split("@")[0])
            else:
                # Fallback: generate quote-based message
                body_content = generate_message_body(recipient)

            msg = MIMEText(body_content, "html")
            msg["Subject"] = tpl_name
            msg["From"] = BASE_EMAIL
            msg["To"] = recipient

            record = {
                "to": recipient,
                "subject": tpl_name,
                "body_snippet": body_content[:200],
                "timestamp": time.time(),
                "status": "pending"
            }

            try:
                smtp.sendmail(BASE_EMAIL, [recipient], msg.as_string())
                record["status"] = "success"
                sent_count += 1
                print(f"✅ Sent '{tpl_name}' to {recipient}")
            except Exception as e:
                record["status"] = f"failure: {str(e)}"
                failed_count += 1
                print(f"❌ Failed to send '{tpl_name}' to {recipient}: {e}")

            logs.append(record)
            save_email_logs(logs)

    smtp.quit()
    print(f"\n📬 Email sending completed: {sent_count} succeeded, {failed_count} failed.")
    print(f"🗂️ Logs saved to {LOG_FILE_PATH}")


if __name__ == "__main__":
    print("Ensuring users exist...")
    ensure_users()
    print("Sending emails...")
    send_emails()
