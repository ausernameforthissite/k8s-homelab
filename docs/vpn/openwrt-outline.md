# Outline client on OpenWRT

In this guide, we set up the `shadowsocks-libev` Outline/Shadowsocks client.
As a result, all traffic of devices connected to that OpenWRT instance will be routed through Outline.

N.B.: This guide doesn't cover domain-based conditional routing.

# Sources

- [shadowsocks-libev setup guide (in Russian)](https://habr.com/ru/articles/748408/)
- [Russian IP addresses download guide (in Russian)](https://pavel.su/internet/list-of-russian-ip-addresses/)
- [`ipcalc` introduction](https://stackoverflow.com/questions/41325084/convert-ip-ranges-list-to-cidr)
- [`ipcalc` repository](https://github.com/kjokjo/ipcalc)

# Prerequisites

- [OpenWRT](./openwrt.md)

# Installation

```shell
opkg update
opkg install shadowsocks-libev-ss-local shadowsocks-libev-ss-redir
opkg install shadowsocks-libev-ss-rules shadowsocks-libev-ss-tunnel
opkg install luci-app-shadowsocks-libev
opkg install coreutils-base64
```

```shell
ADDRESS='ss://<base64 encoded password and encryption method>@<server IP>:<port>/?outline=1'
ADDRESS_REGEX='ss://([A-Za-z0-9]+)@([.0-9]+):([0-9]+)/\?outline=1'
[[ $ADDRESS =~ $ADDRESS_REGEX ]]
BASE64_PASSWORD=${BASH_REMATCH[1]}
OUTLINE_IP=${BASH_REMATCH[2]}

OUTLINE_PORT=${BASH_REMATCH[3]}
LEFT_PORT=$(($OUTLINE_PORT-1))
RIGHT_PORT=$(($OUTLINE_PORT+1))

METHOD_PASSWORD=$(echo $BASE64_PASSWORD | base64 -d)
PASSWORD_REGEX='([a-z0-9-]+):([A-Za-z0-9]+)'
[[ $METHOD_PASSWORD =~ $PASSWORD_REGEX ]]
OUTLINE_METHOD=${BASH_REMATCH[1]}
OUTLINE_PASSWORD=${BASH_REMATCH[2]}

cat <<EOF > /etc/config/shadowsocks-libev
config server 'sss0'
        option server '$OUTLINE_IP'
        option server_port '$OUTLINE_PORT'
        option password '$OUTLINE_PASSWORD'
        option method '$OUTLINE_METHOD'

config ss_redir 'hj'
        option server 'sss0'
        option local_address '0.0.0.0'
        option local_port '1100'
        option mode 'tcp_and_udp'
        option timeout '60'
        option fast_open '1'
        option reuse_port '1'

config ss_rules 'ss_rules'
        option src_default 'checkdst'
        option dst_forward_recentrst '0'
        option redir_tcp 'hj'
        option redir_udp 'hj'
        option local_default 'forward'
        option dst_default 'forward'
        option nft_tcp_extra 'tcp dport { 80-$LEFT_PORT, $RIGHT_PORT-65535 }'
        option nft_udp_extra 'udp dport { 53-65535 }'
EOF

uci commit network
/etc/init.d/network restart
```

# Check if your Outline client works

```shell
wget -qO- http://ipecho.net/plain | xargs echo
```

You should see the IP of the Outline server.

# Bypass Russian IPs

```shell
opkg update
opkg install jq perl wget curl
# install all the perl modules, because I'm too lazy to look for imports in ipcalc
opkg install $(opkg find '*perlbase*' | grep -E -o '^perlbase[a-z-]+' | tr '\n' ' ')
wget https://raw.githubusercontent.com/kjokjo/ipcalc/refs/heads/master/ipcalc
```

```shell
LOAD_SCRIPT=/root/load-ru-ip.sh

cat <<"EOF" > $LOAD_SCRIPT
#!/bin/bash
curl https://stat.ripe.net/data/country-resource-list/data.json?resource=RU | jq -r '.data.resources.ipv4 | .[]' > ru.txt

CIDR_FILE=/etc/shadowsocks-libev/ru_cidr.txt
echo '' > $CIDR_FILE
cat ru.txt | grep "/" >> $CIDR_FILE
cat ru.txt | grep -v "/" | xargs -n 1 perl ipcalc | grep -v 'deaggregate' >> $CIDR_FILE
rm ru.txt
EOF

chmod +x $LOAD_SCRIPT
$LOAD_SCRIPT

echo "0 0 * * * $LOAD_SCRIPT" >> /etc/crontabs/root
echo "        option dst_ips_bypass_file '/etc/shadowsocks-libev/ru_cidr.txt'" >> /etc/config/shadowsocks-libev

uci commit network
/etc/init.d/network restart
```
