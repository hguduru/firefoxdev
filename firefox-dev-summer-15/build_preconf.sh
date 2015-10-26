#!/bin/sh

cd "$(dirname "$0")"

REMOTE_USER="addonuserbilly"
REMOTE_HOST="grey-dev.ece.cmu.edu"
SSH_KEYFILE="/var/www/.ssh/addonuserbilly"

if [ -z $CUDDLEFISH_ROOT ]; then
    cd ../addon-sdk-latest
    source bin/activate
    cd -
fi;

cfx xpi --update-link https://grey-dev.ece.cmu.edu/privbrowse/ids/"$1"/privatebrowse.xpi --update-url https://grey-dev.ece.cmu.edu/privbrowse/ids/"$1"/privatebrowse.update.rdf --static-args "$2" 

REMOTE_PATH="/home/$REMOTE_USER/"
REMOTE_HOST_FULL="$REMOTE_USER@$REMOTE_HOST"
REMOTE_XPI="$REMOTE_PATH/privbrowse.xpi.$1"
REMOTE_XPI_UPDATE="$REMOTE_PATH/privbrowse.update.rdf.$1"
REMOTE_TARGET="/var/www/privbrowse/ids/$1"

scp -i "$SSH_KEYFILE" privatebrowse.xpi "$REMOTE_HOST_FULL":"$REMOTE_XPI"
scp -i "$SSH_KEYFILE" privatebrowse.update.rdf "$REMOTE_HOST_FULL":"$REMOTE_XPI_UPDATE"
ssh -i "$SSH_KEYFILE" "$REMOTE_HOST_FULL" "cp $REMOTE_XPI $REMOTE_TARGET/privatebrowse.xpi; cp $REMOTE_XPI_UPDATE $REMOTE_TARGET/privatebrowse.update.xpi;"

cd -

