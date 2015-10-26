var elems_stored = [];
var newer_state = 0;
var uploading = false;
var can_submit = true;
var callback = null;

function ask_favicon(url, uid){
    self.port.emit("ask-favicon", url, uid);
}

function ask_domain(url, uid){
    self.port.emit("ask-domain", url, uid);
}

function add_day(time){
    var prev_day_date = new Date(time);

    $("#item_area").append($("<div>", {
        "class" : "day-div"
    }).append($("<p>", {
        "text" : moment(prev_day_date).format("dddd, MMMM Do YYYY")
    })));
}

self.port.on("init", function(elems, has_newer, has_older){
    // elems is array of { uid: ID, url: AURL, time : UNIX_TIMESTAMP }
    elems_stored = elems;
    $("#item_area").empty();
    var prev_day = null;
    if(elems.length === 0){
        $("#no-results").removeClass("hidden");
    }
    for(var i = 0; i < elems.length; i++){
        ask_favicon(elems[i].url, elems[i].uid);
        ask_domain(elems[i].url, elems[i].uid);
        var div = $("<div>", {
            "class" : "cb-div",
            "id" : "div-"+elems[i].uid
        });
        if(!prev_day){
            prev_day = elems[i].time;
            add_day(prev_day);
        } else {
            var prev_epoch_days = Math.floor(
                prev_day / (1000 * 60 * 60 * 24));
            var epoch_days = Math.floor(
                elems[i].time / (1000 * 60 * 60 * 24));
            if(epoch_days < prev_epoch_days){
                prev_day = elems[i].time;
                add_day(elems[i].time);
            }
        }

        var the_time = new Date(elems[i].time);
        var domain = elems[i].url;

        div.append($("<input>", {
            "type" : "checkbox",
            "id" : "cb-"+elems[i].uid,
            "class" : "remove-cb"
        }), $("<label>", {
            "class" : "time-lab",
            "text" : moment(elems[i].time).format("h:mm A"),
            "for" : "cb-"+elems[i].uid
        }), $("<span>", {
            "class" : "url-span"
        }).append($("<label>", {
            "class" : "url-lab",
            "for" : "cb-"+elems[i].uid
        }).append($("<a>", {
            "text" : elems[i].url,
            "href" : elems[i].url
        }))), $("<label>", {
            "text" : domain,
            "class" : "url-lab domain-lab",
            "for" : "cb-"+elems[i].uid
        }));
        if("persona" in elems[i]){
            div.append($("<label>", {
                "text" : "persona: "+elems[i].persona,
                "class" : "url-lab",
                "for" : "cb-"+elems[i].uid
            }));
        }
        $("#item_area").append(div);
    }
    if(has_newer){
        $("#newer-link").removeClass("hidden");
    } else {
        $("#newer-link").addClass("hidden");
    }
    if(has_older){
        $("#older-link").removeClass("hidden");
    } else {
        $("#older-link").addClass("hidden");
    }

    if(callback){
        callback();
    }
});

self.port.on("favicon", function(url, uid){
    var fav = (url != null ? $("<img>", {
        "src" : url,
        "class" : "favicon-disp"
    }) : $("<i>", {
        "class" : "fa fa-square-o favicon-disp"
    })).click(function(){
        $("label[for='cb-"+uid+"']:first").click();
    });
    $("#div-"+uid).children(".time-lab").before(fav);
});

self.port.on("domain", function(url, uid){
    $("#div-"+uid).children(".domain-lab").text(url);
});

function checked_items(){
    var removes = [];
    for(var i = 0; i < elems_stored.length; i++){
        var uid = elems_stored[i].uid;
        if($("#cb-"+uid).is(":checked")){
            removes.push(uid);
        }
    }
    return removes;
}

function remove_items(){
    var removes = checked_items();
    console.log("removing", removes, elems_stored);
    self.port.emit("close-me", removes);
}

$("#remove-btn").click(function(){
    remove_items();
});

$("#older-link-a").click(function(){
    elems_stored.forEach(function(elem){
        $("#div-"+elem.uid).remove();
    });
    $(".day-div").remove();
    self.port.emit("older");
});

$("#newer-link-a").click(function(){
    elems_stored.forEach(function(elem){
        $("#div-"+elem.uid).remove();
    });
    $(".day-div").remove();
    self.port.emit("newer");
});

function submit_log(uid){
    if(!can_submit)
        return;
    self.port.emit("dump", uid);
    uploading = true;
    can_submit = false;
    $("#send-results").removeClass("hidden");
}

$("#save-btn").click(function(){
    $(".overlay").removeClass("hidden");
    $("#enter-uid").removeClass("hidden");
});

$("#enter-uid-done").click(function(){
    var uid = $("#enter-uid-input").val();
    if(uid == ""){
        return false;
    } else {
        $("#enter-uid").addClass("hidden");
        submit_log(uid);
    }
});

self.port.on("upload-progress", function(percent){
    $("#prog-bar").css("width", (percent*100) + "%");
    if(percent >= .95){
        $("#send-results-msg").text("Data uploaded. Preparing survey. This may take a few more minutes...");
    }
});

self.port.on("enable_clear_log", function(){
    $("#remove-checked-items-div").after(
        $("<div>").append(
            $("<button>", {
                "text" : "Clear log"
            }).click(function(){
                self.port.emit("clear_log");
                $("#log-cleared").removeClass("hidden");
                $(".overlay").removeClass("hidden");
            })));
});

function user_facing_instruction(reason){
    var message = "Your data was submitted successfully. ";
    if(typeof(reason) === "object"){
        if(reason.text){
            message = reason.text;
        }
    }
    var node = $("<div>", {
        "text" : message,
        "class" : "space-left"
    });
    if(reason.url){
        node.append($("<div>").append($("<a>", {
            text : reason.linktext ? reason.linktext : "Take the survey",
            href : reason.url
        })));
    }

    return node;
}

self.port.on("send_log_resp", function(wassent, reason, clear_log){
    // do something
    if(wassent){
        var node = user_facing_instruction(reason);
        $("#send-results").append(node);
    } else {
        $("#send-results").append($("<div>", {
            "text" : "There was an error submitting your log. " + reason + "Please file a bug report. "
        }));
    }
    uploading = false;
    $("#send-results-progress").addClass("hidden");
});
