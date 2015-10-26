#!/bin/bash

if [ -z $CUDDLEFISH_ROOT ]; then
    cd ../addon-sdk-latest
    source bin/activate
    cd -
fi;

cfx run --static-args "{ \"performance\" : true, \"parallel\" : true }" $@
