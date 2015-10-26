// message_tunnel_side.js - sends messages to content scripts or xul iframes
var EventManager = require("./event_manager.js").EventManager;

function Messager(window_obj){
    this.win = window_obj;
    this.pending_mess = [];
    this.events = new EventManager();
    this.tunnel_setup = false;

    this.on_message("console.log", console.log);
}

Messager.prototype.on_message = function(type, fun){
    this.events.on(type, fun);
};

Messager.prototype.send_message = function(){
    var window_obj = this.win;
    var this_args = [];
    var message = {
        "type" : "FROM_CONTENT"
    };
    for(var i = 0; i < arguments.length; i++ ){
        this_args.push(arguments[i]);
    }
    message["args"] = this_args;
    if(this.tunnel_setup){
        window_obj.document.defaultView.postMessage(message, "*");
    } else {
        this.pending_mess.push(message);
    }
};

function listenToPage(messager){
    var window_obj = messager.win;
    for(var i = 0; i < window_obj.frames.length; i++ ){
        listenToPage(window_obj.frames[i]);
    }
    window_obj.document.defaultView.addEventListener("message", function(event){
        if(event.data.type && event.data.type == "FROM_PAGE"){
            messager.events.trigger.apply(messager.events, event.data.args);
        }
    }, false);
    messager.tunnel_setup = true;
    messager.send_message("tunnel-setup");
    for(var i = 0; i < messager.pending_mess.length; i++){
        try {
            window_obj.document.defaultView.postMessage(messager.pending_mess[i], "*");
        } catch (e){
            console.warn("pendingmessager err", messager.pending_mess[i], e.toString());
        }
    }
    messager.pending_mess = [];
}

exports.attach = function(win, eventGiver){
    var ans = new Messager(win);
    if(win.document.readyState == "complete"){
        listenToPage(ans);
    } else {
        eventGiver.addEventListener("DOMContentLoaded", function domList(){
            listenToPage(ans);
            win.removeEventListener("DOMContentLoaded", domList);
        }, false);
    }
    eventGiver.messager = ans;
    return ans;
};
