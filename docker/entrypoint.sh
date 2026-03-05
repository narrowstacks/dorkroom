#!/bin/sh
set -e

# Install dependencies (Linux platform binaries for bind-mount)
bun install --frozen-lockfile

# Resolve allowed domains, separating IPv4 and IPv6
FILMDEV_V4=$(getent ahostsv4 filmdev.org | awk '{print $1}' | sort -u)
DORKROOM_V4=$(getent ahostsv4 dorkroom.art | awk '{print $1}' | sort -u)
FILMDEV_V6=$(getent ahostsv6 filmdev.org | awk '{print $1}' | sort -u)
DORKROOM_V6=$(getent ahostsv6 dorkroom.art | awk '{print $1}' | sort -u)

# IPv4 rules
iptables -P OUTPUT DROP
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT

for ip in $FILMDEV_V4; do
  iptables -A OUTPUT -d "$ip" -p tcp --dport 443 -j ACCEPT
done
for ip in $DORKROOM_V4; do
  iptables -A OUTPUT -d "$ip" -p tcp --dport 443 -j ACCEPT
done

# IPv6 rules
ip6tables -P OUTPUT DROP
ip6tables -A OUTPUT -o lo -j ACCEPT
ip6tables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
ip6tables -A OUTPUT -p udp --dport 53 -j ACCEPT
ip6tables -A OUTPUT -p tcp --dport 53 -j ACCEPT

for ip in $FILMDEV_V6; do
  ip6tables -A OUTPUT -d "$ip" -p tcp --dport 443 -j ACCEPT
done
for ip in $DORKROOM_V6; do
  ip6tables -A OUTPUT -d "$ip" -p tcp --dport 443 -j ACCEPT
done

echo "Network locked down. Allowed: filmdev.org, dorkroom.art"

exec "$@"
