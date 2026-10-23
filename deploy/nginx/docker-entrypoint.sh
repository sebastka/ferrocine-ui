#!/bin/sh
# Render the nginx configuration from the environment, then run nginx in the foreground.
set -eu

upstream="${FERROCINE_UPSTREAM:-http://ferrocine:8096}"
upstream="${upstream%/}"
case "$upstream" in
    http://?* | https://?*) ;;
    *)
        echo "FERROCINE_UPSTREAM must be http(s)://host[:port], got: $upstream" >&2
        exit 1
        ;;
esac
# scheme://host:port only: a path would change how nginx forwards URIs, and any other
# character could break out of the configuration.
rest="${upstream#*://}"
case "$rest" in
    */* | *[!A-Za-z0-9.:_\[\]-]*)
        echo "FERROCINE_UPSTREAM must be http(s)://host[:port] without a path, got: $upstream" >&2
        exit 1
        ;;
esac

# Name servers for nginx: IPv6 ones in brackets, link-local ones (with a %zone) skipped.
resolver="${NGINX_RESOLVER:-}"
if [ -z "$resolver" ] && [ -r /etc/resolv.conf ]; then
    resolver="$(awk '$1 == "nameserver" && $2 !~ /%/ { printf "%s ", ($2 ~ /:/ ? "[" $2 "]" : $2) }' /etc/resolv.conf)"
fi
resolver="${resolver:-127.0.0.11}"
case "$resolver" in
    *[!A-Za-z0-9.:_\[\]\ -]*)
        echo "invalid NGINX_RESOLVER: $resolver" >&2
        exit 1
        ;;
esac

mkdir -p /tmp/nginx
sed -e "s|@UPSTREAM@|$upstream|g" -e "s|@RESOLVER@|$resolver|g" \
    /etc/ferrocine-ui/nginx.conf.template > /tmp/nginx/nginx.conf

exec nginx -e /dev/stderr -c /tmp/nginx/nginx.conf -g 'daemon off;' "$@"
