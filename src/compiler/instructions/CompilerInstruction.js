const assert = require("assert");
const { CompilerNode } = require("../CompilerNode");
const {
  OUTPUT,
  CODE
} = require("../symbols");

const CompilerInstruction = exports.CompilerInstruction = class CompilerInstruction extends CompilerNode {
  makeInstruction = () => {
    const code = [].concat(this[CODE]()).filter(Boolean);
    if (code.length==0) return ""
    if (code.length == 1) return code[0]
    return this.frame.anonFunction(code)
  };
  [CODE] = () => [];
  [OUTPUT] = {
    instruction: this.makeInstruction,
    getter: this.makeInstruction
  }
}

const BinaryInstruction = exports.BinaryInstruction = class BinaryInstruction extends CompilerInstruction {
  leftProp = null
  //rightProp = OUTPUT
  binaryOp = (LEFT, RIGHT) => LEFT(RIGHT())

  constructor({ left, right, ...rest }) {
    //console.log({left,right})
    //process.exit(1)
    super(rest)
    this.left = left;
    this.right = right;
  };
  [CODE] = () => {
    const left = this.left[this.leftProp]
    this.assert(left, "invalid lvalue " + left?.describe)
    const right = this.right[OUTPUT]
    for (const id in left) {
      if (right[id]) {
        return this.binaryOp(left[id], right[id])
      }
    }
    this.fail("invalid rvalue")
  };
}

const UnaryInstruction = exports.UnaryInstruction = class UnaryInstruction extends CompilerInstruction {
  leftProp = null
  constructor({ left, ...rest }) {
    super(rest)
    this.left = left;
  };
  [CODE] = () => {
    const { left, leftProp } = this;
    const LEFT = left[leftProp]
    this.assert(LEFT, "invalid operand");
    return LEFT()
  }
}