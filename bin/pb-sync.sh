#!/bin/bash -el

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd $script_dir/..

node src/index.js ${*}
