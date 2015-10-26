var Scheduler = (function(){
    var days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    var day_abbrev = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    var day_abbrev_short = ["S", "M", "T", "W", "T", "F", "S"];

    var abbrev_opts = {
        "long" : days,
        "med" : day_abbrev,
        "short" : day_abbrev_short
    };

    function Scheduler(elem, opts){
        if(!opts)
            opts = {};
        this.root = elem;
        elem.addClass("scheduler-root");
        this.added_days = [];
        this.day_inputs = [];
        var names = opts.names in abbrev_opts ? abbrev_opts[opts.names] : day_abbrev_short;
        var this_obj = this;
        for(var i = 0; i < names.length; i++){
            var ip = $("<input>", {
                "type" : "checkbox"
            });
            var lb = $("<label>", {
                "class" : "scheduler-weekday-lb",
                "text" : names[i]
            });
            if(i == 0){
                lb.addClass("scheduler-first-weekday-lb");
            }
            lb.click((function(an_ip){
                return function(){
                    an_ip.click();
                };
            })(ip));
            ip.change((function(ind, an_ip){
                return function(event){
                    if(an_ip.is(":checked")){
                        this_obj.add_day(ind);
                    } else {
                        this_obj.rem_day(ind);
                    }
                };
            })(i, ip));
            this.day_inputs.push(ip);
            elem.append(ip, lb);
        }
        var times_intervals = $("<div>", {
            "class" : "scheduler-time-intervals"
        });
        elem.append(times_intervals);
    }

    Scheduler.prototype.has_day = function(day){
        var ans = this.added_days.filter(function(e){
            if(day == e.day){
                return true;
            }
            return false;
        });
        if(ans.length){
            return ans[0];
        } else{
            return false;
        }
    };

    Scheduler.prototype.has_times = function(day){
        var d = this.added_days.filter(function(e){
            if(day == e.day){
                return true;
            }
            return false;
        });
        if(d.length != 0){
            return d[0].elem.find("div").length != 0;
        } else {
            return false;
        }
    };

    Scheduler.prototype.add_day = function(this_day){
        var after = null;
        var after_day = 0;
        var day_name = days[this_day];
        for(var i = 0; i < this.added_days.length; i++){
            if(this.added_days[i].day < this_day){
                after = this.added_days[i].elem;
                after_day = i;
            }
        }
        var to_add = $("<div>", {
            "class" : "scheduler-day-time-interval"
        });
        var time_inter_lab = $("<label>", {
            "text" : "All day"
        });
        var record = {
            "day" : this_day,
            "elem" : to_add, 
            "label" : time_inter_lab
        };
        this.added_days.splice(after_day, 0, record);
        var this_obj = this;
        var adds = [
            $("<label>", {
                "text" : day_abbrev[this_day]+":",
                "class" : "scheduler-day-abbrev"
            }),
            time_inter_lab,
            $("<span>", {
                "class" : "scheduler-icon-plus"
            }).append($("<i>", {
                "class" : "fa fa-plus-square"
            })).click(function(){
                to_add.append(this_obj.add_time(this_day));
                time_inter_lab.text("Only during");
                this_obj.root.trigger("sized");
            })
        ];
        to_add.append(adds);
        
        if(after){
            after.after(to_add);
        } else {
            this.root.find(".scheduler-time-intervals").prepend(to_add);
        }
        this.root.trigger("sized");
        return record;
    };

    Scheduler.prototype.add_time = function(this_day, start_val, end_val){
        var start_time = $("<input>", {
            "type" : "text",
            "size" : "10"
        });
        if(start_val){
            start_time.val(start_val);
        }
        start_time.attr("size", "10");
        var end_time = $("<input>", {
            "type" : "text",
            "size" : "10"
        });
        if(end_val){
            end_time.val(end_time);
        }
        end_time.attr("size", "10");
        var parent = $("<div>", {
            "class" : "scheduler-time-div"
        });
        var this_obj = this;
        parent.append(start_time, $("<label>", {
            "text" : "to"
        }), end_time, $("<span>", {
            "class" : "scheduler-icon-plus"
        }).append($("<i>", {
            "class" : "fa fa-minus-square"
        })).click(function(){
            parent.remove();
            if(!this_obj.has_times(this_day)){
                this_obj.has_day(this_day).label.text("All day");
            }
            this_obj.root.trigger("sized");
        }));
        var tomorrow_mid = new Date();
        tomorrow_mid.setHours(24,0,0,1); // next midnignt
        var today_mid = new Date();
        today_mid.setHours(0,0,0,1); // this midnignt
        
        start_time.timepicker({
            "scrollDefaultNow" : true
        });
        end_time.timepicker({
            "showDuration" : start_time,
            "durationTime" : function(){
                return start_time.timepicker("getTime") || "12:00am";
            },
            "maxTime" : tomorrow_mid,
            "minTime" : "12:30am",
            "scrollDefaultNow" : true
        });
        start_time.change(function(){
            if(start_time.val()){
                if(end_time.val()){
                    if(start_time.timepicker("getTime") > end_time.timepicker("getTime")){
                        end_time.timepicker("setTime", start_time.timepicker("getTime"));
                    }
                }
                end_time.timepicker("option", {
                    "minTime" : start_time.val() == "12:00am" ?
                        "12:30am" :
                        start_time.timepicker("getTime")
                });
            } else {
                end_time.timepicker("option", {
                    "minTime" : "12:30am"
                });
            }
        });
        end_time.change(function(){
            if(end_time.val()){
                if(start_time.val()){
                    if(start_time.timepicker("getTime") > end_time.timepicker("getTime")){
                        start_time.timepicker("setTime", start_time.timepicker("getTime"));
                    }
                }
                start_time.timepicker("option", {
                    "maxTime" : end_time.timepicker("getTime")
                });
            } else {
                start_time.timepicker("option", {
                    "maxTime" : tomorrow_mid
                });
            }
        });
        return parent;
    };

    Scheduler.prototype.rem_day = function(theday){
        this.added_days = this.added_days.filter(function(e){
            if(theday == e.day){
                e.elem.remove();
                return false;
            }
            return true;
        });
        this.root.trigger("sized");
    };

    // returns [{ "day" : 0-6, "start" : atime, "end" : atime }, ...]
    Scheduler.prototype.getValue = function(){
        var day_opts = [];
        for(var i = 0; i < this.added_days.length; i++){
            var vals = this.added_days[i].elem
                .children("input").map(function(e){
                    return $(this).val();
                }).get();
            
            if(vals.length == 0){
                day_opts.push({
                    "day" : i
                });
            } else {
                for(var j = 0; j < vals.length/2; j++){
                    var push_opt = {day : i};
                    if(vals[2*j])
                        push_opt["start"] = vals[2*j];
                    if(vals[2*j+1])
                        push_opt["end"] = vals[2*j+1];
                    day_opts.push(push_opt);
                }
            }
        }
        
        return day_opts;
    };

    // [{"day": 0-6}, {"day" : 0-6, start : "19:00", end : "23:59"}, ... ]
    Scheduler.prototype.setValue = function(vals){
        var this_obj = this;
        vals.forEach(function(v){
            var day_div = this_obj.has_day(v.day);
            if(!day_div){
                day_div = this_obj.add_day(v.day);
            }
            this_obj.day_inputs[v.day].prop("checked", true);
            if(v.start || v.end){
                this_obj.add_time(v.day, v.start, v.end);
                day_div.elem.append(this_obj.add_time(v.day));
                day_div.label.text("Only during");
                this_obj.root.trigger("sized");
            }
        });
    };

    Scheduler.prototype.show = function(){
        this.root.removeClass("hidden");
    };

    Scheduler.prototype.hide = function(){
        this.root.addClass("hidden");
    };
    return Scheduler;
})();
