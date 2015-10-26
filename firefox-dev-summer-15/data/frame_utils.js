console.log = function(){
    var args = ["console.log"];
    for(var i = 0; i < arguments.length; i++){
        args.push(arguments[i]);
    }
    self.port.emit.apply(self.port, args);
};

var fit_size = (function(){
    var cur_size = -1;
    return function(f, to_size, margin){
        if(margin === undefined)
            margin = 5;
        to_size = to_size || $("body").height() + margin;
        if(to_size == cur_size){
            return;
        }
        cur_size = to_size;
        self.port.emit("resize", f || false, cur_size);
    };
})();

function make_info_bubble(info_text, opts){
    if(!opts){
        opts = {
            "orientation" : "left"
        };
    }
    var div_or_span = !!opts["div"];
    var ans = $(div_or_span ? "<div>" : "<span>", {
        "class" : "value-section"
    }).append($("<i>", {
        "class" : "fa fa-info-circle"
    }), $("<span>", {
        "class" : "info-popup popup-dialog hidden",
        "text" : info_text
    }));
    if(opts.orientation == "right"){
        ans.find("span").css("left", "100%");
    }
    return ans;
}

function TimerCountDown(max_time){
    this.max_time = max_time + 1 || 16;
    this.running_timer = -1;
    this.timeout_state = 0;
    this.events = new EventManager();
};

TimerCountDown.prototype.restart = function(){
    this.timeout_state = 0;
    if(this.running_timer != -1){
        window.clearTimeout(this.running_timer);
    }
    if(!$("body:hover").length){
        this.on_mouse_leave();
    }
};

TimerCountDown.prototype.attach = function(elem){
    var this_obj = this;
    $(elem).mouseenter(function(evt){
        if(this_obj.running_timer != -1){
            window.clearTimeout(this_obj.running_timer);
            this_obj.timeout_state = 0;
            this_obj.events.trigger("timer-clear");
        }
    });

    var on_mouse_leave = function(evt){
        if(this_obj.running_timer != -1){
            window.clearTimeout(this_obj.running_timer);
        }
        if(this_obj.timeout_state == this_obj.max_time){
            this_obj.timeout_state = 0;
            this_obj.events.trigger("done");
        } else {
            this_obj.timeout_state += 1;
            if(this_obj.timeout_state != 1){
                this_obj.events.trigger("new-time", this_obj.max_time - this_obj.timeout_state);
            }
            this_obj.running_timer = window.setTimeout(on_mouse_leave, 1000);
        }
    };

    $(elem).mouseleave(on_mouse_leave);
    this.on_mouse_leave = on_mouse_leave;
};
