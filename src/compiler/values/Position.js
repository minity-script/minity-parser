const assert = require("assert");

const {
  OUTPUT,
  VALUE
} = require("../symbols");

const { CompilerValue } = require("./CompilerValue")
const { Direction } = require("./Direction")

const Position = exports.Position = class Position extends CompilerValue {
  [OUTPUT] = {
    ...this[OUTPUT],
    'data_source': () => `block ${this.output('position')}`,
    'template_expand': ()=>this.output('position')
  };
  [VALUE] = {
    ...this[VALUE],
    'raw_data_source': () => ({
      block: this.output('position')
    }),
  };
}



class Directions extends Position {
  constructor({ directions, ...rest }) {
    super(rest)
    this.directions = directions
  };
  [VALUE] = {
    ...this[VALUE],
    'object': () => {
      const ret = { x: 0, y: 0, z: 0 }
      for (const dir of this.directions) {
        const { axis, value } = dir.get('direction');
        ret[axis] += value;
      }
      return ret;
    },
    'array': () => {
      const { x, y, z } = this.get('object');
      return [x, y, z]
    }
  };
}


exports.DirectionRelative = class DirectionRelative extends Direction { }
exports.DirectionsRelative = class PositionRelative extends Directions {
  [OUTPUT] = {
    ...this[OUTPUT],
    'position_relative': () => {
      let { x, y, z } = this.get('object');
      return `~${x || ""} ~${y || ""} ~${z || ""}`
    },
    'position_world': () => this.output('position_relative'),
    'position': () => this.output('position_relative'),
  };
}

exports.DirectionLocal = class DirectionLocal extends Direction { }
exports.DirectionsLocal = class PositionLocal extends Directions {
  [OUTPUT] = {
    ...this[OUTPUT],
    'position_local': () => {
      let { x, y, z } = this.get('object');
      return `^${x || ""} ^${y || ""} ^${z || ""}`
    },
    'position': () => this.output('position_local')
  };
}

exports.PositionLocal = class PositionLocal extends Position  {
  constructor({ x, y, z, ...rest }) {
    super(rest)
    this.x = x
    this.y = y
    this.z = z;
  };
  [OUTPUT] = {
    ...this[OUTPUT],
    'position_local': () => {
      let { x, y, z } = this;
      return `^${x && x.output('number') || ""} ^${y && y.output('number')|| ""} ^${z && z.output('number') || ""}`
    },
    'position': () => this.output('position_local')
  }
}

exports.CoordWorld = class CoordWorld extends CompilerValue {
  constructor({ relative, arg, ...rest }) {
    super(rest)
    this.relative = relative;
    this.arg = arg;
  };
  [OUTPUT] = {
    ...this[OUTPUT],
    'coord_world': () => {
      if (this.relative) return `~${this.arg && this.arg.output('number')||""}`
      return this.arg.output('number')
    }
  }
}

exports.PositionWorld = class PositionWorld extends Position  {
  constructor({ x, y, z, ...rest }) {
    super(rest)
    this.x = x
    this.y = y
    this.z = z;
  };
  [OUTPUT] = {
    ...this[OUTPUT],
    'position_world': () => {
      let { x, y, z } = this;
      return `${x.output('coord_world')} ${y.output('coord_world')} ${z.output('coord_world')}`
    },
    'position': () => this.output('position_world')
  }
}

