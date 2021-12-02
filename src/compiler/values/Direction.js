const assert = require("assert");

const {
  OUTPUT,
  VALUE
} = require("../symbols");

const { CompilerValue } = require("./CompilerValue")

const DIRECTIONS = {
  'east': { axis: 'x', sign: +1 },
  'west': { axis: 'x', sign: -1 },
  'up': { axis: 'y', sign: +1 },
  'down': { axis: 'y', sign: -1 },
  'south': { axis: 'z', sign: +1 },
  'north': { axis: 'z', sign: -1 },

  'left': { axis: 'x', sign: +1 },
  'right': { axis: 'x', sign: -1 },
  'upward': { axis: 'y', sign: +1 },
  'downward': { axis: 'y', sign: -1 },
  'forward': { axis: 'z', sign: +1 },
  'back': { axis: 'z', sign: -1 },

}

const Direction = exports.Direction = class Direction extends CompilerValue {
  constructor({ direction, arg, ...rest }) {
    super(rest)
    this.direction = direction;
    this.arg = arg;
    const {axis,sign} = DIRECTIONS[direction];
    this.axis = axis;
    this.sign = sign;
  };
  [VALUE] = {
    ...this[VALUE],
    'direction': () => ({
      axis: this.axis,
      value: this.sign * this.arg.get('float')
    })
  }
}
