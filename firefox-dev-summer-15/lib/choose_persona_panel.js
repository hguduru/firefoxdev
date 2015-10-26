// choose_persona_panel.js - popup panel to select a persona
var data = require("sdk/self").data;

var events = require("./event_manager.js").global_events;
var policy = require("./policy_matcher.js");

var persona_manager = require("./persona_manager.js").manager();
var persona_choser = require("./persona_choser.js").choser();
var alexa = require("./alexa-wrapper").alexa_module;

var my_tabs = require("./my_tabs.js");
var my_panel = require("./my_panel.js");
var new_ctx_panel = require("./new_context_panel.js");
var ui = require("./ui.js");
var logger = require("./logger.js");
var utils = require("./utils.js");
var locations = require("./locations.js");
var cookie_db = require("./cookie_db.js");

var UIElement = require("./ui_element.js").UIElement;

var choose_persona_panel = (function(){
    var ans;
    var command_list = {
        "change-persona" : function(per, ask_again, opts){
            var log_things = {
                "opts" : opts,
                "per" : per,
                "ask_again" : ask_again,
                "type" : "choose-panel"
            };
            logger.add_persona_config(log_things);

            var aPersona = persona_manager.getPersona(per);
            if(Object.keys(opts).length != 0 && !ask_again){
                if("conflict" in opts){
                    aPersona.conflict_priority += 1;
                } else if(opts.location == -1){
                    locations.generate_name(function(name){
                        var cur_id = locations.assign_name_to_cur_loc(name);
                        opts.location = cur_id;
                        policy.remember_policy(opts, aPersona);
                    });
                } else {
                    policy.remember_policy(opts, aPersona);
                }
            }
            var tab = my_tabs.active_tab();
            if(opts.migrate && ask_again){
                var per_ctx = aPersona.get_context();
                cookie_db.do_migrate(per_ctx.cookies);
            }
            if(ask_again){
                my_tabs.set_tab_key(tab, "ask_again", true);
                my_tabs.set_tab_key(tab, "user_selected",
                                    {id : aPersona.id,
                                     url : my_tabs.active_url() });
                my_tabs.reload(tab);
            }
        },
        "use-new-persona" : function (host, ask_again, opts){
            var new_name = host;
            var pre_populate = {
                "name" : new_name
            };
            new_ctx_panel.new_context_panel_init(null, pre_populate, function(actx){
                var tab = my_tabs.active_tab();
                if(opts.migrate && ask_again){
                    var per_ctx = actx.getContext();
                    cookie_db.do_migrate(per_ctx.cookies);
                }
                if(ask_again){
                    my_tabs.set_tab_key(tab, "ask_again", true);
                }
            });
        },
        "stay-this-time" : function (host, per_id){
            var aPersona = persona_manager.getPersona(per_id);
            aPersona.addSoft(host);
        },
        "is-used" : function(loc_name){
            var used = locations.location_names().indexOf(loc_name) != -1;
            ans.messager().send_message("is-used-resp", used);
        },
        "name-cur-loc" : function(name){
            locations.assign_name_to_cur_loc(name);
        }
    };

    var onshow = function(thepanel, opts){
        if(persona_choser.askForPersona()){
            return false;
        }
        var host = opts.host ||
                utils.normalize_host(my_tabs.active_url());
        var full_host = opts.full_host ||
                utils.normalize_host(my_tabs.active_url(), true);
        var tab = my_tabs.active_tab();
        var win = tab.ownerDocument.defaultView;
        var real_uri = win.gBrowser.webNavigation.document.documentURI;
        if(real_uri.indexOf("about:neterror") == 0){
            if(opts.not_visited){
                utils.unremember_visited(host);
            }
            return false;
        }
        var ask_again = opts.ask_again;
        var category = opts.category || alexa.get_category(host);
        if(host.indexOf("about:") == 0){
            return false;
        }
        var access_host;
        try {
            var url = utils.url_from_string(my_tabs.active_url());
            access_host = url.host;
        } catch(e){
            access_host = "";
        }
        if(access_host.indexOf("www") == 0)
            access_host = access_host.substring(access_host.indexOf(".")+1);
        var access_info = new cookie_db.CookieAccessInfo(access_host,"/",true,false);
        // var migrate_cookies = cookie_db.getCookies(access_info, -1, true);
        // var can_migrate = migrate_cookies.length != 0;
        var can_migrate = false;

        var current_persona_id = persona_choser.currentPersona();
        thepanel.messager.send_message("current-persona", current_persona_id);
        thepanel.messager.send_message( "personas", {
            "host" : host,
            "full_host" : full_host,
            "ask_again" : ask_again,
            "category" : category,
            "switch_to" : opts.switch_to,
            "can_migrate" : can_migrate,
            "conflict" : opts.conflict,
            "conflict_personas" : opts.conflict_personas || [],
            "soft_other" : opts.soft_other || false,
            "other_pids" : opts.other_pids || false
        });
        return true;
    };


    var added_location = function (event){
        ans.messager().send_message("add-location", event.subject);
    };

    var location_name_changed = function (event){
        ans.messager().send_message("location-name-change", event.subject);
    };

    var delete_location = function (event){
        ans.messager().send_message("delete-location", event.subject);
    };

    var default_selected_changed = function (event){
        ans.messager().send_message("default_selected", !!event.subject);
    };

    var onloadhook = function(thepanel){
        events.on("privbrowse-added-location", added_location);
        events.on("privbrowse-location-delete", delete_location);
        events.on("privbrowse-location-rename", location_name_changed);
        events.on("privbrowse-default-selected", default_selected_changed);
        
        thepanel.resize_width(375);
    };

    var onunloadhook = function(thepanel){
        events.off("privbrowse-added-location", added_location);
        events.off("privbrowse-location-delete", delete_location);
        events.off("privbrowse-location-rename", location_name_changed);
        events.off("privbrowse-default-selected", default_selected_changed);
    };

    var options = {
        commands : command_list,
        src : data.url("choose_persona.html"),
        id : "persona-panel",
        onattach : function(pan){
            var messager = pan.messager;
            messager.send_message("init-cats", alexa.all_categories());
            messager.send_message("default_selected",
                                  persona_choser.defaultSelectedFlag());
        },
        use_persona_manager : true,
        onshow : onshow,
        onloadhook : onloadhook,
        onunloadhook : onunloadhook
    };
    ans = new UIElement(options);
    return ans;
})();
exports.choose_persona_panel = choose_persona_panel;
