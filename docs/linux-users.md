
# Linux users

# Create new user

```bash
username=
sudo useradd --create-home --shell /bin/bash "$username"
sudo passwd "$username"
# enable sudo for the new user
sudo adduser "$username" sudo

# switch login to user
# useful if you want to change SSH settings to be able to login remotely
sudo su - "$username"
```

You probably want to set up SSH next: [SSH tips](./ssh.md#allow-login-with-your-ssh-key)

# List users

```bash
cat /etc/passwd
```

# Delete a user

```bash
sudo userdel USERNAME
```

# `sudo` without password

```bash
echo "$USER ALL=(ALL:ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/$USER
```