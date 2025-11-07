from flask import Flask, jsonify, request
import docker
import time
import os
import json
import sqlite3
import email

app = Flask(__name__)
client = docker.from_env()

BASE_EMAIL = "base@localhost"
USER_COUNT = 50

DB_PATH = 'email_logs.db'

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS email_logs (
                container_id TEXT,
                recipient TEXT,
                subject TEXT,
                status TEXT,
                timestamp REAL,
                body_snippet TEXT,
                PRIMARY KEY (container_id, recipient, subject, timestamp)
            )
        ''')
        conn.commit()

def save_email_logs_to_db(container_id, logs):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        for record in logs:
            c.execute('''
                INSERT OR REPLACE INTO email_logs
                (container_id, recipient, subject, status, timestamp, body_snippet)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                container_id,
                record.get('to'),
                record.get('subject'),
                record.get('status'),
                record.get('timestamp'),
                record.get('body_snippet')[:300] if record.get('body_snippet') else ''
            ))
        conn.commit()

def get_email_logs_from_db(container_id):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('SELECT recipient, subject, status, timestamp, body_snippet FROM email_logs WHERE container_id = ? ORDER BY timestamp DESC', (container_id,))
        rows = c.fetchall()
        return [
            {
                "to": r[0],
                "subject": r[1],
                "status": r[2],
                "timestamp": r[3],
                "body_snippet": r[4]
            }
            for r in rows
        ]

def parse_mail_content(raw_content):
    # Parse raw email content to extract headers and snippet
    msg = email.message_from_bytes(raw_content)
    mail_info = {
        'from': msg.get('From'),
        'to': msg.get('To'),
        'subject': msg.get('Subject'),
        'date': msg.get('Date'),
        'body_snippet': '',
        'status': 'success'  # default to success, adjust if needed
    }
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            if ctype == 'text/plain':
                mail_info['body_snippet'] = part.get_payload(decode=True)[:100].decode(errors='ignore')
                break
    else:
        mail_info['body_snippet'] = msg.get_payload(decode=True)[:100].decode(errors='ignore')
    return mail_info


@app.route('/containers/maildata/<container_name>', methods=['GET'])
def fetch_mail_data(container_name):
    try:
        container = client.containers.get(container_name)
    except docker.errors.NotFound:
        return jsonify({'error': 'Container not found'}), 404

    users_param = request.args.get('users', '')  # comma-separated list
    if users_param:
        user_indices = [int(u.strip()) for u in users_param.split(',') if u.strip().isdigit()]
    else:
        user_indices = range(1, USER_COUNT + 1)

    mail_data = []
    for i in user_indices:
        maildir_path = f"/home/user{i}/Maildir/new"
        try:
            cmd_ls = f"ls {maildir_path}"
            exit_code, output = container.exec_run(cmd_ls)
            if exit_code != 0:
                continue
            mail_files = output.decode().strip().split('\n')
            for mail_file in mail_files:
                cmd_cat = f"cat {maildir_path}/{mail_file}"
                exit_code, mail_content = container.exec_run(cmd_cat)
                if exit_code != 0:
                    continue
                mail_info = parse_mail_content(mail_content)
                mail_info['user'] = f"user{i}"
                mail_data.append(mail_info)
        except Exception:
            continue

    # Save these logs to DB asynchronously if you want, else do now for demo
    # For simplicity, let's save here on fetch (optional, can be moved per your app logic)
    save_email_logs_to_db(container_name, mail_data)

    return jsonify(mail_data)


@app.route('/containers/create', methods=['POST'])
def create_container():
    container = client.containers.run("mypostfix", detach=True, ports={'25/tcp': None})
    return jsonify({"id": container.id, "name": container.name})


@app.route('/containers/delete/<container_id>', methods=['DELETE'])
def delete_container(container_id):
    container = client.containers.get(container_id)
    container.remove(force=True)
    # Delete all email logs associated with this container
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('DELETE FROM email_logs WHERE container_id = ?', (container_id,))
        conn.commit()
    return jsonify({"removed": container_id})


@app.route('/containers', methods=['GET'])
def list_containers():
    containers = []
    for c in client.containers.list(all=True):
        # For emails sent count, count entries in sqlite for container
        with sqlite3.connect(DB_PATH) as conn:
            c_db = conn.cursor()
            c_db.execute('SELECT COUNT(*) FROM email_logs WHERE container_id = ?', (c.id,))
            count = c_db.fetchone()[0]

        containers.append({
            "id": c.id,
            "name": c.name,
            "status": c.status,
            "base_email": BASE_EMAIL,
            "user_count": USER_COUNT,
            "uptime_seconds": get_uptime(c) if c.status == "running" else 0,
            "emails_sent": count
        })
    return jsonify(containers)


@app.route('/containers/stats/<container_id>', methods=['GET'])
def container_stats(container_id):
    container = client.containers.get(container_id)
    try:
        usage = container.stats(stream=False)
        cpu_delta = usage['cpu_stats']['cpu_usage']['total_usage'] - usage['precpu_stats']['cpu_usage']['total_usage']
        system_delta = usage['cpu_stats']['system_cpu_usage'] - usage['precpu_stats']['system_cpu_usage']
        cpu_percent = (cpu_delta / system_delta) * len(usage['cpu_stats']['cpu_usage']['percpu_usage']) * 100.0 if system_delta > 0 else 0.0
        mem_usage = usage['memory_stats']['usage']
        mem_limit = usage['memory_stats']['limit']
        mem_percent = mem_usage / mem_limit * 100.0 if mem_limit > 0 else 0.0
    except Exception:
        cpu_percent = mem_usage = mem_limit = mem_percent = 0

    emails_sent = 0
    with sqlite3.connect(DB_PATH) as conn:
        c_db = conn.cursor()
        c_db.execute('SELECT COUNT(*) FROM email_logs WHERE container_id = ?', (container_id,))
        emails_sent = c_db.fetchone()[0]

    return jsonify({
        "container_id": container_id,
        "emails_sent": emails_sent,
        "uptime_seconds": get_uptime(container),
        "cpu_percent": cpu_percent,
        "memory_usage": mem_usage,
        "memory_limit": mem_limit,
        "memory_percent": mem_percent
    })


@app.route('/containers/emails/<container_id>', methods=['GET'])
def container_email_logs(container_id):
    try:
        logs = get_email_logs_from_db(container_id)
        return jsonify(logs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/containers/send-emails/<container_id>', methods=['POST'])
def send_emails(container_id):
    container = client.containers.get(container_id)
    if container.status != "running":
        container.start()
    exec_result = container.exec_run("python3 /send_emails.py")
    output = exec_result.output.decode(errors="ignore")
    # Possibly parse output or logs here and update DB (omitted for simplicity)
    return jsonify({"container_id": container_id, "output": output})


@app.route('/containers/logs/<container_id>', methods=['GET'])
def get_logs(container_id):
    container = client.containers.get(container_id)
    filter_level = request.args.get('filter', None)
    raw_logs = container.logs(tail=200).decode(errors="ignore").splitlines()

    if filter_level == 'error':
        filtered_logs = [line for line in raw_logs if 'error' in line.lower() or 'reject' in line.lower()]
        return jsonify({"logs": "\n".join(filtered_logs)})

    return jsonify({"logs": "\n".join(raw_logs)})


# Helper to get container uptime in seconds
def get_uptime(container):
    started_at = container.attrs['State']['StartedAt']
    start_time = time.strptime(started_at.split('.')[0], "%Y-%m-%dT%H:%M:%S")
    start_epoch = time.mktime(start_time)
    return int(time.time() - start_epoch)


if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0')
