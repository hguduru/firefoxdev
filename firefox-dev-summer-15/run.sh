#!/bin/bash

if [ -z $CUDDLEFISH_ROOT ]; then
    cd ../addon-sdk-latest
    source bin/activate
    cd -
fi;

cfx run "{\"enable_clear_log\" : 1, \"study_uid\" : 1}" $@ &> log.txt
