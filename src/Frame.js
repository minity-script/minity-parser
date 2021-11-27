const assert = require("assert");

const { Result } = require("./Result");
const { Scope } = require("./Scope");
const { TreeNode } = require("./TreeNode");
const { Nbt } = require("./Nbt");
const { resolve, dirname } = require("path");
const { randomString, resolveModulePath } = require("./utils.js");
const { existsSync } = require("fs");
const { isNbt, toNbt, toSnbt, toJson } = Nbt;

const print = console['log']

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
        print(node);
        let e = new Error("WTF")
        print(e.stack);
        process.exit(-1);
      }
      const ret = node.transform(this,...args);
      if (process.env.DEBUG) {
        if (typeof ret === 'object') {
          print((node.$ + " ").padEnd(24, "_"), '=> [obj]', JSON.stringify(ret).substr(0,100));
        } else {
          print((node.$ + " ").padEnd(24, "_"), '=>', "" + ret);
        }
      }
      return ret;
    }
    declareNamespace = (ns, statements) => {
      return Frame.Namespace.execute(this,{ns,statements})
    }
    allowFunctionName = name => !this.namespace.functions[name] && !this.namespace.macros[name]
    declareFunction = (name,statements,tags) => {
      return Frame.Function.execute(this,{name,statements,tags})
    }
    declareMacro = (name, args, statements) => {
      this.namespace.addMacro(name,{args, statements, parent:this})
    }
    getMacro = (ns,name) => {
      return this.result.getMacro(ns||this.ns,name);
    }
    setArg = (name,value)=> this.scope.setArg(name,value)
    getArg = (name,type="value")=> this.scope.getArg(name,type)
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
      return this.result.addAnonFunction(ns, this.scope.prefix.replace(/\W+/g,'_')+ "_b", lines );
    }
    
    anonFunction = (lines, ns = this.ns) => {
      return "function "+this.anonFunctionResloc(lines, ns )
    }

    anonFunctionResloc = (lines, ns = this.ns) => {
      return this.addBlock(lines,ns).resloc;
    }

    ifElse = (checks, thenCode, elseCode) => {
      if (!elseCode) {
        return [
          `execute ${checks} run ${thenCode}`
        ]
      }
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

    scoreboardConstant = value => {
      const constant = this.result.addConstant(value);
      return constant.id;
    }
    
    makeResloc = (ns,name,def=this.ns) => {
      if (ns) {
        assert(name.match(/^#?[_a-z10-9./]+$/),`bad resource location ${ns}:${name}`)
      } else {
        assert(name.match(/^(#?[_a-z10-9./]+:)?[_a-z10-9./]+$/),`bad resource location ${ns}:${name}`)
        if (name.match(/:/)) {
          ([ns,name] = name.split(/:/))
        }
      }
      ns||=def
      return `${ns}:${name}`
    }

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
    //this.scope = new Scope(null,{args})
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
  callSelf = () => 'function '
}

Frame.Generic = class GenericFrame extends Frame.Child {
  static execute(parent,params) {
    //console.log(this.name, params.ns)
    const frame = new this(parent,params);
    return frame.execute()
  }
}

Frame.Namespace = class NamespaceFrame extends Frame.Generic {
  callSelf = ()=>assert(false,'cannot call self() in namespace scope')
  constructor(parent,{ statements, ...rest}) {
    console.log('child',rest.ns)

    super(parent,rest);

    this.scope = this.namespace.scope
    this.fn = this.namespace.addLoadFunction()
    this.statements = statements;
  }

  execute() {
    this.fn.content = this.transform(this.statements).getCode()
    return []
  }
}

Frame.Function = class FunctionFrame extends Frame.Generic {

  constructor(parent,{name, statements, tags, ...rest}) {
    super(parent,rest);

    this.scope = new Scope(this.parent.scope,{
      prefix: `--${this.ns}-${name}-`,
      namespace: this.namespace
    });
    this.fn = this.namespace.addFunction(name);
    this.statements = statements;
    this.tags = tags;
  }

  callSelf = () => {
    return `function ${this.fn.resloc}`;
  }
  
  execute() {
    this.fn.content = this.transform(this.statements).getCode();
    for (const { ns, name } of this.tags) {
      this.fn.addTag(ns, name);
    }
    return []
  }
}

Frame.Macro = class MacroFrame extends Frame.Generic {
  constructor(parent,{macro,args,resolve,reject,...rest}) {
    super(parent,rest);
    this.macro = macro;
    this.resolve = resolve;
    this.reject = reject;

    this.scope = new Scope(this.parent.scope,{
      prefix: `--${this.ns}-${this.macro.name}-`,
      namespace: this.namespace,
      args
    });
  }

  callSelf = () => {
    if (!this.fn) {
      this.fn = this.namespace.addAnonFunction(this.macro.name);  
    }
    return `function ${this.fn.resloc}`;
  }
  
  execute() {
    const code = this.transform(this.macro.statements).getCode();
    
    if (this.fn) {
      this.fn.content = code;
      return `function ${this.fn.resloc}`;
    } else {
      return code
    }
  }
}
