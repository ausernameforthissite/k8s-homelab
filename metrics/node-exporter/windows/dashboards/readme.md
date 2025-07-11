
# Deploy

```bash

 # force all panels to use the default data source min interval
 sed -i '/\"interval\":/d' ./metrics/node-exporter/windows/dashboards/*.json
 sed -i 's/\"version\"\: [0-9]*/\"version\": 0/' ./metrics/node-exporter/windows/dashboards/*.json
 sed -i '/\"pluginVersion\":/d' ./metrics/node-exporter/windows/dashboards/*.json
 # avoid id collisions
 sed -i 's/^  \"id\": .*,/  \"id\": null,/' ./metrics/node-exporter/windows/dashboards/*.json
 sed -i 's/^  \"refresh\": \".*s\",/  \"refresh\": \"auto\",/' ./metrics/node-exporter/windows/dashboards/*.json
 # remove local variable values
 sed -i '/        \"current\": {/,/        }\,/d' ./metrics/node-exporter/windows/dashboards/*.json
 sed -i 's/^  \"timezone\": \".*\",/  \"timezone\": \"browser\",/' ./metrics/node-exporter/windows/dashboards/*.json
 # grafana likes to flip some values between {"color":"green","value": null} and {"color":"green"}
 # this forces them all to lose "value": null, so that there are less changes in commits
 sed -i -z -r 's/,\n *\"value\": null(\n *})/\1/g' ./metrics/node-exporter/windows/dashboards/*.json

kl apply -k ./metrics/node-exporter/windows/dashboards/

```

# Cleanup

```bash
kl delete -k ./metrics/node-exporter/windows/dashboards/
```
