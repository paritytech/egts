#!/usr/bin/env bash

echo "test args $1 $2 $3 $4 $5 $6 $7 $8 $9 ${10}"



browser=""
if ! [[ -z $1 ]]; then
  browser="--browser"
fi

browser_exec_path=""
if ! [[ -z $2 ]]; then
  browser_exec_path="--browser-exec-path $2"
fi

concurrency=""
if ! [[ -z $3 ]]; then
  concurrency="--concurrency $3"
fi

dir=""
if ! [[ -z $4 ]]; then
  dir="--dir $4"
fi

filter=""
if ! [[ -z $5 ]]; then
  filter="--filter $5"
fi

headless=""
if ! [[ -z $6 ]]; then
  headless="--headless"
fi

headless=""
if ! [[ -z $7 ]]; then
  ignore="--ignore $7"
fi

import_map=""
if ! [[ -z $8 ]]; then
  import_map="--import-map $8"
fi

output=""
if ! [[ -z $9 ]]; then
  output="--output $9"
fi

reload_url=""
deno_reload=""
if ! [[ -z ${10} ]]; then
  reload_url="--reload-url ${10}"
  deno_reload="-r=${10}"
fi

echo "deno run -A $deno_reload /trun/main.ts $browser $browser_exec_path $concurrency $dir $filter $headless $ignore $import_map $output $reload_url"

deno run -A $deno_reload /trun/main.ts $browser $browser_exec_path $concurrency $dir $filter $headless $ignore $import_map $output $reload_url
