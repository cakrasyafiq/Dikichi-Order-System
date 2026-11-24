#!/usr/bin/env bash
# Usage: ./scripts/smoke-test.sh   (run from Backend/, after `docker compose up` is healthy)
# Requires: curl, jq. Reads seed passwords from ENV_FILE (default ../.env).
set -u

BASE="${BASE_URL:-http://localhost:8080}"
ENV_FILE="${ENV_FILE:-../.env}"
MENU_MIE="11111111-0000-4000-8000-000000000001"
MENU_ES_TEH="11111111-0000-4000-8000-000000000018"
MENU_SOLD_OUT="11111111-0000-4000-8000-000000000008"

if [ ! -f "$ENV_FILE" ]; then echo "Env file not found: $ENV_FILE"; exit 2; fi
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT
PASS=0
FAIL=0
STATUS=""
BODY=""

call() {
  local method=$1 path=$2 token=${3:-} data=${4:-}
  local args=(-s -o "$BODY_FILE" -w '%{http_code}' -X "$method" "$BASE$path")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$data" ] && args+=(-H "Content-Type: application/json" -d "$data")
  STATUS=$(curl "${args[@]}")
  BODY=$(cat "$BODY_FILE")
}

field() { echo "$BODY" | jq -r "$1 // empty"; }

check() {
  local name=$1 want_status=$2 want_code=${3:-}
  local got_code
  got_code=$(echo "$BODY" | jq -r 'if type == "object" then (.code // empty) else empty end')
  if [ "$STATUS" = "$want_status" ] && { [ -z "$want_code" ] || [ "$got_code" = "$want_code" ]; }; then
    PASS=$((PASS + 1))
    printf 'PASS  %-62s %s %s\n' "$name" "$STATUS" "$got_code"
  else
    FAIL=$((FAIL + 1))
    printf 'FAIL  %-62s expected %s %s, got %s %s\n' "$name" "$want_status" "$want_code" "$STATUS" "$got_code"
  fi
}

login() {
  call POST /api/v1/auth/login "" "{\"outletId\":\"$1\",\"password\":\"$2\"}"
  field '.accessToken'
}

order_body() {
  printf '{"outletId":"%s","tableCode":"%s","customerName":"%s","items":%s}' "$1" "$2" "$3" "$4"
}

echo "== Auth =="
call POST /api/v1/auth/login "" "{\"outletId\":\"OUT-01\",\"password\":\"wrong-password\"}"
check "login with wrong password" 401 UNAUTHORIZED
OUTLET_PASS="${SEED_OUTLET_PASSWORD:-${SEED_CASHIER_PASSWORD:-${SEED_MASTER_PASSWORD:-}}}"
OUTLET_TOKEN=$(login OUT-01 "$OUTLET_PASS")
[ -n "$OUTLET_TOKEN" ] && { PASS=$((PASS + 1)); echo "PASS  login OUT-01"; } \
  || { FAIL=$((FAIL + 1)); echo "FAIL  login OUT-01 (cannot continue)"; exit 1; }

echo "== Catalog GET (public) =="
call GET /api/v1/outlets; check "GET outlets" 200
call GET /api/v1/outlets/OUT-01; check "GET outlet OUT-01" 200
call GET /api/v1/outlets/OUT-404; check "GET unknown outlet" 404 NOT_FOUND
call GET /api/v1/outlets/OUT-01/tables; check "GET tables" 200
call GET /api/v1/outlets/OUT-01/menu-items; check "GET menu items" 200
call GET "/api/v1/menu-items/$MENU_MIE"; check "GET menu item by id" 200

