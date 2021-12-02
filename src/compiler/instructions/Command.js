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

const CmdTag = exports.CmdTag = class CmdTag extends Command {
  constructor({ selector, tag, ...rest }) {
    super(rest);
    this.tag = tag
    this.selector=selector
  };
  [CODE] = () => {
    const { selector, tag } = this
    return `tag ${selector.output('selector')} add ${tag.output('tag')}`
  }
}

const CmdUntag = exports.CmdUntag = class CmdUntag extends Command {
  constructor({ selector, tag, ...rest }) {
    super(rest);
    this.tag = tag
    this.selector=selector
  };
  [CODE] = () => {
    const { selector, tag } = this
    return `tag ${selector.output('selector')} remove ${tag.output('tag')}`
  }
}


const CmdBossbarAdd = exports.CmdBossbarAdd = class CmdBossbarAdd extends Command {
  constructor({ resloc, name, ...rest }) {
    super(rest);
    this.resloc = resloc
    this.name = name
  };
  [CODE] = () => {
    const { resloc, name } = this
    if (name) return `bossbar add ${resloc.output('resloc')} ${name.output('json')}`
    else return `bossbar add ${resloc.output('resloc')}`
  }
}

const CmdBossbarRemove = exports.CmdBossbarRemove = class CmdBossbarRemove extends Command {
  constructor({ resloc, ...rest }) {
    super(rest);
    this.resloc = resloc
  };
  [CODE] = () => {
    const { resloc } = this
    return `bossbar remove ${resloc.output('resloc')}`
  }
}