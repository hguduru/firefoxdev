var can_submit = true;
var can_resubmit = false;
var mapctrl = null;
var editing_cur_location = false;

var no_locations_text = "You haven't added any locations.";

var per_man = new PersonaManager();

function show_dialog(elem, evt){
    elem.removeClass("hidden")
        .css("left", ($(window).width() - 400)/2);
    evt.stopPropagation();
}

function hide_dialog(elem){
    elem.addClass("hidden");
}

function dialog_is_showing(elem){
    return !elem.hasClass("hidden");
}

function MapControl(named_locations, elem){
    this.named_locations = named_locations;
    this.my_map = null;
    this.all_coords = [];
    this.infowindow = false;
    this.cbmap = {};
    this.cbid = 0;
    var this_obj = this;
    this.adding_pos = false;
    this.needs_classify = false;
    $("#add-location-btn").click(function(evt){
        this_obj.adding_pos = true;
        this_obj.drawer.setDrawingMode(google.maps.drawing.OverlayType.MARKER);
        show_dialog($("#add-location-popup"), evt);
    });
    $("#add-location-popup > i.fa-times").click(function(){
        this_obj.stop_adding();
    });
}

MapControl.prototype.stop_adding = function(){
    hide_dialog($("#add-location-popup"));
    this.adding_pos = false;
    if(this.drawer)
        this.drawer.setDrawingMode(null);
};

MapControl.prototype.update_cur_location = function(coords){
    console.log("update cur location");
    if($("#use-location-data").is(":checked")){
        console.log("make or update map");
        if(this.my_map){
            var my_pos = new google.maps.LatLng(coords.latitude, coords.longitude);
            this.my_pos_marker.setPosition(my_pos);
            this.my_map.panTo(my_pos);
            this.cur_coords = coords;
            $("#location-maps").removeClass("hidden");
        } else if(coords){
            $("#map-control-container").removeClass("hidden");
            $("#map-load-status").addClass("hidden");
            this.init(coords);
            if(this.needs_classify){
                this.classify();
            }
        }
    }
};

MapControl.prototype.set_classify_text = function(text, is_auto_gen){
    if(!is_auto_gen){
        $("#classify-location-name").text(text);
        this.classify_location_name = text;
    } else {
        $("#classify-location-name").text(text);
        this.classify_location_name = text;
        var this_obj = this;
        $("#classify-location-name").append($("<a>", {
            "text" : "(Add this location)",
            "href" : "#"
        }).click(function(){
            this_obj.to_add = {
                "marker" : null,
                "title" : text,
                "coords" : mapctrl.cur_coords,
                "radius" : 100,
                "circle" : null,
                "editing" : false
            };
            self.port.emit("add-location", mapctrl.cur_coords, text);
        }));
    }
};

MapControl.prototype.classify = function(loc){
    console.log("classify", loc);
    if(!loc){
        var this_obj = this;
        if(this.cur_coords){
            this.generate_title(this.cur_coords, function(atitle){
                this_obj.set_classify_text(atitle, true);
            });
        } else {
            this.needs_classify = true;
        }
    } else {
        this.set_classify_text(loc.name);
        this.needs_classify = false;
    }
};

MapControl.prototype.generate_title = function(coords, cb){
    this.cbid++;
    this.cbmap[this.cbid] = cb;
    console.log("coords", coords);
    self.port.emit("generate_name", "latitude" in coords ? {
        "latitude" : coords.latitude,
        "longitude" : coords.longitude
    } : {
        "latitude" : coords.lat(),
        "longitude" : coords.lng()
    }, this.cbid);
};

function color_to_marker(color){
    return "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2%7C"+color;
}

MapControl.prototype.add_circle = function(mrkr, rad_val){
    var circle = new google.maps.Circle({
        map: this.my_map,
        radius: rad_val,
        strokeColor: "green",
        strokeOpacity:0.4,
        strokeWeight: 2,
        fillColor: "green",
        fillOpacity: 0.35
    });
    circle.bindTo('center',mrkr,'position');
    console.log("circle bound");
    return circle;
};

