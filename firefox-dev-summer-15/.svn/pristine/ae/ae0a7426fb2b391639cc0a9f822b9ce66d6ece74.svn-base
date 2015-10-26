// my_panel.js - wrapper for FF libraries for panels
var timers = require("sdk/timers");

var my_tabs = require("./my_tabs.js");
var message_tunnel = require("./message_tunnel_side.js");
var navbar = require("./navbar-widget.js");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

function MultiWindowMessager (){
    this.children = {};
    this.mmap = {};
    this.temp_messager = false;
    this.id_ctr = 0;
};

MultiWindowMessager.prototype.remove = function(id){
    delete this.children[id];
};

MultiWindowMessager.prototype.add = function(messager){
    this.id_ctr ++;
    var id = this.id_ctr;
    this.children[id] = messager;
    for(var key in this.mmap){
        messager.on_message(key, this.mmap[key]);
    }
    return id;
};

MultiWindowMessager.prototype.send_message = function(key){
    var args = [];
    for(var i = 1; i < arguments.length; i++){
        args.push(arguments[i]);
    }
    if(this.temp_messager){
        this.temp_messager.send_message.apply(this.temp_messager,
                                              [key].concat(args));
    } else {
        for(var id in this.children){
            this.children[id].send_message.apply(this.children[id],
                                                 [key].concat(args));
        }
    }
};

MultiWindowMessager.prototype.on_message = function(key, cb){
    this.mmap[key] = cb;
    for(var id in this.children){
        this.children[id].on_message(key, cb);
    }
};

var ids_added = [];

function XulPanel(opts){
    this.src = opts.src;
    this.id = opts.id;
    ids_added.push(this.id);
    this.on_attach = opts.on_attach;
    this.messager = new MultiWindowMessager();
    if(opts.width){
        this.width = opts.width;
    }
}

XulPanel.prototype.make_panel = function(doc){
    var ans = doc.createElementNS(XUL_NS, "panel");
    ans.setAttribute("id", this.id);
    ans.setAttribute("type", "arrow");
    ans.setAttribute("flip", "both");
    ans.setAttribute("position", "after_end");

    ans.addEventListener("popuphiding", function popuphidinglist(event){
        var f = popuphidinglist;
        var prevented = false;
        for(var i = 0; i < 8; i++){
            try {
                f = f.caller;
            } catch(e) {
                break;
            }
            if(f == null){
                break;
            }
            if(f.name == "onxbltransitionend"){
                event.preventDefault();
                prevented = true;
            }
        }
    });

    var frame = doc.createElementNS(XUL_NS, "iframe");
    frame.setAttribute("type", "content");
    frame.setAttribute("src", this.src);
    frame.setAttribute("flex", 1);
    frame.setAttribute("transparent", "transparent");

    frame.style.borderRadius = "6px";
    frame.style.padding = "1px";
    frame.style.width = 300 + "px";
    frame.setAttribute("type", "content");
    ans.appendChild(frame);
    doc.getElementById("mainPopupSet").appendChild(ans);
    ["panel-inner-arrowcontent", "panel-arrowcontent"].forEach(function(value) {
        let node = doc.getAnonymousElementByAttribute(ans, "class", value);
        if (node) {
            node.style.padding = 0;
        }
    });
    var messager = message_tunnel.attach(ans.firstChild.contentWindow, ans);
    var messager_id =this.messager.add(messager);

    var this_obj = this;
    ans.addEventListener("unload", function unloadListener(){
        ans.removeEventListener(unloadListener);
        this_obj.messager.remove(this_obj.id);
    });
    this.messager.temp_messager = messager;
    if(this.on_attach){
        this.on_attach(this);
    }
    this.messager.temp_messager = false;
    var this_messager = this.messager;
    doc.defaultView.addEventListener("unload", function my_panel_unload(evnt){
        doc.defaultView.removeEventListener("unload", my_panel_unload);
        this_messager.remove(messager_id);
    });
    if(this.width){
        ans.firstChild.style.width = this.width + "px";
    }
    return ans;
};

XulPanel.prototype.get_panel = function(win){
    if(!win)
        win = my_tabs.active_window();
    var ans = win.document.getElementById(this.id);
    if(!ans){
        ans = this.make_panel(win.document);
    }
    return ans;
};

XulPanel.prototype.show = function(anchor, xoff, yoff){
    var win = my_tabs.active_window();
    var pan = this.get_panel(win);
    if(!anchor){
        anchor = win.document.getElementById(navbar.get_navbar_id(win));
        var window_nodes = win.document.getElementsByTagName("window");
        if(!anchor ||
           (window_nodes.length &&
            (window_nodes[0].getAttribute("chromehidden")
             .indexOf("menubar") != -1)))
            return;
    }
    if(!xoff)
        xoff = -8;
    if(!yoff)
        yoff = 0;
    pan.openPopup(anchor, "after_end", xoff, yoff, false, false);
};

XulPanel.prototype.hide = function(){
    var pan = this.get_panel();
    pan.hidePopup();
};

XulPanel.prototype.resize_height = function(height, animate){
    var prev_class = "";
    var dom_elem = this.get_panel();
    // if(animate){
    //     dom_elem.setAttribute("class", "heighttrans");
    // } else {
    //     dom_elem.setAttribute("class", "");
    // }
    dom_elem.style.height = (height+20) + "px";
};

XulPanel.prototype.resize_width = function(wid){
    this.width = wid;
    var windows = my_tabs.windows();
    for(var i = 0; i < windows.length; i++){
        var thepanel = this.get_panel(windows[i]);
        thepanel.firstChild.style.width = wid + "px";
    }
};

exports.XulPanel = XulPanel;

exports.unload = function(){
    var windows = my_tabs.windows();
    for(var i = 0; i < windows.length; i++){
        for(var j = 0; j < ids_added.length; j++){
            var apanel = windows[i].document.getElementById(ids_added[j]);
            if(apanel){
                apanel.parentNode.removeChild(apanel);
            }
        }
    }
};
