// persona_choser.js - algorithm for deciding which persona to be in for each
// webpage or request

var events = require("./event_manager.js").global_events;

var DecisionTree = require("./decision-tree.js").DecisionTree;

function PersonaChoser(){
    this.default_persona = 0;
    this.ask_for_persona = false;
    this.dont_ask_in_conflict = false;
    this.default_selected_flag = false;
    return this;
}

// maybe make this not a singleton later...
var choser_singleton = new PersonaChoser();
exports.choser = function(){
    return choser_singleton;
};

var storage = require("./storage.js");
var my_tabs = require("./my_tabs.js");
var logger = require("./logger.js");
var utils = require("./utils.js");
var ui = require("./ui.js");
var policy = require("./policy_matcher.js");

var persona_manager = require("./persona_manager.js").manager();

PersonaChoser.prototype.load = function(){
    this.default_persona = storage.read_json("default_persona", function(){
        return 0;
    });
    this.ask_for_persona = storage.read_json("ask_for_persona_opt", function(){
        return false;
    });
    this.dont_ask_in_conflict = storage.read_json("ask_on_conflict", function(){
        return false;
    });
    this.default_selected_flag = storage.read_json("default_selected_flag", function(){
        return false;
    });

    var thisobj = this;
    this.ondeleted = function(event){
        if(event.subject.type == "delete"){
            thisobj.onDelete(event.target);
        }
    };

    events.on("persona-changed", this.ondeleted);
};

PersonaChoser.prototype.unload = function(){
    events.off("persona-changed", this.ondeleted);
};

PersonaChoser.prototype.onDelete = function(apersona){
    var default_persona = this.defaultPersona();
    var open_tabs = my_tabs.tabs();
    for(var j = 0; j < open_tabs.length; j++){
        var tab = open_tabs[j];
        var tabPersona = this.currentPersona(tab);
        if(tabPersona.id == apersona.id){
            this.setPersona(tab, default_persona);
            my_tabs.reload(tab);
        }
    }
};

PersonaChoser.prototype.setPersona = function(tab, other_persona){
    my_tabs.set_tab_key(tab, "persona", other_persona);
    my_tabs.set_tab_key(tab, "active_persona", other_persona);
    events.emit("tab-persona-changed", {
        subject : { "tab" : tab }
    });
    return this.currentPersona(tab);
    // if(my_tabs.is_active(tab)){
    //     navbar.set_tool_tip(other_persona.reason);
    // }
};

PersonaChoser.prototype.currentPersona = function(tab, ignore_active){
    var ans = null;
    tab = tab ? tab : my_tabs.active_tab();
    ans = my_tabs.get_tab_key(tab, "persona");
    var active_ans = my_tabs.get_tab_key(tab, "active_persona", null);
    if(active_ans !== null && !ignore_active){
        ans = active_ans;
    }
    if(ans == null){
        my_tabs.set_tab_key(tab, "persona", this.defaultPersona());
        ans = my_tabs.get_tab_key(tab, "persona");
    }
    return ans;
};


PersonaChoser.prototype.defaultPersona = function(val){
    if(arguments.length == 1){
        this.default_persona = val;
        return this.default_persona;
    } else {
        return this.default_persona;
    }
};

PersonaChoser.prototype.inheritPersona = function(tab, other_persona, url){
    if(!other_persona)
        return null;
    var ans = this.setPersona(tab, other_persona);
    my_tabs.set_tab_key(tab, "inherit", url);
    logger.add_persona_config({ "id" : other_persona.getId(),
                                "url" : url,
                                "type" : "inherit" });
    return ans;
};

PersonaChoser.prototype.askForPersona = function(val){
    if(arguments.length == 1){
        this.ask_for_persona = val;
        return this.ask_for_persona;
    } else {
        return this.ask_for_persona;
    }
};

PersonaChoser.prototype.dontAskInConflict = function(val){
    if(arguments.length == 1){
        this.dont_ask_in_conflict = val;
        return this.dont_ask_in_conflict;
    } else {
        return this.dont_ask_in_conflict;
    }
};

PersonaChoser.prototype.defaultSelectedFlag = function(val){
    if(arguments.length == 1){
        this.default_selected_flag = val;
        events.emit("privbrowse-default-selected", {
            subject : val
        });
    }
    return this.default_selected_flag;
};

