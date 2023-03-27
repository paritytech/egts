#!/usr/bin/env bash

echo "test args $1 $2 $3 $4 $5 $6 $7 $8 $9 ${10}"

browser=[$1] || "--browser"
browser_exec_path=[$2] || "--browser-exec-path $2"
concurrency=[$3] || "--concurrency $3"
dir=[$4] || "--dir $4"
filter=[$5] || "--filter $5"
headless=[$6] || "--headless"
ignore=[$7] || "--ignore $7"
import_map=[$8] || "--import-map $8"
output=[$9] || "--output $9"
reload_url=[${10}] || "--reload-url ${10}"
deno_reload=[${10}] || "-r=${10}"

echo "deno run -A $deno_reload /trun/main.ts $browser $browser_exec_path $concurrency $dir $filter $headless $ignore $import_map $output $reload_url"

deno run -A $deno_reload /trun/main.ts $browser $browser_exec_path $concurrency $dir $filter $headless $ignore $import_map $output $reload_url
