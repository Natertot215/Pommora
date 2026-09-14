DATA="${POMMORA_SYNC_DATA:-$HOME/.pommora-sync}"
mkdir -p "$DATA"
openssl req -x509 -nodes -days 3650 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
  -subj "/CN=pommora-hub" -addext "subjectAltName=IP:127.0.0.1,DNS:localhost" \
  -keyout "$DATA/hub-key.pem" -out "$DATA/hub-cert.pem"