echo "== Catalog POST & Outlet Isolation =="
call POST /api/v1/outlets "$OUTLET_TOKEN" '{"id":"OUT-99","name":"Outlet Uji","address":"Jl. Uji No. 1"}'
check "POST another outlet as OUT-01" 403 FORBIDDEN
call POST /api/v1/outlets "$OUTLET_TOKEN" '{"id":"OUT-01","name":"Outlet Uji","address":"Jl. Uji No. 1"}'
check "POST outlet duplicate id" 409 DUPLICATE_OUTLET_ID
call POST /api/v1/outlets "$OUTLET_TOKEN" '{"id":"BAD","name":"","address":""}'
check "POST outlet invalid body" 400 VALIDATION_ERROR
call POST /api/v1/outlets/OUT-02/tables "$OUTLET_TOKEN" '{"code":"T-21"}'
check "POST table in another outlet" 403 FORBIDDEN
call POST /api/v1/outlets/OUT-01/tables "$OUTLET_TOKEN" '{"code":"T-21"}'; check "POST table in own outlet" 201
call POST /api/v1/outlets/OUT-01/tables "$OUTLET_TOKEN" '{"code":"T-21"}'; check "POST table duplicate" 409 DUPLICATE_TABLE_CODE
call POST /api/v1/outlets/OUT-01/menu-items "$OUTLET_TOKEN" '{"name":"Menu Uji","price":15000,"category":"Uji"}'
check "POST menu item in own outlet" 201
NEW_MENU=$(field '.id')

