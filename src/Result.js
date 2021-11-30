const { mergeAndConcat:merge } =require('merge-anything');
const assert = require("assert");
const { resolve, dirname } = require("path");
const { statSync, mkdirSync, writeFileSync } = require("fs");
const {Scope} = require("./Scope")

const Result = exports.Result = class Result {
  constructor() {
    this.blockCount = 0;
    this.namespaces = {};
    this.constants = {};
    this.addNamespace("minecraft","Internal");
    this.main = this.addNamespace("zzz_minity","Main");
    this.imported = {}
  }
  importFile = (path) => {
    if (!this.imported[path]) {
      let minity = require("./minity.js");
      minity.compileFile(path, { result: this })
      this.imported[path] = true
    }
  }
  addNamespace(ns,kind="Custom") {
    let namespace = this.namespaces[ns];
    if (!namespace) {
      namespace = this.namespaces[ns] = new ResultNamespace[kind](this, { ns })
    }
    return this.namespaces[ns];
  }
  getNamespace(ns) {
    this.addNamespace(ns);
    return this.addNamespace(ns);
  }
  addConstant(value) {
    const name = "--minity--const-" + value;
    if (!this.constants[value]) {
      const objective = "--minity--const";
      const id = name + " " + objective;
      this.constants[value] = {
        name,
        objective,
        id,
        declare: "scoreboard players set " + id + " " + value
      }
    }
    return this.constants[value];
  }
  macroExists(ns,...args) {
    return this.namespaces[ns]?.macroExists(...args)
  }
  functionExists(ns,...args) {
    return this.namespaces[ns]?.functionExists(...args)
  }
  getMacro(ns,name) {
    return this.namespaces[ns].macros[name]
  }
  addFunction(ns, ...args) {
    return this.getNamespace(ns).addFunction(...args);
  }
  addAnonFunction(ns, ...args) {
    return this.getNamespace(ns).addAnonFunction(...args);
  }
  addJson(ns, ...args) {
    return this.getNamespace(ns).addJson(...args);
  }
  get declare() {
    return [
      ...Object.values(this.constants).map(it => it.declare)
    ]
  }
  get files() {
    return [
      ...Object.values(this.namespaces).flatMap(it => it.files)
    ];
  }
}


class ResultNamespace {
  constructor(result, { ns }) {
    this.result = result;
    this.ns = ns;
    this.objectives = {};
    this.jsons = {};
    //this.addObjective(`--${ns}--vars`, "dummy")
    this.functions = {};
    this.macros = {}
  }
  addObjective(objective, criterion = "dummy") {
    return this.objectives[objective] = {
      objective,
      criterion,
      id: objective + " " + criterion,
      get declare() {
        return "scoreboard objectives add " + this.id;
      }
    }
  }
  get main() {
    return this.result.main;
  }
  macroExists = (name) => {
    return(!!this.macros[name])
  }
  functionExists = (name) => {
    return(!!this.functions[name])
  }
  addMacro = (name,props) => {
    assert(!this.functions[name], "duplicate macro " + name)
    assert(!this.macros[name], "duplicate macro " + name)
    this.macros[name]=new ResultMacro(this,{ name, ...props });
  }
  addFunction(name, content) {
    const fn = new ResultFunction(this, { name, content })
    assert(!this.functions[fn.name], "duplicate function " + fn.resloc)
    assert(!this.macros[fn.name], "duplicate function " + fn.resloc)
    return this.functions[fn.name] = fn;
  }
  nextAnonName(prefix) {
    const name =prefix+"_"+this.result.blockCount++;
    return name;
  }
  addAnonFunction(prefix,content) {
    if (content && typeof content !== 'function' ) {
      const cacheKey = JSON.stringify(content)
      if(!this.cache[cacheKey]) {
        const id = this.nextAnonName(prefix)
        this.cache[cacheKey] = this.main.addFunction([this.ns,id],content);
      }
      return this.cache[cacheKey]
    } else {
      const id = this.nextAnonName(prefix)
      return this.main.addFunction([this.ns,id],content);
    }  
  }
  addLoadFunction(content) {
    const fn = this.addAnonFunction('load',content);
    fn.addTag('minecraft','load')
    return fn;
    
  }
  addJson(name, obj) {
    let id = [].concat(name).join("/");
    const file = this.jsons[id] ??= new ResultJson(this, { name });
    file.merge(obj);
    return file;
  }
  get files() {
    return [
      ...Object.values(this.jsons),
      ...Object.values(this.functions).filter(file=>{
        return file.included
      })
    ]
  }
  cache = {}
}

