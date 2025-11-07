FROM debian:stable-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install Postfix, mailutils, mutt, python3, pip, and rsyslog
RUN apt-get update && \
    apt-get install -y postfix mailutils mutt python3 python3-pip rsyslog && \
    pip install --no-cache-dir --break-system-packages requests && \
    rm -rf /var/lib/apt/lists/*

# Configure Postfix to use Maildir and local delivery
RUN postconf -e "home_mailbox = Maildir/" && \
    postconf -e "inet_interfaces = all" && \
    postconf -e "inet_protocols = ipv4" && \
    postconf -e "myhostname = localhost.localdomain" && \
    postconf -e "myorigin = localhost" && \
    postconf -e "mydestination = localhost, localhost.localdomain"

# Create test user and Maildir
RUN useradd -m testuser && \
    mkdir -p /home/testuser/Maildir/{cur,new,tmp} && \
    chown -R testuser:testuser /home/testuser

# Create 50 mail users user1 to user50
RUN for i in $(seq 1 50); do \
      useradd -m user$i; \
    done

# Configure mail commands to use Maildir by default for all users
RUN echo 'export MAIL=~/Maildir' >> /etc/profile && \
    echo 'set MAIL=~/Maildir' >> /etc/skel/.bashrc && \
    echo 'set MAIL=~/Maildir' >> /home/testuser/.bashrc && \
    echo 'set folder=~/Maildir' >> /home/testuser/.muttrc && \
    chown testuser:testuser /home/testuser/.bashrc /home/testuser/.muttrc

# Copy the email sending python script to the container
COPY send_emails.py /send_emails.py
RUN chmod +x /send_emails.py

# Start rsyslogd and postfix in foreground to keep the container running
CMD rsyslogd && postfix start-fg
