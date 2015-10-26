#!/bin/sh

if [ -z $CUDDLEFISH_ROOT ]; then
    cd ../addon-sdk-latest
    source bin/activate
    cd -
fi;

cfx run --static-args="{\"debug\" : true}" $@ &> log.txt