ResultNamespace.Internal = ResultNamespace

ResultNamespace.Custom = class ResultNamespaceCustom extends ResultNamespace {
  constructor(result,{...rest}) {
    super(result,rest);
    this.varObjective = `--${this.ns}--vars`
    this.addObjective(this.varObjective, "dummy");
    this.addAnonFunction("objectives",()=>[
      `data modify storage zzz_minity:${this.ns} stack set value []`,
      ... Object.values(this.objectives).map(it=>it.declare)
    ]).addTag("minecraft","load");
    this.scope = new Scope(this.result.scope,{namespace:this,prefix:`--${this.ns}-`})
  }
}

ResultNamespace.Main = class ResultNamespaceCustom extends ResultNamespace.Custom {
  constructor(result,{...rest}) {
    super(result,{...rest});
    this.addAnonFunction("constants",()=>[
      'scoreboard objectives add --minity--const dummy',
      ... Object.values(this.result.constants).map(it=>it.declare)
    ]).addTag("minecraft","load");
  }
  get main() {
    return this;
  }
}


class ResultFile {

  constructor(namespace, { name, ext, content }) {
    this.namespace = namespace;
    this.ns = namespace.ns
    this.parts = [].concat(name);
    this.ext = ext;
    this.content = content;
  }

  get content() {
    return this._content;
  }

  set content(value) {
    this._content = value;
  }

  get text() {
    return "";
  }
  get name() {
    return this.parts.join("/")
  }
  get resloc() {
    return this.ns + ":" + this.name
  }
  get dest() {
    return ["data", this.ns, ...this.parts].join("/") + this.ext;
  }

  write(to) {
    const path = resolve(to, this.dest);
    const entry = statSync(path, { throwIfNoEntry: false })
    const text = entry ? this.overwrite(path) : this.text;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  overwrite(path) {
    throw new Error("duplicate file "+ path);
  }
}

class ResultFunction extends ResultFile {
  constructor(namespace, { ...rest }) {
    super(namespace, { ext: ".mcfunction", ...rest });
    //console.log("=".repeat(60),"\n"+this.resloc,"\n"+this.text,"\n"+"-".repeat(60))
  }
  set content(value) {
    if (typeof value ==='function') value = value(this.resloc);
    if (value === undefined || value === false) {
      return;
    }
    this._content = value;
    this.included = true;
  }
  get content() {
    return this._content
  }
  
  get text() {
    return this.content.join("\n");
  }

  addTag(ns, tag) {
    this.namespace.result.addJson(ns, ["tags", "functions", tag], {
      values: [this.resloc]
    })
    return this;
  }

  get dest() {
    return ["data", this.ns, "functions", ...this.parts].join("/") + this.ext;
  }
}

class ResultJson extends ResultFile {
  constructor(namespace, { content = {}, ...rest }) {
    super(namespace, { ext: ".json", content, ...rest });
  }
  get text() {
    return JSON.stringify(this.content,null,2);
  }
  merge(obj) {
    this._content = merge(this.content, obj);
  }
  overwrite(path) {
    return JSON.stringify(merge(require(path), this.content),null,2);
  }
}


class ResultMacro {
  constructor (namespace,{name,args,statements,parent}) {
    this.namespace = namespace
    this.name = name
    this.args = args
    this.statements = statements
    this.parent = parent
    this.ns = namespace.ns
  }
  cache = {}
  transformArgs({T},args) {
    const {named={},numbered=[]}=args||{}
    const new_args = {};
    for (const i in this.args) {
      const { name, def } = this.args[i];
      if (name in named) {
        new_args[name] = T(named[name])
      } else if (i in numbered) {
        new_args[name] = T(numbered[i])
      } else if (def) {
        new_args[name] = T(def)
      } else {
        throw new Error("arg " + name + " in macro " + this.name + " is not optional")
      }
    }
    return new_args
  }
  expand(args,resolve,reject) {
    const {name,cache,parent,statements} = this;
    resolve ??= null
    reject ??= null
    
    const cache_hash =({
      args:{},
      resolve,
      reject
    })

    for (const id in args) cache_hash.args[id]=args[id].output('nbt')
    const cache_id = JSON.stringify(cache_hash)
    if (!cache[cache_id]) {
      const { Frame } = require('./Frame')
      cache[cache_id] = Frame.Macro.execute(parent,{
        macro: this,
        reject,
        resolve,
        args,
        statements
      });
      console.log('CACHE MISS',cache_id)
    } else {
      console.log('CACHE HIT')
    }
    return cache[cache_id]
  }
}
