const assert = require("assert");
const { UnaryInstruction, BinaryInstruction } = require("./CompilerInstruction");
const {
  MERGE,
  APPEND,
  PREPEND,
  INSERT,
  REMOVE  
} = require("../symbols");

exports.Append = class Append extends BinaryInstruction {
  leftProp = APPEND
}

exports.Prepend = class Prepend extends BinaryInstruction {
  leftProp = PREPEND
}

exports.Merge = class Merge extends BinaryInstruction {
  leftProp = MERGE
}

exports.Insert = class Insert extends BinaryInstruction {
  leftProp = INSERT
  binaryOp = (LEFT,RIGHT) => LEFT(this.index.output('integer'),RIGHT())

  constructor({index,...rest}) {
    super(rest)
    this.index = index;
  }
}

exports.Remove = class Remove extends UnaryInstruction {
  leftProp = REMOVE
}