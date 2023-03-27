#!/usr/bin/env bash

echo "test args $1 $2 $3 $4 $5 $6 $7 $8 $9 $10"

browser=[$1] || "--browser"

# deno task capi -- deno run -A -r=http://localhost:4646/ https://raw.githubusercontent.com/paritytech/trun/feat/trun-cli/main.ts --dir $1 --importMap $2 --concurrency $3 $browser
