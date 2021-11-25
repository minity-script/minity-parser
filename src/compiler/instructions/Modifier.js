const assert = require("assert");
const { CompilerInstruction } = require("./CompilerInstruction");
const {
  ASSIGN,
  ASSIGN_SCALED,
  OUTPUT,
  OUTPUT_SCALED
} = require("../symbols");


const Mod = exports.Mod = class Mod extends CompilerInstruction {
  constructor({arg,...rest}) {
    super(rest)
    this.arg = arg;
  }

  [OUTPUT] = {
    instruction: () => `execute ${this.output('mod')}`,
    mod: () => {
      left = findMatch(this[MOD_ARG],this.arg[OUTPUT],(LEFT,RIGHT)=>LEFT(RIGHT))
      right = findMatch(this[MOD_RIGHT],this.right[OUTPUT],(LEFT,RIGHT)=>LEFT(RIGHT))
      return `${left},${right}`;
    }
  }

  [MOD_RIGHT] = {
    mod: (left,right) => `${left} ${right}`,
    instruction: (left,right) => `${left} run ${right}`,
  }
}

exports.ModAs = class ModAs extends Mod {
  [MOD_ARG] = {
    selector: selector => `às ${selector}`
  }
}

exports.ModFor = class ModAs extends Mod {
  [MOD_ARG] = {
    selector: selector => `às ${selector} at @s`
  }
}

exports.ModAt = class ModAs extends Mod {
  [MOD_ARG] = {
    selector: selector => `àt ${selector}`
  }
}

exports.ModPositionedAs = class ModAs extends Mod {
  [MOD_ARG] = {
    selector: selector => `positioned as ${selector}`
  }
}

exports.ModRotatedAs = class ModAs extends Mod {
  [MOD_ARG] = {
    selector: selector => `positioned as ${selector}`
  }
}

exports.ModRotatedAs = class ModIn extends Mod {
  [MOD_ARG] = {
    resloc_mc: resloc => `in ${resloc}`
  }
}