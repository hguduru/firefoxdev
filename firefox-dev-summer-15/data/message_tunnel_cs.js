function setUpPortOn(window_obj, mess){
    self.port.on(mess, function(){
        var args = [window_obj, mess];
        for(var i = 0; i < arguments.length; i ++ ){
            args.push(arguments[i]);
        }
        sendMessageToPage.apply(window_obj, args);
    });
}

function sendMessageToPage(window_obj){
    var message = {
        "type" : "FROM_CONTENT",
        "args" : []
    };
    for(var i = 1; i < arguments.length; i++ ){
        message.args.push(arguments[i]);
    }
    window_obj.document.defaultView.postMessage(message, "*");
}

function listenToPage(window_obj){
    for(var i = 0; i < window_obj.frames.length; i++ ){
        listenToPage(window_obj.frames[i]);
    }
    window_obj.document.defaultView.addEventListener("message", function(event){
        if(event.data.type && event.data.type == "FROM_PAGE"){
            var signal_name = event.data.args[0];
            if(signal_name == "portOn"){
                setUpPortOn(window_obj, event.data.args[1]);
            } else {
                self.port.emit.apply(self.port, event.data.args);
            }
        }
    }, false);
    sendMessageToPage(window_obj, "tunnel-setup");
}
listenToPage(window);
self.port.emit("tunnel-setup");
