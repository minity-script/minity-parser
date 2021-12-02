const assert = require("assert");

const {
  CONVERT,
  OUTPUT
} = require("../symbols");

const { CompilerValue } = require("./CompilerValue")

const BlockSpec = exports.BlockSpec = class BlockSpec extends CompilerValue {
  constructor({ resloc, states, nbt, ...rest }) {
    super(rest);
    this.resloc = resloc
    this.states = states
    this.nbt = nbt;
  };
  [OUTPUT] = {
    ...super[OUTPUT],
    'block_spec': () => (
      this.resloc.output('resloc_or_tag_mc') 
      + (this.states ? this.states.output('block_states') : "")
      + (this.nbt ? this.nbt.output('nbt') : "")
    ),
    'test_true': () => `block ~ ~ ~ ${this.output('block_spec')}`
  };
}

const BlockPredicate = exports.BlockPredicate = class BlockPredicate extends CompilerValue {
  constructor({ block, position, ...rest }) {
    super(rest);
    this.block = block
    this.position = position
  };
  [OUTPUT] = {
    ...super[OUTPUT],
    'test_true': () => `block ${this.position.output('position')} ${this.block.output('block_spec')}`
  };
}