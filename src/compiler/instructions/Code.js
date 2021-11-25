const assert = require("assert");

const {
  CODE,
  DECLARE
} = require("../symbols");

const {CompilerInstruction} = require("./CompilerInstruction")

const CodeBlock = exports.CodeBlock = class Command extends CompilerInstruction {
  [DECLARE] = () => this.statements.flatMap(it=>typeof it === 'string' ? [] : it[DECLARE]()).filter(Boolean);
  [CODE] = () => this.statements.flatMap(it=>typeof it === 'string' ? it : it[CODE]()).filter(Boolean);
}

const Reject = exports.Reject = class Reject extends CompilerInstruction {
  [CODE] = () => this.frame.reject;
}

const Resolve = exports.Resolve = class Resolve extends CompilerInstruction {
  [CODE] = () => this.frame.resolve;
}

const CallSelf = exports.CallSelf = class CallSelf extends CompilerInstruction {
  [CODE] = () => "function " + this.frame.resloc;
}

const CallFunctionTag = exports.CallFunctionTag = class CallFunctionTag extends CompilerInstruction {
  constructor({restag,...rest}) {
    super(rest)
    this.restag = restag;
  }
  [CODE] = () => "function " + this.restag;
}
