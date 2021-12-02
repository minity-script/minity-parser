const { MinityError } = require("./utils");
const  assert  = require('assert')

const CONDITION_OUTPUTS = {
  type:'resloc_or_tag_mc',
  predicate: 'resloc',
  x:'number', dx:'number',
  y:'number', dy:'number',
  z:'number', dz:'number',
  limit: 'number',
  sort: null,
  gamemode: null,
  team: 'team',
  tag: 'tag',
  name: 'string',
  nbt: 'nbt',
  level: null,
  distance: null,
}

exports.Selector = class SelectorSpec {
  includes = {}
  excludes = {}
  scores = {}
  initial = "e";

  limit = null

  constructor({initial,type}) {
    if (!initial) {
      this.initial = "e";
      this.include("type", type, true)
    } else {
      this.initial = initial;
    }
  }

  get isSingle() {
    return this.limit === 1 || this.initial.match(/[psr]/)
  }

  outputCondition(key,cond,transform) {
    assert (key in CONDITION_OUTPUTS, 'bad condition '+key);
    if (!transform) return cond;
    if (!cond) return ""
    const type = CONDITION_OUTPUTS[key];
    if (!type) return cond
    return cond.output(type)
  }

  include(key, cond, transform) {
    if (false && key=='predicate') {
      console.log({key,cond,transform})
      throw {message:'PREDICATE'}
      process.exit(0)
    }
    cond = this.outputCondition(key,cond,transform)
    switch (key) {
      case "limit":
        this.limit = cond
      case "x": case "dx":
      case "y": case "dy":
      case "z": case "dz":
      case "x_rotation":
      case "y_rotation":
      case "distance":
      case "type":
      case "sort":
      case "team":
      case "level":
      case "gamemode":
      case "name":
      case "advancements":
        if (key in this.includes) throw new MinityError("cannot duplicate " + key + "=");
      case "nbt":
      case "tag":
      case "predicate":
        this.includes[key] ??= []
        this.includes[key].push(cond);
        break;
      default:
        throw new MinityError("cannot use " + key + "=");
    }
  }
  score(key, cond) {
    if (key in this.scores) throw new MinityError("cannot duplicate score " + key);
    this.scores[key] = cond;
  }
  exclude(key, cond,transform) {
    cond = this.outputCondition(key,cond,transform)
    switch (key) {
      case "name":
      case "nbt":
      case "type":
      case "tag":
      case "team":
      case "gamemode":
      case "predicate":
        this.excludes[key] ??= []
        this.excludes[key].push(cond);
        break;
      default:
        throw new MinityError("cannot use " + key + "=!");
    }
  }
  format() {
    const conditions = [];
    const { initial, includes, excludes, scores } = this;
    for (const key in includes) {
      for (const value of includes[key]) {
        conditions.push(`${key}=${value}`)
      }
    }
    for (const key in excludes) {
      for (const value of excludes[key]) {
        conditions.push(`${key}=!${value}`)
      }
    }
    if (Object.keys(scores).length > 0) {
      const parts = [];
      for (const key in scores) {
        parts.push(`${key}=${scores[key]}`)
      }
      conditions.push(`scores={${parts.join(",")}}`)
    }
    if (conditions.length === 0) return `@${initial}`;
    return `@${initial}[${conditions.join(",")}]`
  }
}

exports.SelectorUUID = class SelectorUUID {
  constructor(uuid) {
    this.uuid = uuid
  }

  get isSingle() {
    return true
  }
  format() {
    return JSON.stringify(this.uuid);
  }    
}