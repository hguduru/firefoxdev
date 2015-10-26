#!/bin/sh

if [ -z $CUDDLEFISH_ROOT ]; then
    cd ../addon-sdk-latest
    source bin/activate
    cd -
fi;

cfx xpi --update-link https://grey-dev.ece.cmu.edu/privbrowse/dev/privatebrowse.xpi --update-url https://grey-dev.ece.cmu.edu/privbrowse/dev/privatebrowse.update.rdf --static-args "{\"enable_clear_log\" : 1}"

scp privatebrowse.* grey:~/
ssh -t grey 'sudo cp privatebrowse.* /var/www/privbrowse/dev/'
