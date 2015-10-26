function initials(astring){
    var indexs = [astring[0].toUpperCase()];
    for(var i = 1; i < astring.length; i++) {
        if(astring[i] == " " && i < astring.length - 1){
            indexs.push( astring[i + 1].toUpperCase() );
        }
    }
    var accum = "";
    for(var j = 0; j < indexs.length; j++) {
        accum += indexs[j];
    }
    return accum.slice(0,2);
}

function firstFewWords(astring){
    var maxlen = Math.max(astring.length, 4);
    return astring.slice(0, maxlen);
}

function changelabel(name){
    // var text = initials(name);
    var text = firstFewWords(name);
    $(".main-persona").text(text);
}

function flashOnce(cb){
    $(".main-bg").addClass("flashing-bg");
    $(".main-bg").fadeOut(1000, function(){
        $(".main-bg").removeClass("flashing-bg");
        $(".main-bg").css({
            display : "block",
            opacity : 1
        });
        if(cb)
            cb();
    });
}

function changenum(num){
    var currentnum = parseInt($(".num-unconf").text());
    if(!currentnum || num > currentnum){
        flashOnce(function(){
            flashOnce();
        });
    }
    if(num){
        $(".num-unconf").text(num);
    } else {
        $(".num-unconf").text("");
    }
}

addon.port.on("change-label", changelabel);
addon.port.on("change-num", changenum);

$(function(){
});
