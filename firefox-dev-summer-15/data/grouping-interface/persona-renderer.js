function PersonaRenderer(per_man){
    this.inited = false;
    this.caninit = false;
    this.defcolors = [];
    this.pending_callbacks = {};
    this.blockmap = {};
    this.message_uid = 0;

    this.per_man = per_man;
    this.newpersonablock = new NewPersonaBlock();
    this.unconfigured = new UnconfiguredBlock();
    this.trash = new TrashBlock();
    this.events = new EventManager();

    var thisobj = this;
    $(window).resize(function(){
        thisobj.events.trigger("refresh");
    });

    self.port.on("favicon", function(url, results){
        thisobj.hostInfoResponse(url, results);
    });

    per_man.events.on("add", function(ctx){
        thisobj.addPersona(ctx);
    });
    self.port.on("defcolors", function(colors){
        thisobj.definecolors(colors);
        thisobj.attach($(".persona-area"));
    });

}

PersonaRenderer.prototype.definecolors = function(colors){
    this.defcolors = colors;
};

PersonaRenderer.prototype.attach = function(elem){
    this.inited = true;
    this.element = $(elem);
    // todo: addblock for new persona, unconfigured, delete section?

    var topblock = $("<div>", {
        "class" : "persona-top-box"
    });
    this.element.append(topblock);

    this.element = topblock;
    this.addBlock(this.unconfigured);

    var stackedBlocks = $("<div>", {
        "class" : "persona-stacked-box"
    });
    topblock.append(stackedBlocks);
    this.element = stackedBlocks;
    this.addBlock(this.newpersonablock);
    this.addBlock(this.trash);
    this.element = $(elem);

    var spacer = $("<div>", {
        "class" : "persona-spacer"
    });
    this.elem().append(spacer);

    this.columns = [];
    for(var j = 0; j < 3; j++) {
        var acolumn = $("<div>", {
            "class" : "persona-column"
        });
        this.columns.push(acolumn);
        elem.append(acolumn);
    }
    var personas = this.per_man.get_personas();

    for(var i = 0; i < personas.length; i++) {
        this.addPersona(personas[i]);
    }
    this.element = $(elem);
};

PersonaRenderer.prototype.addPersona = function(apersona){
    var oracle = new PersonaBlock(apersona, this.per_man);
    var num_personas = this.per_man.get_personas().length;
    var temp_elem = this.element;
    this.element = this.columns[(num_personas - 1) % 3];
    this.addBlock(oracle);
    this.element = temp_elem;
};

PersonaRenderer.prototype.elem = function(){
    return this.element;
};

PersonaRenderer.prototype.getBlock = function(key){
    return this.blockmap[key];
};

PersonaRenderer.prototype.addBlock = function(oracle){
    if(!this.inited)
        return;
    oracle.registerManager(this);
    this.blockmap[oracle.id()] = new BlockObject(oracle, this);
    var e = this.blockmap[oracle.id()].createElem();
    this.elem().append(e);
    this.blockmap[oracle.id()].refresh();
};

PersonaRenderer.prototype.blocks = function(){
    var thisobj = this;
    return Object.keys(this.blockmap).map(function(key){
        return thisobj.blockmap[key];
    });
};

PersonaRenderer.prototype.remove = function(akey){
    delete this.blockmap[akey];
};

PersonaRenderer.prototype.askHostInfo = function(ahost, callback){
    this.message_uid++;
    this.pending_callbacks[this.message_uid] = callback;
    self.port.emit("ask-info", this.message_uid, {
        "host" : ahost
    });
};

PersonaRenderer.prototype.hostInfoResponse = function(muid, response){
    if(!response){
        return;
    }
    this.pending_callbacks[muid](response);
    this.pending_callbacks[muid] = undefined;
};
