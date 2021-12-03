const assert = require("assert");
const { CompilerNode } = require("../CompilerNode");
const {
  ASSIGN_TYPE,
  ASSIGN_GET,
  ASSIGN_SET,
  ASSIGN,
  VALUE,
  OUTPUT,
} = require("../symbols");

const { CompilerValue } = require("./CompilerValue");

exports.Selector = class Selector extends CompilerValue {
  [OUTPUT] = {
    ...this[OUTPUT],
    'selector': () => this.spec.format(),
    'selector_single': () => {
      this.assert(this.spec.isSingle,"must select single entity")
      return this.spec.format()
    },
    'test_true':() => `entity ${this.output('selector')}`,
    'data_source': () => `entity ${this.output('selector_single')}`,
    'template_expand': () => `${this.output('selector')}`,
  };
  [VALUE] = {
    ...this[VALUE],
    'raw_component':()=>({
      selector: this.spec.format(),
      separator: ", "
    }),
    'raw_data_source': () => ({entity: this.output('selector_single')}),
  };
    
  constructor({spec,...rest}) {
    super(rest);
    this.spec=spec
  }
}

const CONDITIONS = {
  type: 'resloc_or_tag_mc',
  predicate: 'resloc',
  limit: 'int',
  scores: 'brackets_scores',
  advancements: 'brackets_advancements',
  sort: 'sort_name',
  gamemode: 'gamemode',
  nbt:'nbt',
  level:'range_int',
  distance:'range',
  x_rotation:'range',
  y_rotation:'range',
  x:'number',
  y:'number',
  z:'number',
  dx:'number',
  dy:'number',
  dz:'number',
}

