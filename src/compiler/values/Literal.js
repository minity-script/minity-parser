const assert = require("assert");
const { Nbt } = require("../../Nbt")
const {
  OUTPUT,
  ITEMS,
  PROPS
} = require("../symbols");

const { CompilerValue } = require("./CompilerValue")

exports.Constant = class Constant extends CompilerValue {
  static create({frame,name,...args}) {
    //console.log('CONSTANT',name,frame.scope.constants.get(name).value.output('json'))
    return frame.scope.constants.get(name).value
  }
}

const LiteralValue = exports.LiteralValue = class LiteralValue extends CompilerValue {
  [ITEMS] = () => [ this ]
}

const LiteralProp = exports.LiteralProp = class LiteralProp extends CompilerValue {
  constructor({key,value,...rest}) {
    super(rest);
    this.key = key
    this.value = value
  }
  [PROPS] = () => [ this ]
}
