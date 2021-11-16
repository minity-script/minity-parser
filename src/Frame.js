const assert = require("assert");

const { Result } = require("./Result");
const { Scope } = require("./Scope");
const { TreeNode } = require("./TreeNode");
const { Nbt } = require("./Nbt");
const { resolve, dirname } = require("path");
const { randomString, resolveModulePath } = require("./utils.js");
const { existsSync } = require("fs");
const { isNbt, toNbt, toSnbt, toJson } = Nbt;

  
const Frame = exports.Frame =
  class Frame extends Function {
    constructor() {
      super()
      this.proxy = new Proxy(this, {
        apply: (target, thisArg, args) => target.transform(...args)
      })
      return this.proxy;
    }
    get T() {
      return this.transform;
    }

    O = node => {
      if (node === null) return "";
      return this.T(node);
    }
    importFile = (file) => {
      const path = resolveModulePath(this.root.file,file);
      this.result.importFile(path)
    }
    Nbt = (x,...args) => x instanceof TreeNode ? Nbt(this.T(x),...args) : Nbt(x,...args)
    toNbt = x => x instanceof TreeNode ? toNbt(this.T(x)) : toNbt(x)
    toSnbt = x => x instanceof TreeNode ? toSnbt(this.T(x)) : toSnbt(x)
    toJson = x => x instanceof TreeNode ? toJson(this.T(x)) : toJson(x)
    transform = (node,...args) => {
      if (isNbt(node)) return toNbt(node);
      if (!node?.transform) {
        console.log(node);
        let e = new Error("WTF")
        console.log(e.stack);
        process.exit(-1);
      }
      const ret = node.transform(this,...args);
      if (process.env.DEBUG) {
        if (typeof ret === 'object') {
          console.log((node.$ + " ").padEnd(24, "_"), '=> [obj]', JSON.stringify(ret));
        } else {
          console.log((node.$ + " ").padEnd(24, "_"), '=>', "" + ret);
        }
      }
      return ret;
    }
    declareNamespace = (ns, statements) => {
      const C = new Frame.Namespace(this,{ns,statements})
      return C.fn;
    }
    allowFunctionName = name => !this.namespace.functions[name] && !this.namespace.macros[name]
    declareFunction = (name, statements) => {
      const C = new Frame.Function(this,{name,statements})
      return C.fn;
    }
    declareMacro = (name, args, statements) => {
      this.namespace.addMacro(name,{args, statements, parent:this})
    }
    getMacro = (ns,name) => {
      return this.result.getMacro(ns||this.ns,name);
    }
    setArg = (name,value)=> this.SCOPE.setArg(name,value)
    getArg = (name,type="value")=> this.SCOPE.getArg(name,type)
    macroExists = (ns,name) => {
      return this.result.macroExists(ns||this.ns,name);
    }
    functionExists = (ns,name) => {
      return this.result.functionExists(ns||this.ns,name);
    }
    expandMacro = (ns,name,args,resolve,reject) => {
      ns ||= this.ns;
      assert(this.macroExists(ns,name),"no such macro "+ns,name)
      const macro = this.result.getMacro(ns,name);
      const new_args = macro.transformArgs(this,args);
      return macro.expand(new_args,resolve,reject)
    }
    declareEvent = (id, trigger, conditions, then) => {
      this.result.addJson(this.ns, ["advancements",id], {
        criteria: {
          [id]: {
            trigger,
            conditions  
          }
        },
        rewards: {
          function: then
        }
      })
    }
    addBlock = (lines, ns = this.ns) => {
      return this.result.addAnonFunction(ns, this.resloc, lines, "_b"  );
    }
    
    anonFunction = (lines, ns = this.ns) => {
      return "function "+this.anonFunctionResloc(lines, ns )
    }

    anonFunctionResloc = (lines, ns = this.ns) => {
      return this.addBlock(lines,ns).resloc;
    }

    ifElse = (checks, thenCode, elseCode) => {
      const stack = `storage zzz_minity:${this.ns} stack`;
      const top = `${stack}[-1]`;
      return [
        `data modify ${stack} append value [B;]`,
        `execute ${checks} run data modify ${top} append value 1b`,
        `execute if data ${top}[0] run ${thenCode}`,
        `execute unless data ${top}[0] run ${elseCode}`,
        `data remove ${top}`
      ]
    }

    sumCoords = coords => {
      let ret = { x: 0, y: 0, z: 0 };
      for (const { axis, d, f } of coords) ret[axis] += f * this.T(d);
      return ret;
    }
    /*
    addJson = (parts, value) => {
      this.result.addJson(parts, value);
    }*/
    addFunctionTag = (ns, tag, fn) => {
      this.result.addJson(ns, ["tags", "functions", tag], {
        values: [fn]
      })
    }
    defineJson = (ns, name, value) => {
      this.result.addJson(ns, [name], value)
    }
    constantId = value => {
      const constant = this.result.addConstant(value);
      return constant.id;
    }

    declareVar = (name) => this.SCOPE.declareVar(name)
    varTarget = (name) => this.SCOPE.varTarget(name);
    varObjective = (name) => this.SCOPE.varObjective(name);
    varId = (name) => this.SCOPE.varId(name)

    declareScore = (name, criterion) => this.SCOPE.declareScore(name,criterion)
    scoreObjective = name => this.SCOPE.scoreObjective(name)
    scoreCriterion = name => this.SCOPE.scoreCriterion(name)
    declareTag = name => this.SCOPE.declareTag(name)
    tagId = name => this.SCOPE.tagId(name)

    get frame() {
      return this
    }
    get namespace() {
      return this.result.getNamespace(this.ns)
    }
  }