MapControl.prototype.add_marker = function(title, coords, id, rad_val){
    if(this.my_map){
        var pos = new google.maps.LatLng(coords.latitude, coords.longitude);
        var opts = {
            position : pos,
            map : this.my_map,
            title : title,
            icon: color_to_marker("CCCCCC")
        };
        if(id == -1)
            opts.icon = {
                path: google.maps.SymbolPath.CIRCLE,
                strokeColor: "blue",
                scale: 3
            };
        var mrkr = new google.maps.Marker(opts);
        if(rad_val)
            var cir = this.add_circle(mrkr, rad_val);
        this.all_coords.push(pos);
        if(id != -1)
            this.add_menu(title, mrkr, cir, id);
        return mrkr;
    }
    return null;
};

MapControl.prototype.add_menu = function(title, marker, cir, id, begin_editing){
    $("#named-locations-menu > ul > p").remove();
    var this_obj = this;
    var li = $("<li>",{
        "class" : "loc-item"
    });
    var a = $("<a>", {
        "text" : title,
        "href" : "#",
        "id" : "menu-location-id-"+id
    });
    a.click(function(){
        this_obj.my_map.panTo(marker.getPosition());
    });
    var spanbuttons = $("<span>", {
        "class" : "loc-change-btn"
    });
    var edit_btn = $("<button>")
            .html("<i class=\"fa fa-edit\"></i>Edit location");
    var stop_editing = function(){
        $("#editing-"+id).remove();
        cir.setRadius(mapctrl.named_locations[id].radius);
        edit_btn.removeClass("hidden");
        marker.setDraggable(false);
        marker.setIcon(color_to_marker("CCCCCC"));
        li.removeClass("loc-item-edit");
    };
    edit_btn.click(function(){
        edit_btn.addClass("hidden");
        var ip = $("<div>", {
            "class" : "edit-area edit-area-size",
            "id" : "editing-"+id
        });
        var add_lab = function(editingid, value, text){
            var left = $("<span>", {
                "class" : "inputs-span"
            }).append($("<label>", {
                "for" : editingid,
                "text" : text
            }));
            var input_lab = $("<input>", {
                "id" : editingid,
                "type" : "text",
                "value" : value,
                "class" : "editing-input"
            });
            var right = $("<span>", {
                "class" : "inputs-span"
            }).append(input_lab);
            ip.append($("<div>", {
                "class" : "space-top-bot"
            }).append(left, right));
            return input_lab;
        };
        var rem_btn = $("<button>")
                .html("<i class=\"fa fa-trash-o\"></i>Remove location")
                .click(function(evt){
                    confirm_delete_location(this_obj.named_locations[id].name, evt, function(){
                        stop_editing();
                        console.log("handler called");
                        marker.setMap(null);
                        cir.setMap(null);
                        li.remove();
                        delete this_obj.named_locations[id];
                        if(Object.keys(this_obj.named_locations).length == 0){
                            $("#named-locations-menu > ul").prepend($("<p>", {
                                "text" : no_locations_text
                            }));
                        }
                        self.port.emit("remove-location", id);
                    });
                });
        var cancel_btn = $("<button>", {
            "text" : "Cancel"
        }).click(function(){
            stop_editing();
        });
        var done_btn = $("<button>", {
            "text" : "Apply"
        }).click(function(){
            var new_name = $("#editing-in-"+id).val();
            var new_lat = marker.getPosition().lat();
            var new_long = marker.getPosition().lng();
            var new_rad = parseInt($("#editing-rad-"+id).val());
            if(!Number.isNaN(new_rad)){
                self.port.emit("change-rad", id, new_rad);
                mapctrl.named_locations[id].radius = new_rad;
                cir.setRadius(new_rad);
            }
            if(!Number.isNaN(new_lat) && !Number.isNaN(new_long)){
                self.port.emit("move-location", id, {
                    latitude : new_lat,
                    longitude : new_long
                });
                mapctrl.named_locations[id].coords.latitude = new_lat;
                mapctrl.named_locations[id].coords.longitude = new_long;
            }
            mapctrl.named_locations[id].name = new_name;
            self.port.emit("rename-location", id, new_name);
            a.text(new_name);
            console.log("apply editing", new_name);
            stop_editing();
        });
        add_lab( "editing-in-"+id,
                 mapctrl.named_locations[id].name,
                 "Name: ");
        add_lab( "editing-rad-"+id,
                 mapctrl.named_locations[id].radius || 100,
                 "Radius (meters): ")
            .change(function(){
                var radius_pr = parseInt($(this).val());
                if(!Number.isNaN(radius_pr)){
                    cir.setRadius(radius_pr);
                }
            });
        ip.append($("<p>", {
            "text" : "Drag marker to change position",
            "class" : "smaller"
        }), rem_btn, done_btn, cancel_btn);
        marker.setDraggable(true);
        marker.setIcon(color_to_marker("FF0000"));
        li.after(ip);
        li.addClass("loc-item-edit");
    });
    spanbuttons.append( edit_btn );
    li.append(a, spanbuttons);
    $("#add-location-btn").parent().before(li);
    if(begin_editing)
        edit_btn.click();
};

