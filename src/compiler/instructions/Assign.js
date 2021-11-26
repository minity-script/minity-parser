const assert = require("assert");
const { CompilerInstruction, BinaryInstruction } = require("./CompilerInstruction");
const {
  ASSIGN,
  ASSIGN_SCALED,
  OUTPUT,
  OUTPUT_SCALED,
  ASSIGN_SUCCESS,
  CODE
} = require("../symbols");


const Assign = exports.Assign = class Assign extends BinaryInstruction {
  leftProp = ASSIGN
}

exports.AssignScaled = class AssignScaled extends CompilerInstruction {
  constructor({left,right,scale:{scale,type},...rest}) {
    super(rest)
    this.left = left;
    this.right = right;
    this.scale = scale;
    this.type = type;
  };
[CODE] = ()=> {
    const{left,right,scale,type}=this
    assert(left[ASSIGN] || left[ASSIGN_SCALED], "invalid lvalue in assignment");
    let found
      = maybeFindMatch(left[ASSIGN_SCALED], right[OUTPUT], (LEFT, RIGHT) => LEFT(RIGHT(), scale, type))
      || maybeFindMatch(left[ASSIGN], right[OUTPUT_SCALED], (LEFT, RIGHT) => LEFT(RIGHT(scale, type)))
    assert(found, "invalid rvalue in assignment");
    return found
  }
}

exports.AssignSwap = class AssignSwap extends BinaryInstruction {
  leftProp = ASSIGN_SWAP
}

exports.AssignSuccess = class AssignSuccess extends BinaryInstruction {
  leftProp = ASSIGN_SUCCESS
}

function maybeFindMatch(left, right, cb) {
  for (const id in left) {
    if (right[id]) {
      return cb(left[id], right[id])
    }
  }
  return false;
}
