const assert = require("assert");

const {
  OUTPUT,
} = require("./symbols");

const CompilerNode = exports.CompilerNode = class CompilerNode {
  [OUTPUT] = {};

  static create (...args) {
    return new this(...args)
  }
  constructor({frame,location}) {
    this.frame = frame
    this.location = location
  }
  output = outputType => {
    this.assert (this.canOutput(outputType),"cannot output as "+outputType)
    return this[OUTPUT][outputType]()
  }
  canOutput = outputType => {
    return !!this[OUTPUT][outputType]
  };

  
  assert = (test,msg) => {
    if (!test) this.fail(msg)
  }
  fail = (msg) => {
    throw new Error(msg+" in "+this.describe)
  }

  get describe () {
    return this.constructor.name
  }
}
