#!/bin/sh

if [ -z $CUDDLEFISH_ROOT ]; then
    cd ../addon-sdk-latest
    source bin/activate
    cd -
fi;

cfx run --static-args "{\"enable_clear_log\" : 1, \"study_uid\" : 1, \"initrules\" : { \"groups\" : [{\"hosts\" : [\"google.com\", \"gmail.com\"], \"name\" : \"PersonaName\"}, {\"hosts\" : [\"amazon.com\"]}] }}" $@ &> log.txt
