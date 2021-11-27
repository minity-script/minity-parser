const assert = require("assert");
const print=console['log'];
const {
  CODE,
  DECLARE
} = require("../symbols");

const { CompilerInstruction } = require("./CompilerInstruction")

const Statements = exports.Statements = class Statements extends CompilerInstruction {
  constructor({ statements, ...rest }) {
    super(rest);
    this.statements = statements
  }
  [DECLARE] = () => {
    for (const it of this.statements) {
      if (typeof it === 'string') {
        console.log('STRING',{it})
        throw new Error
      } else {
        //it.doDeclare()
      }
    }
  };
  [CODE] = () => {
    //console.log(this.statements)
    return this.statements.flatMap(it => typeof it === 'string' ? it : it[CODE]()).filter(Boolean);
  }
}

const Reject = exports.Reject = class Reject extends CompilerInstruction {
  [CODE] = () => this.frame.reject;
}

const Resolve = exports.Resolve = class Resolve extends CompilerInstruction {
  [CODE] = () => this.frame.resolve;
}

const CallSelf = exports.CallSelf = class CallSelf extends CompilerInstruction {
  [CODE] = () => this.frame.callSelf();
}

const CallFunctionTag = exports.CallFunctionTag = class CallFunctionTag extends CompilerInstruction {
  constructor({ restag, ...rest }) {
    super(rest)
    this.restag = restag;
  };
  [CODE] = () => "function " + this.restag;
}

const MacroCall = exports.MacroCall = class MacroCall extends CompilerInstruction {
  constructor({ resloc, args, ...rest }) {
    super(rest)
    this.resloc = resloc;
    this.args = args;
  };
  [CODE] = () => {
    const {frame,resloc,args} = this;
    const {ns,name} = resloc;
    const {macroExists,functionExists,expandMacro} = frame;
    if (macroExists(ns, name)) {
      return expandMacro(ns, name, args)
    }
    if (!args ) {
      if (!functionExists(ns, name)) print('Warning: Calling undeclared (external?) function ' + ns + ":" + name);
      return `function ${ns}:${name}`;
    }
    this.fail(`no such macro ${ns}:${name}`)
  }
}


const IfElse = exports.IfElse = class IfElse extends CompilerInstruction {
  constructor({ arg, then, otherwise, ...rest }) {
    super(rest)
    this.arg = arg;
    this.then = then;
    this.otherwise = otherwise

  }
  [CODE] = () => {
    const { arg, then, otherwise } = this;
    return otherwise
      ? this.frame.ifElse(arg, then.output('instruction'), otherwise.output('instruction'))
      : `execute ${arg} run ${then.output('instruction')}`
  }
}

const Repeat = exports.Repeat = class Repeat extends CompilerInstruction {
  constructor({ statements, conds, then, ...rest }) {
    super(rest)
    this.conds = conds;
    this.then = then;
    this.statements = statements

  }
  [CODE] = () => {
    const { conds, then, statements, frame } = this;
    const code = statements ? statements.getCode() : [];
    if (!then) {
      return frame.anonFunction(resloc => [
        '#REPEAT',
        ...code,
        `execute ${conds} run function ${resloc}`
      ])
    } else {
      return frame.anonFunction(resloc => [
        '#REPEAT_THEN',
        ...code,
        ...frame.ifElse(conds, `function ${resloc}`, then.output('instruction'))
      ])
    }
  }
}

const RepeatWithMods = exports.RepeatWithMods = class RepeatWithMods extends Repeat {
  constructor({ mods, ...rest }) {
    super(rest)
    this.mods = mods;
  }
  [CODE] = () => {
    const { mods, conds, then, statements, frame } = this;
    const code = statements ? statements.getCode() : [];
    let MODS = mods.output('mods');
    if (!then) {
      return [
        `execute ${MODS} run ` + frame.anonFunction(resloc=>[
          ...code,
          `execute ${conds} ${MODS} run function ${resloc}`
        ])
      ]
    } else {
      return [
        `execute ${MODS} run ` + frame.anonFunction(resloc=>[
          ...code,
          ...frame.ifElse(conds, `execute ${MODS} run function ${resloc}`, then.output('instruction'))
        ])
      ]
    }
  }
}

const After = exports.After = class After extends CompilerInstruction {
  constructor({ time, unit, statements, then, ...rest }) {
    super(rest)
    this.time = time
    this.unit = unit
    this.then = then
    this.statements = statements
  }
  [CODE] = () => {
    const { time, unit, then, statements, frame } = this;
    const code = statements ? statements.getCode() : [];
    const thenCode = then ? then.getCode() : [];
    const fn = frame.anonFunction([
      ...code,
      ...thenCode
    ])
    return `schedule ${fn} ${time}${unit}`
  }
}

const Every = exports.Every = class Every extends CompilerInstruction {
  constructor({ conds, then, statements, time, unit, ...rest }) {
    super(rest)
    this.time = time
    this.unit = unit
    this.then = then
    this.statements = statements
    this.conds = conds
  }
  [CODE] = () => {
    const { time, unit, then, conds, statements, frame } = this;
    const code = statements ? statements.getCode() : [];
    if (!conds) {
      const fn = frame.anonFunction(resloc => [
        ...code,
        `schedule function ${resloc} ${time}${unit}`
      ])
      return `schedule ${fn} ${time}${unit}`
    }
    if (!then) {
      const fn = frame.anonFunction(resloc => [
        ...code,
        `execute ${conds} run schedule function ${resloc}`
      ])
      return `schedule ${fn} ${time}${unit}`
    }
    const fn = frame.anonFunction(resloc => [
      ...code,
      ...frame.ifElse(conds, `schedule function ${resloc} ${time}${unit}`, then.output('instruction'))
    ])
    return `schedule ${fn} ${time}${unit}`
  }
}