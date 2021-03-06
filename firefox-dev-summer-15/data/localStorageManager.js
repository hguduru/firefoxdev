var myStorage =
        window.wrappedJSObject.storageManager123pleasedontoverwriteme;
function initStorage(storage){

    var MyStorageItem = function(storage_type){
        var oStorage = {};
        var getItemProxy = function (sKey) {
            try {
                // var make_key = "__" + myContext + "__" + sKey;
                // return prev_storage.getItem(make_key);

                return storage.html5_op(JSON.stringify({
                    "op" : "get",
                    "type" : storage_type,
                    "key" : sKey
                }));
            } catch(e){
                console.log("getItemProxy", "failed", e);
                return undefined;
            }
        };

        var keyProxy = function (nKeyId) {
            try {
                // var keys = Object.keys(prev_storage);
                // var ans =
                //         keys.filter(matches_storage)[nKeyId];
                // return transform_key(ans);
                return storage.html5_op(JSON.stringify({
                    "op" : "key",
                    "key" : nKeyId,
                    "type" : storage_type
                }));
            } catch(e){
                console.log("getKeyProxy", "failed", e);
                return undefined;
            }
        };

        var setItemProxy = function (sKey, sValue) {
            if(!sKey) {
                return;
            }
            oStorage[sKey] = sValue;
            var arg = {
                "op" : "set",
                "type" : storage_type,
                "key" : sKey,
                "value" : sValue
            };
            try {
                // prev_storage.setItem("__" + myContext + "__" +
                //                      sKey, sValue);
                storage.html5_op(JSON.stringify(arg));
            } catch(e){
                console.log("setItemProxy", "failed", e);
            }
        };

        var removeItemProxy = function (sKey) {
            if(!sKey) { return; }
            try {
                // prev_storage.remove("__" + myContext + "__" + sKey);
                storage.html5_op(JSON.stringify({
                    "op" : "remove",
                    "type" : storage_type,
                    "key" : sKey
                }));
            } catch(e){
                console.log("removeItemProxy", "failed", e);
            }
        };

        var clearProxy = function(){
            // prev_storage.clear();
            storage.html5_op(JSON.stringify({
                "op" : "clear",
                "type" : storage_type
            }));
        };

        var props = [
            ["getItem", getItemProxy],
            ["setItem", setItemProxy],
            ["key", keyProxy],
            ["removeItem", removeItemProxy],
            ["clear", clearProxy]
        ];

        for(var i = 0; i < props.length; i++) {
            var propName = props[i][0];
            var propValue = props[i][1];
            var wrapObj = oStorage.wrappedJSObject ?
                    oStorage.wrappedJSObject :
                    oStorage;
            Object.defineProperty(wrapObj, propName, {
                value : propValue,
                writable: true,
                configurable: true,
                enumerable: false
            });
        }

        Object.defineProperty(this, "get", {
            value : function(){
                return oStorage;
            },
            writable: true,
            configurable: true,
            enumerable: false
        });

        this.configurable = true;
        this.writeable = true;
        this.enumerable = false;
    };

    Object.defineProperty(window.wrappedJSObject, "localStorage",
                          new MyStorageItem("localStorage"));
    Object.defineProperty(window.wrappedJSObject, "sessionStorage",
                          new MyStorageItem("sessionStorage"));
}

function initDocCookie(obj, storage){
    try {
        Object.defineProperty(obj, "cookie", new (function(){
            Object.defineProperty(this, "get", {
                value : function() {
                    try {
                        return storage.getcookie();
                    } catch(e){
                        return "";
                    }
                },
                configurable : true,
                writable : true,
                enumerable : false
            });
            Object.defineProperty(this, "set", {
                value : function(new_cookie){
                    try {
                        storage.setcookie(JSON.stringify(new_cookie));
                    } catch(e){}
                    return new_cookie;
                },
                writable: true,
                configurable: true,
                enumerable: false
            });
            this.configurable = true;
            this.writeable = true;
            this.enumerable = false;
        })());
    } catch(e){
        console.error("error setting cookie", e.toString(), window.location.toString());
        console.log("F F F FFF     FF F F F F");
    }
}

if(myStorage){
    initStorage(myStorage);
    initDocCookie(window.document.wrappedJSObject, myStorage);
} else {
    console.log("myStorage null", window.content.location.toString());
}

// delete window.wrappedJSObject.storageManager; // cleanup
