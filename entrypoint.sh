#!/usr/bin/env bash

echo "test args $1 $2 $3 $4 $5 $6 $7 $8 $9 ${10}"

browser=[$1] || "--browser"
headless=[$6] || "--headless"

deno run -A -r=${10} /trun/main.ts --browser-exec-path $2 --concurrency $3 --dir $4 --filter $5 --ignore $7 --importMap $8 --output $9 $browser $headless
