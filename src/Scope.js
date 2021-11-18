const assert = require("assert");

const Scope = module.exports.Scope = class Scope {
  constructor (parent,{args={},prefix="--minity--global-",namespace}={}) {
    this.parent = parent
    this.args = args||{}
    this.tags = {}
    this.vars = {}
    this.scores = {};
    this.prefix = prefix

    this.namespace = namespace;
  }

  scopedId(name) {
    return this.prefix+name
  }
  get(what,name,error) {
    if (name in this[what]) return this[what][name]
    assert(this.parent, (error||"undefined "+what+" ")+name);
    return this.parent.get(what,name,error)
  }
  getArg(name) {
    return this.get('args',name, "Undeclared constant ?" );
  }
  setArg(name,value) {
    assert (!this.args.hasOwnProperty(name),"Cannot redeclare constant ?"+name);
    this.args[name]=value;
  }
  getTag(name) {
    return this.get('tags',name,"Undeclared tag .");
  }
  declareTag = (name) => {
    const id = this.scopedId(name);
    this.tags[name] = { id, ns: this.ns };
  }
  tagId = (name) => {
    return this.getTag(name).id
  }

  getVar(name) {
    return this.get('vars',name,'Undeclared variable $')
  }
  declareVar = (name) => {
    const target = this.scopedId(name);
    const objective = this.namespace.varObjective;
    this.vars[name] = { name, target, objective };
  }
  
  varTarget = (name) => this.getVar(name).target;
  varObjective = (name) => this.getVar(name).objective;
  varId = (name) => {
    return this.varTarget(name) + " " + this.varObjective(name)
  }

  getScore(name) {
    return this.get('scores',name,'Undeclared score ->')
  }

  declareScore (name, criterion) {
    criterion ||= "dummy"
    const objective = this.scopedId(name);
    this.scores[name] = { name, objective, criterion, ns: this.ns };
    this.namespace.addObjective(objective, criterion);
  }

  scoreObjective = name => {
    return this.getScore(name).objective
  }
  scoreCriterion = name => {
    return this.getScore(name).criterion
  }
}