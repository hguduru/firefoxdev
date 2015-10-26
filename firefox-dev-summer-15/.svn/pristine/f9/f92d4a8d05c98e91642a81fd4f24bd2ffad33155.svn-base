var per_man = new PersonaManager();

self.port.on("cur-persona", function(anId){
    var curPersona = per_man.get_persona(anId);
    fit_size();
});

var timer = new TimerCountDown(5);
$(function(){
    timer.attach($(".popup-area"));
    timer.events.on("timer-clear", function(){
        $(".timer-display").text("");
    });
    timer.events.on("done", function(){
        self.port.emit("hide-me");
    });
    timer.events.on("new-time", function(atime){
        $(".timer-display").text(atime);
    });

    $(".popup-area > a").click(function(){
        self.port.emit("open-prefs");
    });
});
