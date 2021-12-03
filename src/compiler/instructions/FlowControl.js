const assert = require("assert");
const print=console['log'];
const {
  CODE,
  DECLARE,
  OUTPUT
} = require("../symbols");

const { CompilerInstruction } = require("./CompilerInstruction")
const { CompilerNode } = require("../CompilerNode")

const Statements = exports.Statements = class Statements extends CompilerInstruction {
  constructor({ statements, ...rest }) {
    super(rest);
    this.statements = statements
  }
  [DECLARE] = () => {
    for (const it of this.statements) {
      if (typeof it === 'string') {
        throw new Error
      } else {
        //it.doDeclare()
      }
    }
  };
  [CODE] = () => {
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
  [CODE] = () => "function " + this.restag.output('restag');
}

const MacroCall = exports.MacroCall = class MacroCall extends CompilerInstruction {
  constructor({ resloc, args, ...rest }) {
    super(rest)
    this.resloc = resloc;
    this.args = args;
  };
  [CODE] = () => {
    const {frame,resloc,args} = this;
    let {ns,name} = resloc;
    ns ||= this.frame.ns
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


const ifElseCode = (ns, checks, thenCode, elseCode) => {
  if (!elseCode) {
    return [
      `execute ${checks} run ${thenCode}`
    ]
  }
  const stack = `storage zzz_minity:${ns} stack`;
  const top = `${stack}[-1]`;

  return [
    `data modify ${stack} append value [B;]`,
    `execute ${checks} run data modify ${top} append value 1b`,
    `execute if data ${top}[0] run ${thenCode}`,
    `execute unless data ${top}[0] run ${elseCode}`,
    `data remove ${top}`
  ]
}

const IfElse = exports.IfElse = class IfElse extends CompilerInstruction {
  constructor({ test, then, otherwise, ...rest }) {
    super(rest)
    this.test = test;
    this.then = then;
    this.otherwise = otherwise

  }
  [CODE] = () => {
    const { test, then, otherwise, frame } = this;
    return otherwise
      ? ifElseCode(frame.ns, test.output('test'), then.output('instruction'), otherwise.output('instruction'))
      : `execute ${test.output('test')} run ${then.output('instruction')}`
  }
}

const Repeat = exports.Repeat = class Repeat extends CompilerInstruction {
  constructor({ statements, test, then, ...rest }) {
    super(rest)
    this.test = test;
    this.then = then;
    this.statements = statements

  }
  [CODE] = () => {
    const { test, then, statements, frame } = this;
    const code = statements ? statements.getCode() : [];
    if (!then) {
      return frame.anonFunction(resloc => [
        ...code,
        `execute ${test.output('test')} run function ${resloc}`
      ])
    } else {
      return frame.anonFunction(resloc => [
        ...code,
        ...ifElseCode(frame.ns, test.output('test'), `function ${resloc}`, then.output('instruction'))
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
    const { mods, test, then, statements, frame } = this;
    const code = statements ? statements.getCode() : [];
    let MODS = mods.output('mods');
    if (!then) {
      return [
        `execute ${MODS} run ` + frame.anonFunction(resloc=>[
          ...code,
          `execute ${test.output('test')} ${MODS} run function ${resloc}`
        ])
      ]
    } else {
      return [
        `execute ${MODS} run ` + frame.anonFunction(resloc=>[
          ...code,
          ...ifElseCode(frame.ns, test.output('test'), `execute ${MODS} run function ${resloc}`, then.output('instruction'))
        ])
      ]
    }
  }
}

const After = exports.After = class After extends CompilerInstruction {
  constructor({ time, unit, statements, then, ...rest }) {
    super(rest)
    this.time = time
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
    return `schedule ${fn} ${time.output('time')}`
  }
}

const Every = exports.Every = class Every extends CompilerInstruction {
  constructor({ test, then, statements, time, ...rest }) {
    super(rest)
    this.time = time
    this.then = then
    this.statements = statements
    this.test = test
  }
  [CODE] = () => {
    const { time, unit, then, test, statements, frame } = this;
    const code = statements ? statements.getCode() : [];
    if (!test) {
      const fn = frame.anonFunction(resloc => [
        ...code,
        `schedule function ${resloc} ${time.output('time')}`
      ])
      return `schedule ${fn} ${time.output('time')}`
    }
    if (!then) {
      const fn = frame.anonFunction(resloc => [
        ...code,
        `execute ${test.output('test')} run schedule function ${resloc}`
      ])
      return `schedule ${fn} ${time.output('time')}`
    }
    const fn = frame.anonFunction(resloc => [
      ...code,
      ...ifElseCode(frame.ns, test.output('test'), `schedule function ${resloc} ${time.output('time')}`, then.output('instruction'))
    ])
    return `schedule ${fn} ${time.output('time')}`
  }
}


exports.TestTrue = class TestTrue extends CompilerNode {
  constructor({ arg, ...rest }) {
    super(rest)
    this.arg = arg;
  };

  [OUTPUT] = {
    'test': () => {
      const { arg } = this;
      if (arg.canOutput('test_true')) return `if ${arg.output('test_true')}`
      if (arg.canOutput('test_false')) return `unless ${arg.output('test_false')}`
      this.fail('bad arg ' + arg.describe + " value " +arg.value)
    }
  };
}

exports.TestFalse = class TestFalse extends CompilerNode {
  constructor({ arg, ...rest }) {
    super(rest)
    this.arg = arg;
  };

  [OUTPUT] = {
    'test': () => {
      const { arg } = this;
      if (arg.canOutput('test_true')) return `unless ${arg.output('test_true')}`
      if (arg.canOutput('test_false')) return `if ${arg.output('test_false')}`
      this.fail('bad arg ' + arg.describe )
    }
  };
}

exports.Tests = class Tests extends CompilerNode {
  constructor({ tests, ...rest }) {
    super(rest)
    this.tests = tests;
  };

  [OUTPUT] = {
    'test': () => this.tests.map(it => it.output('test')).join(" ")
  };
}