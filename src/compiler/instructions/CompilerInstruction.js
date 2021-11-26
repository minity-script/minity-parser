const assert = require("assert");
const {basename}=require('path')
const { CompilerNode } = require("../CompilerNode");
const {
  OUTPUT,
  CODE,
  DECLARE
} = require("../symbols");

const CompilerInstruction = exports.CompilerInstruction = class CompilerInstruction extends CompilerNode {
  makeInstruction = () => {
    const code = this.getCode();
    if (code.length==0) return ""
    if (code.length == 1) return code[0]
    const {file,start:{line}} = this.location;
    return this.frame.anonFunction([
      `# ${basename(file)}:${line}`,
      ...code
    ])
  };
  getCode = () => {
    const code = [].concat(this[CODE]()).filter(Boolean);
    for (const line of code) {
      if (typeof line === 'object') {
        console.log(line?.describe)
        throw new Error("WQR")
        process.exit(-1)
      }
    }
    
    return code;
  };
  doDeclare = () => {
    //console.log('doDeclare',this.describe)
    return this[DECLARE]();
  };
  [CODE] = () => [];
  [DECLARE] = () => [];
  [OUTPUT] = {
    instruction: this.makeInstruction,
    getter: ()=> `run ${this.makeInstruction()}`
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