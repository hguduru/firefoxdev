// location_listener.js - listens for changes in document location
var { Cc, Ci, Cu, Cr, components } = require("chrome");

var my_tabs = require("./my_tabs.js");
var utils = require("./utils.js");
var persona_choser = require("./persona_choser.js").choser();
var logger = require("./logger.js");
var requests = require("./requests.js");

var { Unknown, Factory, Service } = require("sdk/platform/xpcom");
var { Class } = require('sdk/core/heritage');

const STATE_START = Ci.nsIWebProgressListener.STATE_START;
const STATE_STOP = Ci.nsIWebProgressListener.STATE_STOP;
const STATE_REDIRECT = Ci.nsIWebProgressListener.STATE_REDIRECTING;
const LOAD_INITIAL_DOCUMENT = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;
const LOAD_RETARGET = Ci.nsIChannel.LOAD_RETARGETED_DOCUMENT_URI;
const STATE_DOCUMENT = Ci.nsIWebProgressListener.STATE_IS_DOCUMENT;

function getStoreFromChannel(channel, win, is_starting){
    if(!win){
        return null;
    }
    var tab = utils.xul_tab_for_win(win);
    if(!tab){
        return null;
    }
    var arg = channel;
    if(!is_starting)
        arg = false;
    var store = persona_choser.matchPolicy( channel.URI, tab, arg, win );
    return store;
}
exports.getStoreFromChannel = getStoreFromChannel;

var MyDocumentListener = Class({
    extends : Unknown,
    interfaces : ["nsIWebProgressListener", "nsISupportsWeakReference"],
    onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
        // If you use initialDocumentListener for more than one tab/window, use
        // aWebProgress.DOMWindow to obtain the tab/window which triggers the state change
        var init_doc = true;
        var make_decision = false;

        var thechannel = false;
        try {
            thechannel = aRequest.QueryInterface(Ci.nsIChannel);
            init_doc = ((aRequest.loadFlags & LOAD_INITIAL_DOCUMENT) != 0);
            init_doc &= thechannel.URI.spec.indexOf(".") != -1; // keyword searches
        } catch(e if e.result == Cr.NS_NOINTERFACE) {
            init_doc = false;
        }
        var theDomWin = false;
        try{
            theDomWin = aWebProgress.DOMWindow;
        } catch(e){}

        if(init_doc && theDomWin){
            if(theDomWin.top == theDomWin){
                var theTab = utils.xul_tab_for_win(theDomWin.top);
                if(theTab && ((aFlag & STATE_REDIRECT) != 0)){
                    my_tabs.set_tab_key(theTab, "redirect", true);
                } else if(theTab && ((aFlag & STATE_START) != 0)) {
                    make_decision = true;
                    if(my_tabs.get_tab_key(theTab, "redirect", false)){
                        var prev_url = my_tabs.get_tab_key(theTab, "decision_url", "");
                        make_decision = utils.differentTLD(prev_url, thechannel.URI.spec);
                        my_tabs.set_tab_key(theTab, "redirect", false);
                        logger.redirect(theTab, thechannel.URI.spec);
                    } else {
                        logger.log_request(true, thechannel.URI, false, theDomWin);
                    }
                    if(make_decision){
                        my_tabs.set_tab_key(theTab, "decision", true);
                        my_tabs.set_tab_key(theTab, "decision_url", thechannel.URI.spec);

                    }
                }
            }
        }
    },
    onLocationChange : function(){},
    onProgressChange : function(){},
    onSecurityChange : function(){},
    onStatusChange : function(){}
});

var hist_list = Class({
    extends : Unknown,
    interfaces : ["nsISHistoryListener", "nsISupportsWeakReference"],
    OnHistoryGoBack : function(uri){
        var pid = this.personas[this.history.requestedIndex];
        if(pid == null){
            console.warn("Cannot find history event");
        }
        persona_choser.setPersona(this.tab, pid);
        return true;
    },
    OnHistoryGoForward : function(uri){
        var pid = this.personas[this.history.requestedIndex];
        if(pid == null){
            console.warn("Cannot find history event");
        }
        persona_choser.setPersona(this.tab, pid);
        return true;
    },
    OnHistoryGotoIndex : function(idx, uri){
        var pid = this.personas[this.history.requestedIndex];
        persona_choser.setPersona(this.tab, pid);
        return true;
    },
    OnHistoryNewEntry : function(uri){
        var idx = this.history.index + 1;
        var pid = persona_choser.currentPersona(this.tab);
        this.personas[idx] = pid;

    },
    OnHistoryPurge : function(num){
        return true;
    },
    OnHistoryReload : function(uri, flags){
        return true;
    },
    history : null,
    tab : null,
    browser : null,
    personas : {},
    get wrappedJSObject() this
});

var initialDocumentListenerFact = Factory({
    Component : MyDocumentListener
});

var historyListenerFact = Factory({
    Component : hist_list
});

var initialDocumentListener = components.
        classesByID[initialDocumentListenerFact.id].
        createInstance(Ci.nsIWebProgressListener);

const NOTIFY_ALL = Ci.nsIWebProgress.NOTIFY_ALL;
const MY_NOTIFY = Ci.nsIWebProgress.NOTIFY_STATE_ALL;


function addMyListener(browser, tab){
    browser.addProgressListener(initialDocumentListener, MY_NOTIFY);
    var hl = components.
            classesByID[historyListenerFact.id].
            createInstance(Ci.nsISHistoryListener);
    if(browser.sessionHistory != null){

        hl.wrappedJSObject.history = browser.sessionHistory;
        hl.wrappedJSObject.tab = tab;
        hl.wrappedJSObject.browser = browser;
        browser.sessionHistory.addSHistoryListener(hl);
        browser.billy_my_hl = hl;
    }
}

function removeMyListener(browser){
    try {
        browser.removeProgressListener(initialDocumentListener);
        if(browser.sessionHistory != null){
            browser.sessionHistory.removeSHistoryListener(browser.my_hl);
            delete browser.billy_my_hl;
        }
    } catch(e){
        console.warn("tried double deleting browser listeners");
    }
}

exports.addMyListener = addMyListener;
exports.removeMyListener = removeMyListener;
