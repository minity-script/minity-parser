const assert = require("assert");
const { UnaryInstruction, BinaryInstruction } = require("./CompilerInstruction");
const {
  OUTPUT,
  ASSIGN_INC,
  ASSIGN_DEC,
  ASSIGN_ADD,
  ASSIGN_SUB,
  ASSIGN_MUL,
  ASSIGN_DIV,
  ASSIGN_MOD,
  ASSIGN_GT,
  ASSIGN_LT
} = require("../symbols");

exports.AssignInc = class AssignInc extends UnaryInstruction {
  leftProp = ASSIGN_INC
}

exports.AssignDec = class AssignDec extends UnaryInstruction {
  leftProp = ASSIGN_DEC
}

exports.AssignAdd = class AssignAdd extends BinaryInstruction {
  leftProp = ASSIGN_ADD
}
exports.AssignSub = class AssignSub extends BinaryInstruction {
  leftProp = ASSIGN_SUB
}
exports.AssignMul = class AssignMul extends BinaryInstruction {
  leftProp = ASSIGN_MUL
}
exports.AssignDiv = class AssignDiv extends BinaryInstruction {
  leftProp = ASSIGN_DIV
}
exports.AssignMod = class AssignMod extends BinaryInstruction {
  leftProp = ASSIGN_MOD
}
exports.AssignLT = class AssignLT extends BinaryInstruction {
  leftProp = ASSIGN_LT
}
exports.AssignGT = class AssignGT extends BinaryInstruction {
  leftProp = ASSIGN_GT
}