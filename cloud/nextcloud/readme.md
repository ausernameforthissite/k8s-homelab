
# Nextcloud

References:
- https://github.com/nextcloud/docker
- https://hub.docker.com/_/nextcloud/
- https://github.com/aptible/supercronic
- https://hub.docker.com/_/nginx
- https://chrismoore.ca/2018/10/finding-the-correct-pm-max-children-settings-for-php-fpm/

# Prerequisites

- [Postgres Operator](../../storage/postgres/readme.md)

# Storage setup

Set storage classes for different data types:

```bash
mkdir -p ./cloud/nextcloud/pvc/env/
cat <<EOF > ./cloud/nextcloud/pvc/env/pvc.env
# userdata uses ReadWriteMany type volumes
userdata=fast
userdata_size=1Ti

# config uses ReadWriteMany type volumes
config=fast
config_size=1Gi
EOF

# TODO use this patch
mkdir -p ./cloud/nextcloud/postgres/env/
 cat << EOF > ./cloud/nextcloud/postgres/env/patch.yaml
---
apiVersion: acid.zalan.do/v1
kind: postgresql
metadata:
  name: postgres
  namespace: nextcloud
spec:
  volume:
    # default wal max size is 1Gi + 1Gi for the database itself
    size: 2Gi
    storageClass: block
EOF
```

# Config setup

Generate passwords and set up config.

```bash
mkdir -p ./cloud/nextcloud/main-app/env/
cat <<EOF > ./cloud/nextcloud/main-app/env/passwords.env
redis_password=$(LC_ALL=C tr -dc A-Za-z0-9 < /dev/urandom | head -c 20)
admin_name=admin
admin_password=$(LC_ALL=C tr -dc A-Za-z0-9 < /dev/urandom | head -c 20)
EOF
cat <<EOF > ./cloud/nextcloud/main-app/env/nextcloud.env
# k8s pod CIDR
trusted_proxies=10.201.0.0/16
EOF
```

# Deploy

```bash
kl create ns nextcloud
kl label ns nextcloud pod-security.kubernetes.io/enforce=baseline

# ingress with wildcard certificate
kl label ns --overwrite nextcloud copy-wild-cert=main
kl apply -k ./cloud/nextcloud/ingress-wildcard/
kl -n nextcloud get ingress

# tell nextcloud to allow connections via ingress domain address
nextcloud_public_domain=$(kl -n nextcloud get ingress nextcloud -o go-template --template "{{ (index .spec.rules 0).host}}")
kl -n nextcloud create configmap public-domain --from-literal public_domain="$nextcloud_public_domain" -o yaml --dry-run=client | kl apply -f -

kl apply -f ./cloud/nextcloud/postgres.yaml
kl -n nextcloud describe postgresqls.acid.zalan.do postgres
kl apply -k ./cloud/nextcloud/pvc/
kl -n nextcloud get pvc

kl apply -k ./cloud/nextcloud/main-app/
kl -n nextcloud get pod -o wide -L spilo-role
```

# Uninstall

```bash
kl delete -k ./cloud/nextcloud/notifications/
kl delete -k ./cloud/nextcloud/main-app/
kl delete -k ./cloud/nextcloud/pvc/
kl delete -f ./cloud/nextcloud/postgres.yaml
kl delete ns nextcloud
```

# Onlyoffice integration

Nextcloud has integration with Onlyoffice app.
You need to deploy [onlyoffice](../onlyoffice/readme.md)
and configure connection settings to use it.

OnlyOffice app installation can take a long time
both for downloading the app and for running the cron job.

```bash
onlyoffice_jwt_secret=$(kl -n onlyoffice get secret onlyoffice-api --template {{.data.jwt_secret}} | base64 --decode)
onlyoffice_public_domain=$(kl -n onlyoffice get ingress onlyoffice -o go-template "{{ (index .spec.rules 0).host}}")
kl -n nextcloud exec deployments/nextcloud -c nextcloud -i -- bash - << EOF
set -eu
php occ app:enable onlyoffice
php occ config:app:set onlyoffice customizationFeedback --value false
php occ config:system:set onlyoffice StorageUrl --value "http://frontend.nextcloud.svc/"
php occ config:system:set onlyoffice jwt_header --value AuthorizationJwt
php occ config:system:set onlyoffice jwt_secret --value "${onlyoffice_jwt_secret}"
php occ config:system:set onlyoffice DocumentServerInternalUrl --value "http://onlyoffice.onlyoffice.svc/"
php occ config:system:set onlyoffice DocumentServerUrl --value "https://${onlyoffice_public_domain}/"
php -f /var/www/html/cron.php
EOF
```

# Push notifications

Nextcloud has push notifications system but it requires additional configuration to work.

Note that push server must be in the `trusted_proxies` CIDR.

References:
- https://github.com/nextcloud/notify_push

```bash
# ingress with wildcard certificate
kl label ns --overwrite nextcloud copy-wild-cert=main
kl apply -k ./cloud/nextcloud/notifications/ingress-wildcard/
kl -n nextcloud get ingress

nextcloud_push_domain=$(kl -n nextcloud get ingress push-notifications -o go-template "{{ (index .spec.rules 0).host}}")
kl -n nextcloud create configmap push --from-literal push_address="https://${nextcloud_push_domain}" -o yaml --dry-run=client | kl apply -f -

kl apply -k ./cloud/nextcloud/notifications/
kl -n nextcloud get pod -o wide
```

You can run test commands to trigger push notifications manually:

```bash
# self-test
kl -n nextcloud exec deployments/nextcloud -c nextcloud -- php occ notify_push:self-test
# show number of connections and messages
kl -n nextcloud exec deployments/nextcloud -c nextcloud -- php occ notify_push:metrics
# send a test notifications to user with id "admin"
kl -n nextcloud exec deployments/nextcloud -c nextcloud -- php occ notification:test-push admin
```

**Note**: Mobile app should register itself when connecting to server.
If you sign out and login again then it seems like it doesn't.
This can be fixed by clearing mobile app data.

# Brute-force protection FAQ

Nextcloud will temporarily lock you out of web UI if you fail several login attempts.

You can reset this:

```bash
# list throttled ips
db_password=$(kl -n nextcloud get secret -l nextcloud=passwords --template "{{ (index .items 0).data.mariadb_user_password}}" | base64 --decode)
kl -n nextcloud exec deployments/mariadb -c mariadb -- mysql -u nextcloud -p"$db_password" --database nextcloud -e "select * from oc_bruteforce_attempts;"
# unblock an ip-address
kl -n nextcloud exec deployments/nextcloud -c nextcloud -- php occ security:bruteforce:reset <ip-address>
# enable a disabled user
kl -n nextcloud exec deployments/nextcloud -c nextcloud -- php occ user:enable <name of user>
```

TODO: update this to use postgres.

References:
- https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/occ_command.html#security

# Apps

TODO

Potentially interesting apps:
- Archive manager
- Contacts
- Draw.io
- Extract
- Full text search (requires external setup)
- Notes
- Recognize

Investigate `allow_local_remote_servers` option.
