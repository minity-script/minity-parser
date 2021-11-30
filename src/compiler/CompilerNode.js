const assert = require("assert");
const { MinityError } = require("../utils");

const {
  OUTPUT,
  VALUE,
  CONVERT
} = require("./symbols");

const CompilerNode = exports.CompilerNode = class CompilerNode {
  [OUTPUT] = {};
  [CONVERT] = {};

  static create (args) {
    return new this(args)
  }
  static createFrom(src,args) {
    const {frame,location} = this;
    return this.create({...args,frame,location})
  }
  constructor({frame,location}) {
    this.frame = frame
    this.location = location
  }
  findOutput = type => {
    let found = this[OUTPUT][type];
    if (!found) {
      for (const id in this[CONVERT]) {
        const converted = this[CONVERT][id]()
        found = converted && converted.findOutput(type);
        if (found) break
      }
    }
    return found;
  }
  output = type => {
    const output = this.findOutput(type);
    this.assert (output, "cannot output as "+type)
    try {
      return output()
    } catch (error) {
      console.error('failed',this.describe,type,output,error.message)
      this.rethrow(error,error.location||this.location)
    }
  }
  canOutput = type => {
    return !!this.findOutput(type)
  };

  get = type => {
    this.assert (this.canGet(type),"cannot get as "+type)
    try {
      return this[VALUE][type]()
    } catch (error) {
      this.rethrow(error)
    }
  }
  canGet = type => {
    return !!this[VALUE][type]
  };
  
  assert = (test,msg) => {
    if (!test) this.fail(msg)
  }
  fail = (msg,location) => {
    throw new MinityError(msg+" in "+this.describe,location||this.location)
  }

  rethrow = error => {
    if (error instanceof MinityError) throw error
    error.location ||= this.location
    throw error
    this.fail(error.message||String(error),error.location||this.location)
  }

  get describe () {
    return this.constructor.name
  }
}