MapControl.prototype.show = function(must_reload){
    $("#location-maps").removeClass("hidden");
    if(!this.my_map){
        $("#map-control-container").addClass("hidden");
        if(must_reload){
            $("#must-reload").removeClass("hidden");
        } else {
            $("#must-reload").addClass("hidden");
            $("#map-load-status").remove("hidden");
        }
    }
};

MapControl.prototype.hide = function(){
    $("#location-maps").addClass("hidden");
};

MapControl.prototype.add_location = function(loc){
    console.log("loc", loc);
    this.add_marker(loc.name, loc.coords, loc.id, loc.radius || 100);
    this.named_locations[loc.id] = loc;
};

MapControl.prototype.view_all = function(){
    if(this.my_map){
        //  Create a new viewpoint bound
        var bounds = new google.maps.LatLngBounds();
        this.all_coords.forEach(function(m){
            bounds.extend(m);
        });
        this.my_map.fitBounds (bounds);
    }
};

MapControl.prototype.init = function(coords){
    if(!coords){
        $("#map-control-container").addClass("hidden");
        $("#map-load-status").removeClass("hidden");
    } else {
        this.cur_coords = coords;
        var my_pos = new google.maps.LatLng(coords.latitude, coords.longitude);
        var mapOptions = {
            center: my_pos,
            zoom : 16,
            minZoom : 2,
            maxZoom : 15
        };
        this.my_map = new google.maps.Map($("#map-container")[0], mapOptions);
        this.my_pos_marker = this.add_marker("Current location", coords, -1);
        for(var loc in this.named_locations){
            var loc_name = this.named_locations[loc].name;
            var loc_coords = this.named_locations[loc].coords;
            this.add_location(this.named_locations[loc]);
        }

        if(Object.keys(this.named_locations).length == 0){
            $("#named-locations-menu > ul").prepend($("<p>", {
                "text" : no_locations_text
            }));
        }

        var drawingManager = new google.maps.drawing.DrawingManager({
            drawingControl: false
        });
        drawingManager.setMap(this.my_map);
        var this_obj = this;
        this.drawer = drawingManager;
        google.maps.event.addListener(drawingManager, "markercomplete", function(mrkr){
            var pos = mrkr.getPosition();
            mrkr.setIcon(color_to_marker("CCCCCC"));
            var cir = this_obj.add_circle(mrkr, 100);
            this_obj.generate_title(pos, function(title){
                mrkr.setTitle(title);
                this_obj.to_add = {
                    "marker" : mrkr,
                    "title" : title,
                    "coords" : {
                        latitude : pos.lat(),
                        longitude : pos.lng()
                    },
                    "circle" : cir,
                    "editing" : true
                };
                self.port.emit("add-location", this_obj.to_add.coords, title);
            });
        });
        this.view_all();
    }
};

var confirmcb = null;