echo "== Orders POST and GET =="
ITEMS_OK="[{\"menuItemId\":\"$MENU_MIE\",\"quantity\":2}]"
call POST /api/v1/orders "" "$(order_body OUT-01 T-01 Budi "$ITEMS_OK")"; check "POST order (guest)" 201
ORDER_ID=$(field '.id')
call POST /api/v1/orders "" "$(order_body OUT-01 T-01 Budi "[{\"menuItemId\":\"$MENU_SOLD_OUT\",\"quantity\":1}]")"
check "POST order with sold out item" 409 ITEM_UNAVAILABLE
call POST /api/v1/orders "" "$(order_body OUT-01 T-99 Budi "$ITEMS_OK")"; check "POST order unknown table" 422 INVALID_TABLE
call POST /api/v1/orders "" "$(order_body OUT-01 T-01 Budi "[{\"menuItemId\":\"$MENU_MIE\",\"quantity\":1},{\"menuItemId\":\"$MENU_MIE\",\"quantity\":1}]")"
check "POST order duplicate item" 400 DUPLICATE_MENU_ITEM
call GET /api/v1/orders; check "GET orders without token" 401 UNAUTHORIZED
call GET /api/v1/orders "$OUTLET_TOKEN"; check "GET orders as OUT-01" 200
call GET "/api/v1/orders?outletId=OUT-02" "$OUTLET_TOKEN"; check "GET orders for another outlet" 403 FORBIDDEN
call GET "/api/v1/orders/$ORDER_ID" "$OUTLET_TOKEN"; check "GET order by id" 200

echo "== Orders PUT and PATCH =="
ITEMS_NEW="[{\"menuItemId\":\"$MENU_MIE\",\"quantity\":1},{\"menuItemId\":\"$MENU_ES_TEH\",\"quantity\":2}]"
call PUT "/api/v1/orders/$ORDER_ID" "$OUTLET_TOKEN" "$(order_body OUT-01 T-02 "Budi Santoso" "$ITEMS_NEW")"
check "PUT order PENDING" 200
[ "$(field '.totalAmount')" = "22000" ] && { PASS=$((PASS + 1)); echo "PASS  PUT order total recalculated to 22000"; } \
  || { FAIL=$((FAIL + 1)); echo "FAIL  PUT order total expected 22000, got $(field '.totalAmount')"; }
call PUT "/api/v1/orders/$ORDER_ID" "$OUTLET_TOKEN" "$(order_body OUT-02 T-02 Budi "$ITEMS_NEW")"
check "PUT order changing outlet" 400 OUTLET_IMMUTABLE
call PATCH "/api/v1/orders/$ORDER_ID/status" "$OUTLET_TOKEN" '{"status":"PREPARING"}'; check "PATCH PREPARING" 409 INVALID_STATUS_TRANSITION
call PATCH "/api/v1/orders/$ORDER_ID/status" "$OUTLET_TOKEN" '{"status":"NOPE"}'; check "PATCH unknown status" 400 VALIDATION_ERROR
call PATCH "/api/v1/orders/$ORDER_ID/status" "$OUTLET_TOKEN" '{"status":"ACCEPTED"}'; check "PATCH ACCEPTED" 200
call PATCH "/api/v1/orders/$ORDER_ID/status" "$OUTLET_TOKEN" '{"status":"ACCEPTED"}'; check "PATCH ACCEPTED again" 409 INVALID_STATUS_TRANSITION
call PUT "/api/v1/orders/$ORDER_ID" "$OUTLET_TOKEN" "$(order_body OUT-01 T-02 Budi "$ITEMS_NEW")"; check "PUT order ACCEPTED" 409 ORDER_NOT_EDITABLE

echo "== Payment =="
call POST "/api/v1/orders/$ORDER_ID/pay" "" '{"paymentMethod":"CASH","amountTendered":50000}'; check "pay without token" 401 UNAUTHORIZED
call POST "/api/v1/orders/$ORDER_ID/pay" "$OUTLET_TOKEN" '{"paymentMethod":"CASH","amountTendered":1000}'; check "pay CASH insufficient" 400 VALIDATION_ERROR
call POST "/api/v1/orders/$ORDER_ID/pay" "$OUTLET_TOKEN" '{"paymentMethod":"CARD","amountTendered":50000}'; check "pay CARD with amountTendered" 400 VALIDATION_ERROR
call POST "/api/v1/orders/$ORDER_ID/pay" "$OUTLET_TOKEN" '{"paymentMethod":"CASH","amountTendered":50000}'; check "pay CASH" 200
[ "$(field '.status')" = "PREPARING" ] && { PASS=$((PASS + 1)); echo "PASS  paid order is PREPARING"; } \
  || { FAIL=$((FAIL + 1)); echo "FAIL  paid order status expected PREPARING, got $(field '.status')"; }
call POST "/api/v1/orders/$ORDER_ID/pay" "$OUTLET_TOKEN" '{"paymentMethod":"CASH","amountTendered":50000}'; check "pay twice" 409 ORDER_ALREADY_PAID

echo "== Kitchen Queue & Completion =="
call GET "/api/v1/orders?status=PREPARING" "$OUTLET_TOKEN"; check "GET PREPARING as OUT-01" 200
call PATCH "/api/v1/orders/$ORDER_ID/status" "$OUTLET_TOKEN" '{"status":"READY"}'; check "PATCH READY" 200
call PATCH "/api/v1/orders/$ORDER_ID/status" "$OUTLET_TOKEN" '{"status":"COMPLETED"}'; check "PATCH COMPLETED" 200

echo "== Catalog PUT, PATCH, DELETE =="
call PUT /api/v1/outlets/OUT-99 "$OUTLET_TOKEN" '{"name":"Outlet Uji 2","address":"Jl. Uji No. 2"}'; check "PUT another outlet as OUT-01" 403 FORBIDDEN
call PUT /api/v1/outlets/OUT-01 "$OUTLET_TOKEN" '{"name":"","address":"x"}'; check "PUT outlet empty name" 400 VALIDATION_ERROR
call PUT "/api/v1/menu-items/$NEW_MENU" "$OUTLET_TOKEN" '{"name":"Menu Uji 2","price":0,"category":"Uji","available":true}'
check "PUT menu item price 0" 400 VALIDATION_ERROR
call PUT "/api/v1/menu-items/$NEW_MENU" "$OUTLET_TOKEN" '{"name":"Menu Uji 2","price":16000,"category":"Uji","available":true}'
check "PUT menu item" 200
call PATCH "/api/v1/menu-items/$NEW_MENU/availability" "$OUTLET_TOKEN" '{"available":false}'; check "PATCH availability as OUT-01" 200
call PATCH "/api/v1/menu-items/$NEW_MENU/availability" "$OUTLET_TOKEN" '{}'; check "PATCH availability empty body" 400 VALIDATION_ERROR
call DELETE "/api/v1/menu-items/$NEW_MENU" "$OUTLET_TOKEN"; check "DELETE menu item" 204
call DELETE "/api/v1/menu-items/$NEW_MENU" "$OUTLET_TOKEN"; check "DELETE menu item again" 404 NOT_FOUND
call DELETE /api/v1/outlets/OUT-01/tables/T-21 "$OUTLET_TOKEN"; check "DELETE table" 204
call DELETE /api/v1/outlets/OUT-99 "$OUTLET_TOKEN"; check "DELETE another outlet" 403 FORBIDDEN

echo "== Gateway =="
call POST /internal/orders/validate "" '{}'; check "internal route is not exposed" 404

echo
echo "Result: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
