if(!("port" in self)){
    var args_to_arr = function(v){
        var ans = [];
        for(var i = 0; i < v.length; i++ ){
            ans.push(v[i]);
        }
        return ans;
    };
    
    var portEmit = function (){
        var message = {
            "type" : "FROM_PAGE",
            "args" : args_to_arr(arguments)
        };
        window.postMessage(message, "*");
    };
    
    var callback_map = {};
    
    var portOn = function (mess, callback){
        callback_map[mess] = callback;
        portEmit("portOn", mess);
    };
    
    var after_tunnel = [];
    
    window.addEventListener("message", function(event){
        if(event.data.type && event.data.type == "FROM_CONTENT"){
            var signal_name = event.data.args[0];
            if(signal_name == "tunnel-setup"){
                if(!tunnel_setup){
                    tunnel_setup = true;
                    after_tunnel.forEach(function(func_args){
                        var is_emit = "emit" in func_args;
                        var func = is_emit ? portEmit : portOn;
                        var args = is_emit ? func_args.emit : func_args.on;
                        func.apply(window, args);
                    });
                }
            }
            if( signal_name in callback_map ){
                callback_map[signal_name].apply(window, event.data.args.slice(1));
            }
        }
    }, false );
    
    var tunnel_setup = false;
    
    window.self.port = {
        emit : function() {
            if(!tunnel_setup){
                after_tunnel.push({"emit" : args_to_arr(arguments)});
            } else {
                portEmit.apply(window, args_to_arr(arguments));
            }
        },
        on : function() {
            if(!tunnel_setup){
                after_tunnel.push({"on" : args_to_arr(arguments)});
            } else {
                portOn.apply(window, args_to_arr(arguments));
            }
        }
    };
}

