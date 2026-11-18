import os
import paramiko

host = "221.121.5.186"
user = "root"
pwd = "8BG3g4r&Jp=WQ8K1"

def make_dirs(sftp, remote_path):
    parts = remote_path.strip("/").split("/")
    cur = ""
    for p in parts:
        cur += "/" + p
        try:
            sftp.stat(cur)
        except IOError:
            try:
                sftp.mkdir(cur)
            except Exception:
                pass

def upload_dir(sftp, local_dir, remote_dir):
    make_dirs(sftp, remote_dir)
    for root, dirs, files in os.walk(local_dir):
        rel = os.path.relpath(root, local_dir)
        target_dir = remote_dir if rel == "." else os.path.join(remote_dir, rel).replace("\\", "/")
        make_dirs(sftp, target_dir)
        for f in files:
            loc_f = os.path.join(root, f)
            rem_f = os.path.join(target_dir, f).replace("\\", "/")
            print(f"Uploading file: {rem_f}")
            sftp.put(loc_f, rem_f)

current_dir = os.path.dirname(os.path.abspath(__file__))
local_dist = os.path.join(current_dir, "dist")

if not os.path.exists(local_dist):
    print("Khong tim thay thu muc 'dist'. Hay chay 'npm run build' truoc khi deploy!")
    exit(1)

print(f"Connecting to {host}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, port=22, username=user, password=pwd, timeout=15)
sftp = ssh.open_sftp()

print("Cleaning old assets on VPS...")
stdin, stdout, stderr = ssh.exec_command("rm -rf /opt/wareflow/frontend/dist/assets")
stdout.channel.recv_exit_status()

print("Uploading new frontend/dist...")
upload_dir(sftp, local_dist, "/opt/wareflow/frontend/dist")

sftp.close()

print("Reloading Nginx...")
stdin, stdout, stderr = ssh.exec_command("docker exec wareflow-frontend nginx -s reload")
stdout.channel.recv_exit_status()

ssh.close()
print("\n>>> DEPLOY HOAN TAT THANH CONG! <<<")
print("Truy cap: http://221.121.5.186/")

