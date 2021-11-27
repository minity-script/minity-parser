const assert = require("assert");

const {
  CODE,
  DECLARE
} = require("../symbols");

const {CompilerInstruction} = require("./CompilerInstruction")

const Declare = exports.Declare = class Declare extends CompilerInstruction {
  [DECLARE] = ()=>{};
  [CODE] = () => {
    return ""
    return `#DECLARE ${this.describe}`
  };
}

const DeclareScoped = exports.DeclareScoped = class DeclareScoped extends Declare {
  constructor({name,...rest}) {
    super(rest)
    this.name = name
  };
  get describe () {
    return `${this.constructor.name} ${this.name}`
  } 
}

const DeclareScore = exports.DeclareScore = class DeclareScore extends DeclareScoped {
  constructor({criterion,...rest}) {
    super(rest)
    this.criterion = criterion || 'dummy'
  };
  [DECLARE] = () => this.frame.scope.scores.declare(this.name,{criterion:this.criterion});
}

const DeclareTag = exports.DeclareTag = class DeclareTag extends DeclareScoped {
  [DECLARE] = () => this.frame.scope.tags.declare(this.name);
}


const DeclareVar = exports.DeclareVar = class DeclareVar extends DeclareScoped {
  constructor ({value,...rest}) {
    super(rest);
    this.value = value
  }
  [DECLARE] = () => this.frame.scope.vars.declare(this.name); 
  [CODE] = () => {
    if (!this.value) return "";
    const newVar = this.frame.scope.vars.create(this.name)
    return `scoreboard players set ${newVar.code} ${0|this.value}`
  }
}

const DeclareConstant = exports.DeclareConstant = class DeclareConstant extends DeclareScoped {
  constructor ({value,...rest}) {
    super(rest);
    this.value = value
  }
  [DECLARE] = () => this.frame.scope.constants.declare(this.name,{value:this.value}); 
}

const DeclareNamespace = exports.DeclareNamespace = class DeclareNamespace extends Declare {
  constructor ({ns,statements,...rest}) {
    super(rest);
    this.ns = ns;
    this.statements = statements
  }
  [DECLARE] = () => {
    this.frame.declareNamespace(this.ns, this.statements);
  }
}
const DeclareMacro = exports.DeclareMacro = class DeclareMacro extends Declare {
  [DECLARE] = () => {
    this.frame.declareMacro(this.name, this.args, this.statements);
  }
  constructor ({name,args,statements,...rest}) {
    super(rest);
    this.name = name
    this.args = args
    this.statements = statements
  }
}

const DeclareFunction = exports.DeclareFunction = class DeclareFunction extends Declare {
  [DECLARE] = () => {
    const {resloc:{name},statements,tags} = this
    this.frame.declareFunction(name, statements, tags);
  };
  constructor ({resloc,tags,statements,...rest}) {
    super(rest);
    this.resloc = resloc
    this.statements = statements
    this.tags = tags
  }
}

const DefineJson = exports.DefineJson  = class DefineJson extends Declare {
  constructor ({resloc,value,...rest}) {
    super(rest);
    this.value = value
    this.resloc = resloc
  };
  [DECLARE] = () => {
    const {resloc:{ns,name},value} = this
    this.frame.defineJson(ns||this.frame.ns,name,value.value)
  }
}

const Import = exports.Import  = class Import extends Declare {
  constructor ({file,...rest}) {
    super(rest);
    this.file = file
    this.frame.importFile(String(this.file))
  };
  [DECLARE] = () => {
    //this.frame.importFile(String(this.file))
  }
}
