set -e
DATA="${POMMORA_SYNC_DATA:-$HOME/.pommora-sync}"
mkdir -p "$DATA"
if [ -e "$DATA/hub-key.pem" ]; then
  echo "$DATA/hub-key.pem already exists; delete both hub-key.pem and hub-cert.pem to re-mint."
  exit 0
fi
umask 077
openssl req -x509 -nodes -days 3650 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -pkeyopt ec_param_enc:named_curve \
  -subj "/CN=pommora-hub" -addext "subjectAltName=IP:127.0.0.1,DNS:localhost" \
  -keyout "$DATA/hub-key.pem" -out "$DATA/hub-cert.pem"
