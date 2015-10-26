#!/bin/sh

if [ -z $CUDDLEFISH_ROOT ]; then
    cd ../addon-sdk-latest
    source bin/activate
    cd -
fi;

cfx xpi --update-link https://grey-dev.ece.cmu.edu/privbrowse/ids/"$1"/privatebrowse.xpi --update-url https://grey-dev.ece.cmu.edu/privbrowse/ids/"$1"/privatebrowse.update.rdf --static-args "{\"study_uid\":\"$1\"}"

