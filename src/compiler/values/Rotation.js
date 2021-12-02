const assert = require("assert");

const {
  OUTPUT,
  VALUE
} = require("../symbols");

const { CompilerValue } = require("./CompilerValue")
const { Direction } = require("./Direction")

const Rotation = exports.Rotation = class Rotation extends CompilerValue {}
class Angles extends Rotation {
  constructor({ directions, ...rest }) {
    super(rest)
    this.directions = directions
  };
  [VALUE] = {
    ...this[VALUE],
    'object': () => {
      const ret = { x: 0, y: 0 }
      for (const dir of this.directions) {
        const { axis, value } = dir.get('direction');
        ret[axis] += value;
      }
      return ret;
    },
    'array': () => {
      const { x, y } = this.get('object');
      return [x, y ]
    }
  };
}

exports.AngleRelative = class DirectionRelative extends Direction { }
exports.AnglesRelative = class AnglesRelative extends Angles {
  [OUTPUT] = {
    ...this[OUTPUT],
    'rotation_relative': () => {
      let { x, y } = this.get('object');
      return `~${x || ""} ~${y || ""}`
    },
    'rotation_world': () => this.output('position_relative'),
    'rotation': () => this.output('position_relative'),
  };
}

exports.RotationWorld = class RotationWorld extends Rotation  {
  constructor({ x, y, ...rest }) {
    super(rest)
    this.x = x
    this.y = y
  };
  [OUTPUT] = {
    ...this[OUTPUT],
    'rotation_world': () => {
      let { x, y } = this;
      return `${x.output('coord_world')} ${y.output('coord_world')}`
    },
    'rotation': () => this.output('position_world')
  }
}
