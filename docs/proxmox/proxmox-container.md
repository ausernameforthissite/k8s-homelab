
# Proxmox containers

# Init container

```bash
apt update && apt full-upgrade -y && apt install -y sudo
sudo apt install -y curl lsb-release htop
```

Optionally:
- Create your user: [instructions](../linux-users.md#create-new-user)
- Copy SSH public key: `ssh-copy-id container.ip.address` (run on the main PC)
- Forbid password SSH access: [SSH cheat sheet](../ssh.md#server-set-up-ssh)
- Set up Bash: [Bah cheat sheet](../bash.md)