function confirm_delete_location(str, evt, cb){
    $("#confirm-del-name").text(str);
    confirmcb = cb;
    show_dialog($("#confirm-delete"), evt);
}

$(function(){
    $("#confirm-no").click(function(){
        hide_dialog($("#confirm-delete"));
    });
    $("#confirm-yes").click(function(){
        hide_dialog($("#confirm-delete"));
        if(confirmcb){
            confirmcb();
        }
    });
    $("body").click(function(){
        hide_dialog($("#confirm-delete"));
        if(mapctrl){
            mapctrl.stop_adding();
        }
    });
});

function add_persona(ctx){
    var name = ctx.name;
    var opts = {
        text : name,
        value : ctx.id,
        id : "persona_opt"+ctx.id
    };
    $("#default-persona-input").append($("<option>", opts));
    opts["id"] = "persona_opt_2"+ctx.id;
    $("#modify-persona").append($("<option>", opts));
}

per_man.events.on("add", function(ctx){
    add_persona(ctx);
});

per_man.events.on("remove", function(ctx){
    $("#persona_opt"+ctx.id).remove();
    $("#persona_opt_2"+ctx.id).remove();
});

per_man.events.on("change", function(ctx){
    $("#persona_opt"+ctx.id).text(ctx.name);
    $("#persona_opt_2"+ctx.id).text(ctx.name);
});

var orig = null;

self.port.on("update-coord", function(coords){
    if(mapctrl && coords)
        mapctrl.update_cur_location(coords);
});

self.port.on("location-has-been-added", function(id){
    var to_add = mapctrl.to_add;
    mapctrl.named_locations[id] = {
        "coords" : mapctrl.to_add.coords,
        "name" : mapctrl.to_add.title,
        "id" : id,
        "circle" : mapctrl.to_add.circle,
        "radius" : 100
    };
    if(!to_add.marker && !to_add.circle){
        mapctrl.add_marker(to_add.title, to_add.coords, id, to_add.radius);
    } else {
        mapctrl.add_menu(to_add.title, to_add.marker, to_add.circle, id, to_add.editing);
    }
});

self.port.on("location-name-changed", function(new_loc){
    if(mapctrl)
        mapctrl.classify(new_loc);
    orig.cur_loc = new_loc;
});

self.port.on("added-location", function(loc){
    if((!mapctrl.to_add || loc.name != mapctrl.to_add.title) && !(loc.id in mapctrl.named_locations)){
        mapctrl.add_location(loc);
    }
});

self.port.on("populate", function(opts){
    $("#addon-version").text(opts["addon_version"]);
    $("option[value=\""+opts.defPersona+"\"]").prop("selected", true);
    $("#ask-persona-input").prop("checked", opts.ask);
    $("#use-location-data").prop("checked", opts.use_location);
    $("#ask-persona-conflict").prop("checked", opts.dont_ask_in_conflict);
    $("#default_selected").prop("checked", opts.default_selected);
    orig = opts;
    mapctrl = new MapControl(opts.named_locations);
    if(opts.use_location){
        mapctrl.init(opts.cur_coords);
        mapctrl.classify(opts.cur_loc);
    } else {
        mapctrl.hide();
    }
});

function is_same(){
    if(orig.ask == $("#ask-persona-input").is(":checked") &&
       orig.defPersona == $("#default-persona-input").val() &&
       orig.use_location == $("#use-location-data").is(":checked") &&
       orig.dont_ask_in_conflict == $("#ask-persona-conflict").is(":checked")
      ){
          $("#save-cancel").addClass("hidden");
      } else {
          $("#save-cancel").removeClass("hidden");
      }
}

