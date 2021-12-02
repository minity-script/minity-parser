const assert = require("assert");
const { CompilerInstruction } = require("./CompilerInstruction");
const { CompilerNode } = require("../CompilerNode");
const {
  ASSIGN,
  ASSIGN_SCALED,
  OUTPUT,
  OUTPUT_SCALED,
  CODE,
  MOD_ARG
} = require("../symbols");

const Execute = exports.Execute = class Execute extends CompilerInstruction {
  constructor({mods,executable,...rest}) {
    super(rest)
    this.mods = mods;
    this.executable = executable;
  }

  [CODE] = () => {
    return `execute ${this.mods.output('mods')} run ${this.executable.output('instruction')}`
  };
}
const Mods = exports.Mods = class Mods extends CompilerNode {
  constructor({mods,...rest}) {
    super(rest)
    this.mods = mods;
  };
  [OUTPUT] = {
    'mods': () => this.mods.map(it=>it.output('mod')).join(" ")
  }
}

const Mod = exports.Mod = class Mod extends CompilerNode {
  constructor({arg,...rest}) {
    super(rest)
    this.arg = arg;
  };
  [OUTPUT] = {
    'mod': () => {
      if (this.oldStyle) return this.oldStyle(this.arg);
      for (const type in this[MOD_ARG]) {
        if (this.arg.canOutput(type)) {
          return this[MOD_ARG][type](this.arg.output(type))
        }
      }
      this.fail('bad arg')
    }
  }
}


exports.ModAlign = class ModAlign extends Mod {
  oldStyle = axes => `align ${axes}`
}

exports.ModAnchored = class ModAnchored extends Mod {
  oldStyle = anchor => `anchored ${anchor}`
}

exports.ModAs = class ModAs extends Mod {
  [MOD_ARG] = {
    selector: selector => `as ${selector}`
  }
}

exports.ModAt = class ModAt extends Mod {
  [MOD_ARG] = {
    selector: selector => `at ${selector}`
  }
}

exports.ModFor = class ModAt extends Mod {
  [MOD_ARG] = {
    selector: selector => `as ${selector} at @s`
  }
}

exports.ModFacing = class ModFacing extends Mod {
  oldStyle = ([selector,anchor]) => `facing ${selector} ${anchor||'eyes'}`
}

exports.ModIn = class ModIn extends Mod {
  [MOD_ARG] = {
    resloc: resloc => `in $${resloc}`
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

exports.ModPositioned = class ModPositioned extends Mod {
  [MOD_ARG] = {
    position: position => `positioned ${position}`
  }
}

exports.ModRotated = class ModRotated extends Mod {
  [MOD_ARG] = {
    rotation: rotation => `rotated ${rotation}`
  }
}