Frame.Root = class FrameRoot extends Frame {
  constructor({ file, ns = "zzz_minity", args = {}, result, checkErrors } = {}) {
    super();
    this.file = file;
    this.ns = ns;
    this.args = args
    this.root = this;
    this.result = result ?? new Result();
    this.checkErrors = checkErrors;
    //this.SCOPE = new Scope(null,{args})
  }
  
  macros = {};
  constants = {};
  scores = {};
  vars = {};
  tags = {};
}

Frame.Child = class FrameChild extends Frame {
  constructor(parent, { args = {}, ns = parent.ns }) {
    super(parent)
    this.parent = parent;
    this.root = parent.root;
    this.ns = ns;
    this.args = args;
  }

  get macros() {
    return this.namespace.macros;
  }
  get constants() {
    return this.root.constants;
  }
  get result() {
    return this.root.result;
  }
}

Frame.Generic = class GenericFrame extends Frame.Child {
  constructor(parent, { ...rest }) {
    super(parent, { ...rest, scope:true });
    Object.assign(this, this.extra(rest))
    this.resloc = this.fnNamespace+":"+this.fnName;
    const lines = this.statements.map(this.transform);
    this.fn = this.result.addFunction(this.fnNamespace, this.resloc, this.fnName, lines);
  }
}

Frame.Namespace = class NamespaceFrame extends Frame.Generic {
  extra ({statements}) {
    return {
      SCOPE: this.namespace.SCOPE,
      fnNamespace: "zzz_minity",
      fnName: this.ns+"/load_"+this.result.blockCount++,
      prefix: "--" + this.ns + "-",
      statements 
    }
  }
}

Frame.Function = class FunctionFrame extends Frame.Generic {
  extra ({name,statements}) {
    const prefix = "--" + this.ns + "-" + name + "-"
    const {namespace} = this
    return {
      SCOPE: new Scope(this.parent.SCOPE,{prefix,namespace}),
      fnNamespace: this.ns,
      fnName: name,
      prefix,
      statements 
    }
  }
}

Frame.Macro = class MacroFrame extends Frame.Generic {
  extra ({name,statements,args,reject,resolve}) {
    const prefix = "--" + this.ns + "-" + name + "-"
    const {namespace} = this
    return {
      SCOPE: new Scope(this.parent.SCOPE,{prefix,namespace,args}),
      fnNamespace: "zzz_minity",
      fnName: this.ns+"/"+name+"_"+this.result.blockCount++,
      reject,
      resolve,
      prefix,
      statements: statements
    }
  }
}
