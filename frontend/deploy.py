import os
import tarfile
import paramiko

host = "221.121.5.186"
user = "root"
pwd = "t6gkv9DSPChv"

current_dir = os.path.dirname(os.path.abspath(__file__))
local_dist = os.path.join(current_dir, "dist")
archive_path = os.path.join(current_dir, "dist.tar.gz")

if not os.path.exists(local_dist):
    print("Khong tim thay thu muc 'dist'. Hay chay 'npm run build' truoc khi deploy!")
    exit(1)

print("1/4. Dang nen thu muc dist thanh 1 goi duy nhat (dist.tar.gz)...")
with tarfile.open(archive_path, "w:gz") as tar:
    for item in os.listdir(local_dist):
        tar.add(os.path.join(local_dist, item), arcname=item)

print(f"2/4. Dang ket noi toi VPS {host}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, port=22, username=user, password=pwd, timeout=15)
sftp = ssh.open_sftp()

print("3/4. Dang upload file nen len VPS qua SFTP...")
sftp.put(archive_path, "/tmp/dist.tar.gz")
sftp.close()

if os.path.exists(archive_path):
    os.remove(archive_path)

print("4/4. Giai nen tren VPS va khoi dong lai Nginx...")
remote_cmd = (
    "mkdir -p /opt/wareflow/frontend/dist && "
    "rm -rf /opt/wareflow/frontend/dist/* && "
    "tar -xzf /tmp/dist.tar.gz -C /opt/wareflow/frontend/dist/ && "
    "rm -f /tmp/dist.tar.gz && "
    "docker exec wareflow-frontend nginx -s reload"
)
stdin, stdout, stderr = ssh.exec_command(remote_cmd)
exit_status = stdout.channel.recv_exit_status()

if exit_status != 0:
    print("Loi giai nen hoac reload Nginx:", stderr.read().decode())
else:
    print("\n>>> DEPLOY HOAN TAT SIEU TOC THANH CONG! <<<")
    print("Truy cap: http://221.121.5.186/")

ssh.close()


