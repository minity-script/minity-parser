const assert = require("assert");

const {
  ASSIGN,
  ASSIGN_SCALED,
  OUTPUT,
  ASSIGN_SUCCESS,
  OUTPUT_SCALED,
  APPEND,
  PREPEND,
  MERGE,
  INSERT,
  REMOVE
} = require("../symbols");

const {CompilerValue} = require("./CompilerValue");

const DataPath = class DataPath extends CompilerValue {
  constructor({ path, ...rest }) {
    super(rest)
    this.path = path
  };


  [OUTPUT] = {
    ...this[OUTPUT],
    datapath: () => this.code,
    getter: () => `run data get ${this.code} 1`,
  };

  [OUTPUT_SCALED] = {
    getter: (scale) => `run data get ${this.code} ${scale}`,
  };

  [APPEND] = {
    nbt: value => `data modify ${this.code} append value ${value}`,
    datapath: source => `data modify ${this.code} append from ${source}`,
  };

  [PREPEND] = {
    nbt: value => `data modify ${this.code} prepend value ${value}`,
    datapath: source => `data modify ${this.code} prepend from ${source}`,
  };

  [MERGE] = {
    nbt: value => `data modify ${this.code} merge value ${value}`,
    datapath: source => `data modify ${this.code} merge from ${source}`,
  };

  [INSERT] = {
    nbt: (index,value) => `data modify ${this.code} insert ${index} value ${value}`,
    datapath: (index,source) => `data modify ${this.code} insert ${index} from ${source}`,
  };

  [REMOVE] = () => `data remove ${this.code} `;

  [ASSIGN] = {
    nbt: value => `data modify ${this.code} set value ${value}`,
    datapath: source => `data modify ${this.code} set from ${source}`,
    getter: getter => `execute store result ${this.code} int 1 ${getter}`,
  };
  
  [ASSIGN_SUCCESS] = {
    getter: getter => `execute store success ${this.code} ${getter}`
  };

  [ASSIGN_SCALED] = {
    getter: (getter,scale,type) => `execute store result ${this.code} ${type} ${scale} ${getter}`,
  };

}

exports.DataPathEntity = class DataPathEntity extends DataPath {
  constructor({ selector, ...rest }) {
    super(rest)
    this.selector = selector
    this.code = `entity ${this.selector} ${this.path}`
  }
}

exports.DataPathStorage = class DataPathStorage extends DataPath {
  constructor({ resloc, ...rest }) {
    super(rest)
    this.resloc = resloc
    this.code = `storage ${this.resloc} ${this.path}`
  }
}

exports.DataPathBlock = class DataPathBlock extends DataPath {
  constructor({ position, ...rest }) {
    super(rest)
    this.position = position
    this.code = `block ${this.position} ${this.path}`
  }
}