PersonaChoser.prototype.decisionInput = function(url, tab, channel, domwin){
    var normal_host = utils.normalize_host(url);
    var full_host = utils.normalize_host(url, true);
    var currPersona = this.currentPersona(tab);

    return {
        "tab" : tab,
        "url" : url,
        "domwin" : domwin,
        "normal_host" : normal_host,
        "full_host" : full_host,
        "choser" : this,
        "channel" : channel,
        "currentPersona" : currPersona
    };
};

var noDecisionNode = new DecisionTree().init();

var makeDecisionNode = new DecisionTree().init();

noDecisionNode.addCondition(
    function(input){
        var decision_url = my_tabs.get_tab_key(input.tab,
                                               "decision_url",
                                               "");
        var make_decision = !!input.channel &&
                my_tabs.get_tab_key(input.tab, "decision");
        if(!!input.channel)
            make_decision &= input.channel.URI.spec == decision_url;
        var normal_host = input.normal_host;
        return make_decision && normal_host.indexOf("about:") != 0;
    },
    function(input){
        var ans = makeDecisionNode.evaluate(input);
        my_tabs.set_tab_key(input.tab, "persona-orig-uri",
                            input.channel.originalURI.spec);
        my_tabs.set_tab_key(input.tab, "decision", false);
        my_tabs.set_tab_key(input.tab, "active_persona", ans);
        events.emit("tab-persona-changed", { subject : {
            "tab" : input.tab
        }});
        return ans;
    }
);

noDecisionNode.addCondition(
    true,
    function(input){
        var persona_id = input.choser.currentPersona(input.tab, false);
        return persona_id;
    }
);

makeDecisionNode.addCondition(
    function(input){
        return !!input.domwin.opener;
    },
    function(input){
        var other_tab = utils.xul_tab_for_win(input.domwin.opener.top);
        var persona_id = this.currentPersona(other_tab);
        return persona_id;
    }
);

makeDecisionNode.addCondition(
    function(input){
        var curPer = persona_manager.getPersona(input.currentPersona);
        return curPer.isSoftAccept(input.normal_host);
    },
    function(input){
        return input.currentPersona;
    }
);

makeDecisionNode.addCondition(
    function(input){
        var user_selected_obj = my_tabs.get_tab_key(input.tab,
                                                    "user_selected",
                                                    false);
        var user_selected = user_selected_obj.id;
        var user_selected_url = user_selected_obj.url;
        var ans = user_selected_obj !== false &&
                (!utils.differentTLD(user_selected_url, input.url.spec) );
        if(ans)
            this.user_selected_obj = user_selected_obj;
        return ans;
    },
    function(input){
        var user_selected_obj = this.user_selected_obj;
        var user_selected = user_selected_obj.id;
        var user_selected_url = user_selected_obj.url;
        my_tabs.set_tab_key(input.tab, "user_selected",
                            {"id" : user_selected,
                             "url" : input.url.spec });
        var ask_again = my_tabs.get_tab_key(input.tab, "ask_again",
                                            false);
        if(ask_again){
            my_tabs.set_tab_key(input.tab, "ask_again", false);
            ui.show_ask_panel(input.tab, {
                "host" : input.normal_host,
                "full_host" : input.full_host,
                "ask_again" : true,
                "switch_to" : true
            });
        }
        var otherpersona = persona_manager.getPersona(user_selected);
        otherpersona.addSoft(input.normal_host);
        return user_selected;
    }
);

var defaultDecisionNode = new DecisionTree().init();

makeDecisionNode.addCondition(
    true,
    function(input){
        return defaultDecisionNode.evaluate(input);
    }
);

defaultDecisionNode.addCondition(
    function(input){
        var policy_match = policy.policy_matcher(input.url) || [];
        var ans = !!policy_match.length;
        if(ans){
            this.policy_match = policy_match;
        }
        return ans;
    },
    function(input){
        return this.policy_match[0];
    }
);

defaultDecisionNode.addCondition(
    true,
    function(input){
        var ans = input.choser.defaultPersona();
        if(utils.should_save_data(input.domwin)){
            events.emit("persona-unconfigured-item", {
                "subject" : {
                    "host" : input.normal_host,
                    "full_host" : input.full_host,
                    "visited" : utils.domain_visited(input.url)
                }
            });
        }
        return ans;
    }
);

PersonaChoser.prototype.matchPolicy = function(url, tab, channel,
                                               domwin){
    var decInput = this.decisionInput(url, tab, channel, domwin);
    var persona_id = noDecisionNode.evaluate(decInput);
    return persona_manager.getPersona(persona_id);
};
