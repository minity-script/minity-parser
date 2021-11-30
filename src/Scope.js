const assert = require("assert");
const {Compiler} = require("./compiler");

exports.Scope = class Scope {
  constructor(parent, { args = {}, prefix = "--minity--global-", namespace } = {}) {
    this.namespace = namespace;
    this.parent = parent
    this.prefix = prefix
    const { varObjective } = namespace;
    this.tags = new ScopeItems(parent?.tags, Tag, { prefix })
    this.vars = new ScopeItems(parent?.vars, Variable, { prefix, objective: varObjective })
    this.scores = new ScopeItems(parent?.scores, Score, { prefix }, ({ objective, criterion }) => this.namespace.addObjective(objective, criterion));
    this.constants = new ScopeItems(parent?.constants, Constant, { prefix })
    for (const name in args) {
      this.setArg(name, args[name])
    }
  }
  getArg = name => this.constants.get(name).value.get('value')
  //getArg = name => this.constants.get(name).value
  setArg = (name, value) => this.constants.declare(name, { value })
}

class ScopeItems {
  items = {}
  constructor(parent, ItemClass, itemArgs = {}, cb) {
    this.parent = parent
    this.itemArgs = itemArgs
    this.ItemClass = ItemClass
    this.cb = cb
  }
  get(name) {
    //console.log('get',this.itemArgs.prefix, this.ItemClass.describe(name), this.items[name])
    if (name in this.items) return this.items[name];
    assert(this.parent, "Undeclared " + this.ItemClass.describe(name));
    return this.parent.get(name)
  }
  declare(name, args) {
    const declareArgs = { name, ...this.itemArgs, ...args }
    //console.log('declare',this.itemArgs.prefix, this.ItemClass.describe(name) , declareArgs)
    const item = new this.ItemClass(declareArgs)
    this.items[name] = item;
    this.cb && this.cb(item)
    return item
  }
  create(name,...args) {
    return this.get(name).create(...args)
  }
}

class ScopedItem {
  constructor({ ns, prefix, name }) {
    this.ns = ns
    this.prefix = prefix
    this.name = name
    this.id = this.prefix + this.name
  }
  static describe = name => name

}

class ScoreBoard extends ScopedItem {
  constructor({ criterion, ...rest }) {
    super(rest);
    this.criterion = criterion || "dummy";
  }
}

class Score extends ScoreBoard {
  constructor(args) {
    super(args);
    this.objective = this.id
  }
  static describe = name => "score ->" + name
  code = target => target + " " + this.objective
  create = ({target,...rest}={}) => {
    const {objective} = this;
    if (typeof target!=='string') {
      assert(false,"not a string")
    }
    return Compiler.ScoreboardEntry.create({objective,target,...rest})
  }
}

class Variable extends ScoreBoard {
  constructor({ objective, ...args }) {
    super(args)
    this.objective = objective
    this.target = this.id
  }
  static describe = name => "variable $" + name
  code = () => this.target + " " + this.objective
  create = ({...rest}={}) => {
    const {objective,target} = this;
    return Compiler.ScoreboardEntry.create({objective,target,...rest})
  }
}

class Constant extends ScopedItem {
  constructor(args) {
    super(args)
    this.value = args.value
  }
  static describe = name => "constant ?" + name
  create = ({...rest}={}) => {
    const {value} = this;
    return Compiler.Constant.create({value,...rest})
  }
}

class Tag extends ScopedItem {
  static describe = name => "tag ." + name
  code = () => this.id
}