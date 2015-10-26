function CategoryManager(cats){
    this.cats = {};
    var this_obj = this;
    self.port.on("init-cats", function(all_cats){
        this_obj.init(all_cats);
    });
}

CategoryManager.prototype.process_url = function(url){
    return url;
};

CategoryManager.prototype.init = function(cats){
    this.cats = {};
    var this_obj = this;
    for(var i in cats){
        var cat_obj = cats[i];
        if(cat_obj.length == 0)
            continue;

        var key = cat_obj[0].trim();

        var exs = cat_obj.slice(1).map(function(url){
            return this_obj.process_url(url);
        });
        this.cats[key] = { "examples" : exs };
    }
    this.heir = {};
    for(var key in this.cats){
        var path = this.cat_parse(key);
        if(!(path[0] in this.heir)){
            this.heir[path[0]] = [];
        }
        if(path.length > 1){
            this.heir[path[0]].push(path[1]);
        }
    }
};

CategoryManager.prototype.heirarchy = function(){
    return this.heir;
};

CategoryManager.prototype.all = function(){
    return this.cats;
};

CategoryManager.prototype.cat_key = function(acat){
    if(!acat)
        acat = [["Other"]];
    if(!Array.isArray(acat)){
        acat = [["Other"]];
    }
    return "Top/" + (acat.join("/"));
};

CategoryManager.prototype.cat_parse = function(acat_str){
    var ans = acat_str.split("/");
    return ans.slice(1);
};

CategoryManager.prototype.get_sub = function(acat){
    return this.cats[this.cat_key(acat)]["sub"];
};

function __unique(arr, keepLast) {
    return arr.filter(function (value, index, array) {
        return keepLast ? array.indexOf(value, index + 1) < 0 : array.indexOf(value) === index;
    });
};

CategoryManager.prototype.get_examples = function(acat){
    var key = this.cat_key(acat);
    if(key in this.cats){
        var ans = this.cats[key]["examples"];
        if(ans.length > 5){
            ans = ans.slice(0,5);
        }
        return __unique(ans);
    } else {
        self.port.emit("console.log", "Error cannot find", key, " in categories");
        return [];
    }
};

CategoryManager.prototype.display = function(acat){
    return acat;
};
