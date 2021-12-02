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
    const {frame,location} = src;
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
  canOutput = type => {
    return !!this.findOutput(type)
  };
  output = type => {
    const output = this.findOutput(type);
    this.assert (output, `cannot output ${this.describe} as ${type}`)
    try {
      return output()
    } catch (error) {
      this.rethrow(error,error.location||this.location)
    }
  }

  findGet = (type,tried=[]) => {
    console.log('findGet',this.describe,type)
    let found = this[VALUE][type];
    if (!found) {
      for (const id in this[CONVERT]) {
        if (tried.contains(id)) continue
        const converted = this[CONVERT][id]()
        found = converted && converted.findGet(type,[...tried,id]);
        if (found) break
      }
    }
    return found;
  }

  get = type => {
    console.log('get',this.describe,type)
    const get = this.findGet(type);
    this.assert (get, `cannot output ${this.describe} as ${type}`)
    try {
      return get()
    } catch (error) {
      this.rethrow(error,error.location||this.location)
    }
  }
  canGet = type => {
    return !!this.findGet(type)
  };
  
  assert = (test,msg) => {
    if (!test) this.fail(msg)
  }
  fail = (msg,location) => {
    throw new MinityError(msg+" in "+this.describe,location||this.location)
  }

  rethrow = error => {
    //if (error instanceof MinityError) throw error
    error.location ||= this.location
    throw error
    this.fail(error.message||String(error),error.location||this.location)
  }

  get describe () {
    return this.constructor.name
  }

  toString() {
    return `[object ${this.describe}]`
  }
}