$(function(){
    $("#save-cancel").addClass("hidden");
    // $(".gen-setting").change(is_same);
    $("#default-persona-input").change(function(){
        self.port.emit("default-changed", $("#default-persona-input").val() );
        orig.defPersona = $("#default-persona-input").val();
    });
    $("#ask-persona-input").change(function(){
        self.port.emit("ask-for-persona", $("#ask-persona-input").is(":checked"));
        orig.ask = $("#ask-persona-input").is(":checked");
    });
    $("#use-location-data").change(function(){
        self.port.emit("use-location", $("#use-location-data").is(":checked"));
        orig.use_location = $("#use-location-data").is(":checked");
        if(orig.use_location)
            mapctrl.show();
    });
    $("#ask-persona-conflict").change(function(){
        self.port.emit("dont-ask-in-conflict", $("#ask-persona-conflict").is(":checked"));
    });

    // $("#save-prefs").click(function(){

    //     self.port.emit("turn_off_on_exit", false);
    //     $("#save-cancel").addClass("hidden");
    // });
    $("#use-location-data").change(function(){
        if($("#use-location-data").is(":checked")){
            mapctrl.show(!orig.use_location);
        } else {
            mapctrl.hide();
        }
    });

    // $("#cancel-prefs").click(function(){
    //     $("#ask-persona-input").prop("checked", orig.ask);
    //     $("#default-persona-input").val(orig.defPersona);
    //     $("#save-cancel").addClass("hidden");
    //     $("#use-location-data").prop("checked", orig.use_location).change();
    // });
    $("#modify-persona-btn").click(function(){
        self.port.emit("modify-persona",
                       $("#modify-persona option:selected").val());
    });
    $("#new-persona-btn").click(function(){
        self.port.emit("new-persona");
    });
    $("#dump-btn").click(function(){
        self.port.emit("dump-log");
    });
    $("#remove_btn").click(function(){
        self.port.emit("remove-log");
    });
    var showing_submit = false;

    $("#rep-bug").click(function(){
        if(!showing_submit){
            $(".bug-desc-div").removeClass("hidden");
            showing_submit = true;
        } else if(can_resubmit) {
            $("#submitted-info").addClass("hidden").text("");
            $("#bug-desc").removeClass("hidden");
            $("#result-title").addClass("hidden");
            $("#description-title").removeClass("hidden");
            $(".bug-submit-div").removeClass("hidden");
            $(".bug-include-config").removeClass("hidden");
            can_submit = true;
            can_resubmit = false;
            $("#bug-desc").val("");
        }
    });

    $("#bug-submit").click(function(){
        if(!can_submit)
            return;
        can_submit = false;
        $(".bug-submit-div").addClass("hidden");
        var desc = $("#bug-desc").val();
        $("#bug-desc").addClass("hidden");
        $(".bug-include-config").addClass("hidden");
        $("#submitted-info").removeClass("hidden").text(desc);
        $("#submitting-title").removeClass("hidden");
        $("#description-title").addClass("hidden");
        self.port.emit("report-bug", desc, $("#include-configuration").is(":checked"));
    });

    $("#default_selected").change(function(){
        self.port.emit("default_selected", $("#default_selected").is(":checked"));
    });

    $("#cancel-report-btn").click(function(){
        $(".bug-desc-div").addClass("hidden");
        showing_submit = false;
    });

    $("#group-interface-btn").click(function(){
        self.port.emit("grouping-interface");
    });
});


self.port.on("bug-submitted", function(completed){
    $("#result-title").removeClass("hidden");
    $("#submitting-title").addClass("hidden");
    if(completed) {
        $("#result-title").text("Bug report submitted. Thanks for your feedback, we will try to get to it as soon as possible!");
        $("#result-title").addClass("bug-success");
    } else {
        $("#result-title").html("Error submitting bug report. Sorry about that. Could you send an email to <a href=\"mailto:private-modes@ece.cmu.edu\">private-modes@ece.cmu.edu</a>");
        $("#result-title").addClass("bug-error");
    }
    can_resubmit = true;
});

self.port.on("name-generated", function(id, name){
    mapctrl.cbmap[id](name);
    delete mapctrl.cbmap[id];
});

self.port.on("location-rename", function(loc){
    if(mapctrl){
        mapctrl.named_locations[loc.id].name = loc.name;
        $("#menu-location-id-"+loc.id).text(loc.name);
    }
});
