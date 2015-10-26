// decision-tree.js - models a decision tree design pattern
function DecisionTree(){}

DecisionTree.prototype.init = function(){
    this.conditions = [];
    return this;
};

DecisionTree.prototype.addCondition = function(ifCond, thenValue){
    this.conditions.push({
        "cond" : ifCond,
        "then" : thenValue
    });
};

DecisionTree.prototype.evaluate = function(input){
    for(var i = 0; i < this.conditions.length; i++) {
        var condContext = {};
        var cond = this.conditions[i].cond;
        var then = this.conditions[i].then;
        var condValue = typeof(cond) === "function" ?
                cond.apply(condContext, [input]) :
                cond;
        if(condValue){
            var thenValue = typeof(then) === "function" ?
                    then.apply(condContext, [input]) :
                    then;
            return thenValue;
        }
    }
    return undefined;
};

if(typeof(exports) !== "undefined")
    exports.DecisionTree = DecisionTree;
