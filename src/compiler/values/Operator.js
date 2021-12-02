const assert = require("assert");
const { basename } = require('path')
const { CompilerNode } = require("../CompilerNode");
const {
  OUTPUT,
  TEST_EQ,
  TEST_LT,
  TEST_LTE,
  TEST_GT,
  TEST_GTE,
} = require("../symbols");
const { CompilerValue } = require("./CompilerValue");

const OpBinary = exports.OpBinary = class OpBinary extends CompilerValue {
  leftProp = null
  //rightProp = OUTPUT
  binaryOp = (LEFT, RIGHT) => LEFT(RIGHT())

  constructor({ left, right, ...rest }) {
    super(rest)
    this.left = left;
    this.right = right;
  };

  outputBinary = (leftProp,binaryOp=(l,r)=>l(r())) => {
    const left = this.left[leftProp]
    this.assert(left, "invalid lvalue " + left?.describe)
    const right = this.right[OUTPUT]
    for (const id in left) {
      if (right[id]) {
        return binaryOp(left[id], right[id])
      }
    }
    this.fail("invalid rvalue")
  };
}

const OpCompare = exports.OpCompare = class OpCompare extends OpBinary {

  [OUTPUT] = {
    ...this[OUTPUT],
    'test_true': () => this.outputBinary(this.leftProp)
  };
}

exports.OpLT = class OpLT extends OpCompare {
  leftProp = TEST_LT
}
exports.OpLTE = class OpLTE extends OpCompare {
  leftProp = TEST_LTE
}

exports.OpGT = class OpGT extends OpCompare {
  leftProp = TEST_GT
}
exports.OpGTE = class OpGTE extends OpCompare {
  leftProp = TEST_GTE
}

exports.OpEQ = class OpEQ extends OpCompare {
  leftProp = TEST_EQ
}
exports.OpNEQ = class OpNEQ extends OpBinary {
  leftProp = TEST_EQ
  [OUTPUT] = {
    ...this[OUTPUT],
    'test_false': () => this.outputBinary(this.leftProp)
  };
}
