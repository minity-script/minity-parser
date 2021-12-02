const assert = require("assert");
const { CompilerNode } = require("../CompilerNode");

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
  REMOVE,
  VALUE
} = require("../symbols");

const {CompilerValue} = require("./CompilerValue");

const DataPath = class DataPath extends CompilerValue {
  constructor({ path, ...rest }) {
    super(rest)
    this.path = path
  };

   
  [OUTPUT] = {
    ...this[OUTPUT],
    'datapath': () => this.code,
    'getter': () => `run data get ${this.code} 1`,
    'test_true': () => `data ${this.code}`,
    'template_expand': () => this.code
  };

  [OUTPUT_SCALED] = {
    'getter': (scale) => `run data get ${this.code} ${scale}`,
  };

  [APPEND] = {
    'nbt': value => `data modify ${this.code} append value ${value}`,
    'datapath': source => `data modify ${this.code} append from ${source}`,
  };

  [PREPEND] = {
    'nbt': value => `data modify ${this.code} prepend value ${value}`,
    'datapath': source => `data modify ${this.code} prepend from ${source}`,
  };

  [MERGE] = {
    'nbt': value => `data modify ${this.code} merge value ${value}`,
    'datapath': source => `data modify ${this.code} merge from ${source}`,
  };

  [INSERT] = {
    'nbt': (index,value) => `data modify ${this.code} insert ${index} value ${value}`,
    'datapath': (index,source) => `data modify ${this.code} insert ${index} from ${source}`,
  };

  [REMOVE] = () => `data remove ${this.code} `;

  [ASSIGN] = {
    'nbt': value => `data modify ${this.code} set value ${value}`,
    'datapath': source => `data modify ${this.code} set from ${source}`,
    'getter': getter => `execute store result ${this.code} int 1 ${getter}`,
  };
  
  [ASSIGN_SUCCESS] = {
    'getter': getter => `execute store success ${this.code} ${getter}`
  };

  [ASSIGN_SCALED] = {
    'getter': (getter,scale,type) => `execute store result ${this.code} ${type} ${scale} ${getter}`,
  };

}

exports.DataPathGeneric = class DataPathGeneric extends DataPath {
  constructor({ left,...rest }) {
    super(rest)
    this.left = left
    this.code = `${this.left.output('data_source')} ${this.path}`
  }
  [VALUE] = {
    ...this[VALUE],
    'raw_component':()=>({
      ...this.left.get('raw_data_source'),
      path:this.path
    }),
  };
}

exports.DataPathVar = class DataPathVar extends DataPath {
  constructor({...rest }) {
    super(rest)
    this.storage = `${this.frame.ns}:minity_vars`
    this.code = `storage ${this.storage} ${this.path}`
  }
  [VALUE] = {
    ...this[VALUE],
    'raw_component':()=>({
      storage: this.storage,
      path:this.path
    }),
  };
}
