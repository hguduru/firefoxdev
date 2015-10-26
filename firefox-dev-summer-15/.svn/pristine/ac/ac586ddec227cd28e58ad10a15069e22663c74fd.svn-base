var first = false;
function make_view(decision){
    var item;
    if(decision.type == "cookie_permission"){
        item = $("<div>", {
            "class" : "decision_block"
        });
        if(first){
            item.toggleClass("decision_block_top");
        } else {
            item.toggleClass("decision_block_normal");
        }
        var expiration = decision.cookie.expiration_date;
        var exp_str = "";
        if(expiration == null){
            exp_str = "end of session";
        } else {
            exp_str = "" + new Date(expiration).toLocaleFormat();
        }
        item.append( $("<p>", {
            text : decision.cookie.rawHost + " wants to set a cookie: "
        }), $("<p>", {
            text : "name: " + decision.cookie.name,
            "class": "cookie_elements"
        }), $("<p>", {
            text : "value: " + decision.cookie.value,
            "class": "cookie_elements"
        }));
        var last_p = $("<p>", {
            text : "expiration: " + exp_str
        });
        item.append(last_p);
        var remove_this = function(){
            item.remove();
            $("#dec-place")
                .children()
                .first()
                .toggleClass("decision_block_normal decision_block_top");
        };
        last_p.append( $("<button>", {
            "text" : "Dismiss",
            "class" : "cookieDecision"
        }).click(function(){
            remove_this();
            self.port.emit("more_decisions", [{
                "id" : decision.id,
                "action" : "dismiss"
            }]);
        })).append( $("<button>", {
            "text" : "Accept",
            "class" : "cookieDecision"
        }).click(function(){
            remove_this();
            self.port.emit("more_decisions", [{
                "id" : decision.id,
                "action" : "accept"
            }]);
        }));
    }
    return item;
}

function add_new_views(decs){
    decs.forEach(function(dec){
        var decision_view = make_view(dec);
        $("#dec-place").append(decision_view);
        first = false;
    });
}

self.port.on("init", function(name, decisions){
    $("#dec-place").empty();
    first = true;
    add_new_views(decisions);
    self.port.emit("resize", 500, $(window).height());
});

self.port.on("new_decision", add_new_views);
