const assert = require("assert");
const {Nbt}=require("../../Nbt")
const {
  OUTPUT
} = require("../symbols");

const {CompilerValue} = require("./CompilerValue")

const Literal = exports.Literal = class Literal extends CompilerValue {
  constructor({ value,...rest }) {
    super(rest)
    this.value = Nbt(value);
  }

  [OUTPUT]={
    token: ()=>{
      const {value} = this
      //assert (typeof value != 'object','cannot convert object to string')
      let output = String(this.value)
      if(output.match(/^[a-z_][a-z0-9_]*$/)) return output
      return JSON.stringify(output)
    },
    json: ()=>Nbt.toJson(this.value),
    nbt: () => Nbt.toNbt(this.value),
    integer:() => {
      const value = +this.value|0
      assert (!isNaN(value),'cannot convert value to integer')
      return JSON.stringify(value)
    },
    boolean:() => {
      return JSON.stringify(!!value)
    }
  };
}

exports.Constant = class Constant extends Literal {
  constructor({frame,name,...rest}) {
    let {value} = frame.scope.constants.get(name);
    super({frame,value,...rest})
    this.name = name
  }
}

const ResLoc = exports.ResLoc = class ResLoc extends CompilerValue  {
  constructor({ns,nameParts,defaultNs,...rest}) {
    super(rest)
    this.ns = ns || defaultNs || this.frame.ns
    this.name = nameParts.join("/")
  };
  [OUTPUT]={
    'resloc': ()=>`${this.ns}:${this.name}`,
    'resloc_or_tag': ()=>`${this.ns}:${this.name}`,
  }
}

exports.ResTag = class ResTag extends ResLoc  {
  [OUTPUT]={
    'restag': ()=>`#${this.ns}:${this.name}`,
    'resloc_or_tag': ()=>`#${this.ns}:${this.name}`
  }
}
