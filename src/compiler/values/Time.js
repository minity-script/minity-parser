const assert = require("assert");

const {
  OUTPUT,
  VALUE
} = require("../symbols");

const { CompilerValue } = require("./CompilerValue")


exports.Time = class Time extends CompilerValue {
  constructor({ value, unit, ...rest }) {
    super(rest)
    this.value = value;
    this.unit = unit;
  };
  [OUTPUT] = {
    ...this[OUTPUT],
    'time': () => `${this.value.output('number')}${this.unit}`
  }
}
