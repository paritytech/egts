#!/usr/bin/env bash

echo "test args $1 $2 $3 $4 $5 $6 $7 $8 $9 ${10}"

browser=[$1] || "--browser"
headless=[$6] || "--headless"
deno_reload=[${10}] || "-r=${10}"

deno run -A $deno_reload /trun/main.ts --browser-exec-path $2 --concurrency $3 --dir $4 --filter $5 --ignore $7 --importMap $8 --output $9 --reload-url=${10} $browser $headless
