var per_man = new PersonaManager();
var suppress_messages = false;

var per_render = new PersonaRenderer(per_man);

self.port.on("suppress", function(){
    suppress_messages = !suppress_messages;
});

