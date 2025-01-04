
# Alertmanager setup

Obtain telegram bot token and chat ID:
- https://gist.github.com/nafiesl/4ad622f344cd1dc3bb1ecbe468ff9f8a

Send a message to bot to create a private chat with the bot.

```bash
# get chat ID
botToken=
curl https://api.telegram.org/bot$botToken/getUpdates
# look for chat id in the output
chatId=

mkdir -p ./metrics/alertmanager/env/telegram/
cat << EOF > ./metrics/alertmanager/env/telegram/telegram-secret.yaml
---
apiVersion: v1
kind: Secret
metadata:
  namespace: alertmanager
  name: telegram-bot-token
type: Opaque
stringData:
  token: 1234567890:qwertyuiopasdfghj_klzxcvbnmqwertyui
EOF

cat << EOF > ./metrics/alertmanager/env/telegram/alert-manager-telegram.yaml
---
apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: telegram
  namespace: alertmanager
  labels:
    alertmanager.prometheus.io/instance: main
spec:
  route:
    # groupBy: [ 'job' ]
    groupBy: [ 'alertname' ]
    # groupBy: [ '...' ] # '...' disables grouping
    groupWait: 30s
    groupInterval: 5m
    repeatInterval: 12h
    receiver: telegram
    matchers:
    - name: severity
      value: none
      matchType: '!='
  receivers:
  - name: telegram
    telegramConfigs:
    - apiURL: https://api.telegram.org
      botToken:
        name: telegram-bot-token
        key: token
      chatID: $chatId
      message: |
        {{ if gt (len .Alerts.Firing) 0 }}
        📢 {{ (index .Alerts.Firing 0).Labels.alertname}}
        {{ range .Alerts.Firing }}
        🚨 {{ .Annotations.description }}
        {{ end }}
        {{ end }}
        {{ if gt (len .Alerts.Resolved) 0 }}
        🍀 {{ (index .Alerts.Resolved 0).Labels.alertname}}
        {{ range .Alerts.Resolved }}
        ✔️ Solved: {{ .Annotations.description }}
        {{ end }}
        {{ end }}
  # inhibitRules:
  # - sourceMatch:
  #   - name: severity
  #     value: critical
  #     matchType: '!='
  #   targetMatch:
  #   - name: severity
  #     value: warning
  #     matchType: '='
  #   equal: [ 'alertname', 'dev', 'instance' ]
EOF

kl apply -k ./metrics/alertmanager/env/telegram/
kl -n alertmanager describe AlertmanagerConfig telegram
```
