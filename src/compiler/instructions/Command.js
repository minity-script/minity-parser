const assert = require("assert");

const {
  CODE,
  OUTPUT
} = require("../symbols");

const { CompilerInstruction } = require("./CompilerInstruction")

const Command = exports.Command = class Command extends CompilerInstruction {
}

const NativeCommand = exports.NativeCommand = class NativeCommand extends Command {
  constructor({ command, ...rest }) {
    super(rest);
    this.command = command
  };
  [CODE] = () => {
    return this.command
  }
}

const CmdSay = exports.CmdSay = class CmdSay extends Command {
  constructor({ line, ...rest }) {
    super(rest);
    this.line = line
  };
  [CODE] = () => {
    const { line } = this
    return `tellraw @a ${JSON.stringify(line)}`
  }
}

const CmdPrint = exports.CmdPrint = class CmdPrint extends Command {
  constructor({ line, ...rest }) {
    super(rest);
    this.line = line
  };
  [CODE] = () => {
    const { line } = this
    return `tellraw @s ${JSON.stringify(line)}`
  }
}

const CmdTell = exports.CmdTell = class CmdTell extends Command {
  constructor({ selector, line, ...rest }) {
    super(rest);
    this.line = line
    this.selector=selector
  };
  [CODE] = () => {
    const { selector, line } = this
    return `tellraw ${selector.output('selector')} ${JSON.stringify(line)}`
  }
}
