const { ValueNode } = require("./ValueNode.js");

class MclError extends Error {
  constructor(message, location) {
    super(message);
    this.location = location;
  }
}

const TreeNode = exports.TreeNode = class TreeNode {
  constructor($, props, location) {
    this.$ = $;
    this.location = location;
    if (!this.location) {
      debugger;
    }
    Object.assign(this, props);
    this.transformer = transformers[this.$];
    if (!this.transformer) throw "no transformer for " + this.$;
  }
  transform = (frame, proxy = this) => {
    try {
      return this.transformer(proxy, frame)
    } catch (e) {
      console.log([...e.stack.split("\n    at").slice(0, 3), "    ...."].join("\n    at"))
      e.location = this.location;
      throw (e)
    }
  }
  assert = (test, message) => {
    if (!test) {
      console.log(this)
      throw new MclError(message, this.location)
    }
  }
}

const transformers = {
  VALUE: node => node,
  literal: (node, frame) => ValueNode.fromLiteral(node, frame),
  file: ({ namespaces }, { T }) => {
    namespaces.map(T);
  },
  declare_var: ({ name, value }, { T, declareVar, varId }) => {
    declareVar(name);
    value = value ? T(value) : 0;
    return "scoreboard players set " + varId(name) + " " + value;
  },
  declare_score: ({ name, criterion }, { T, declareScore }) => {
    declareScore(name, criterion);
    return "";
  },
  namespace: ({ ns, globals }, { createChild, addBlock, addFunctionTag }) => {
    const S = createChild({ ns, scope: ns });
    const ret = globals.map(S).filter(Boolean);
    const lines = [
      `scoreboard objectives add mcl.${ns} dummy`,
      ...ret
    ]
    const fn = addBlock(lines);
    fn.addTag("minecraft", "load");
  },
  selector: ({ head, conditions }, { T }) => {
    var { initial, conds = [] } = T(head);
    conds = conds.concat(conditions.map(T));
    return "@" + initial + "[" + conds.join(",") + "]"
  },
  cond_brackets({ name, op, value }, { T }) {
    return name + op + T(value);
  },
  cond_brackets_pair: ({ name, value }, { T }) => T(name) + "=" + T(value),
  cond_brackets_braces: ({ items }, { T }) => "{" + items.map(T).join(",") + "}",
  block_spec_state: ({ name, value }, { T }) => T(name) + "=" + T(value),
  block_spec_states: ({ states }, { T }) => "[" + states.map(T).join(",") + "]",
  block_spec: ({ resloc, states, nbt }, { T }) => {
    let ret = T(resloc);
    if (states) ret += T(states);
    if (nbt) ret += T(nbt);
    return ret;
  },
  test_block({ spec }, { T }) {
    return "block ~ ~ ~ " + T(spec)
  },
  resloc(node, { T, ns }) {
    return (node.ns ? T(node.ns) : ns) + ":" + T(node.name);
  },
  resloc_mc(node, { T }) {
    return (node.ns ? T(node.ns) : "minecraft") + ":" + T(node.name);
  },
  restag(node, { T, ns }) {
    return (node.ns ? T(node.ns) : ns) + ":#" + T(node.name);
  },
  restag_mc(node, { T }) {
    return (node.ns ? T(node.ns) : "minecraft") + ":#" + T(node.name);
  },
  initial(node) {
    return { initial: node.initial };
  },
  initial_type(node, { T }) {
    return { initial: "e", conds: ["type=" + T(node.type, "minecraft")] };
  },
  execute(node, { T }) {
    return "execute " + node.mods.map(T).join(" ") + " run " + T(node.code)
  },
  mod_as(node, { T }) {
    return "as " + T(node.selector)
  },
  mod_at(node, { T }) {
    return "at " + T(node.selector)
  },
  mod_for(node, { T }) {
    return "as " + T(node.selector) + " at @s"
  },
  mod_if(node, { T }) {
    return "if " + T(node.test)
  },
  mod_unless(node, { T }) {
    return "unless " + T(node.test)
  },
  mod_pos:({pos}, { T }) => `positioned ${T(pos)}`,
  mod_dir:({mods}, { T }) => {
    const pos = { x: 0, y: 0, z: 0 }
    for (const { dir, off, f } of mods) pos[dir] += T(off).value * f;
    return `positioned ~${pos.x} ~${pos.y} ~${pos.z}`
  },
  mod_rotated:({pos}, { T }) => `rotated ${T(pos)}`,
  mod_rot: ({mods}, { T }) => {
    const pos = { x: 0, y: 0 }
    console.log(mods)
    for (const { dir, off, f } of mods) pos[dir] += T(off).value * f;
    return `rotated ~${pos.x} ~${pos.y}`
  },
  pos_abs(node, { T }) {
    return [T(node.x), T(node.y), T(node.z)].join(" ")
  },
  pos_mod({mods}, { T }) {
    const pos = { x: 0, y: 0, z: 0 }
    for (const { dir, off, f } of mods) pos[dir] += T(off).value * f;
    return `~${pos.x} ~${pos.y} ~${pos.z}`
  },
  pos_from(node, { T }) {
    return "^" + [T(node.x), T(node.y), T(node.z)].join(" ^")
  },
  rot_abs(node, { T }) {
    return [T(node.x), T(node.y)].join(" ")
  },
  rot_mod({mods}, { T }) {
    const pos = { x: 0, y: 0, z: 0 }
    for (const { dir, off, f } of mods) pos[dir] += T(off).value * f;
    return `~${pos.x} ~${pos.y}`
  },
  range(node, { T }) {
    return T(node.from) + ".." + T(node.to);
  },
  range_from(node, { T }) {
    return T(node.from) + "..";
  },
  range_to(node, { T }) {
    return ".." + T(node.to);
  },
  command(node, { T }) {
    return T(node.command)
  },
  cmd_summon: ({ pos, type, nbt, then }, { T, addBlock }) => {
    if (!then) return `give ${pos ? T(pos) :"~ ~ ~"} ${T(type)}${nbt ? T(nbt).format() : ''}`
    
    nbt = nbt ? T(nbt).value : {};
    nbt.Tags = [...nbt.Tags||[],"_mclang_summoned_"];
    nbt = JSON.stringify(nbt);
    return "function " + addBlock([
      `summon ${T(type)} ${pos ? T(pos) :"~ ~ ~"} ${nbt}`,
      `execute as @e[tag=_mclang_summoned_] run function `+ addBlock([
      'tag @s remove _mclang_summoned_',
        ... then.statements.map(T)
      ]).resloc
    ]).resloc
  },
  cmd_give: ({ selector, type, nbt }, { T }) => {
    return `give ${T(selector)} ${T(type)}${nbt ? T(nbt).format() : ''}`
  },
  cmd_after: ({ time, unit, fn }, { T, addBlock }) => {
    return `schedule ${T(fn)} ${T(time).value}${unit}`
  },
  cmd_setblock: ({ pos, block }, { T }) => {
    return `setblock ${pos ? T(pos) :"~ ~ ~"} ${T(block)}`
  },
  code(node, { T, addBlock }) {
    const lines = node.statements.map(T);
    return "function " + addBlock(lines).resloc;

  },
  code_resloc(node, { T, addBlock }) {
    const lines = node.statements.map(T);
    return addBlock(lines).resloc;
  },
  function: ({ name, tags, statements }, { T, addFunction, createChild }) => {
    const S = createChild({ scope: name });
    const lines = statements.map(S);;
    const fn = addFunction(name, lines);
    for ({ ns, name } of tags) {
      fn.addTag(T(ns), T(name));
    }
    return "";
  },
  macro(node, { T, macros }) {
    macros[node.name] = node;
    return "";
  },
  macro_call(node, { T, createChild, macros }) {
    const macro = macros[node.name];
    const new_args = {};
    for (const i in macro.args) {
      const { name, def } = macro.args[i];
      const { named, numbered } = node.args;
      if (name in named) {
        new_args[name] = T(named[name])
      } else if (i in numbered) {
        new_args[name] = T(numbered[i])
      } else if (def) {
        new_args[name] = T(def)
      } else {
        throw new Error("arg " + name + " in macro " + macro.name + " is not optional")
      }
    }
    const C = createChild({ args: new_args });
    const ret = macro.statements.map(C);
    if (ret.length < 2) return ret[0];
    return "function " + addBlock(ret).resloc;
  },
  arg(node, { args, files }) {
    return args[node.name].convert(node.type);
  },
  if_else(node, { T, ns, addBlock }) {
    return "function " + addBlock([
      `data modify storage mcl:${ns} stack append value []`,
      `execute ${node.head} ${T(node.test)} run data modify storage mcl:${ns} stack[-1] append value 1b`,
      `execute if data storage mcl:${ns} stack[-1][0] run ${T(node.code)}`,
      `execute unless data storage mcl:${ns} stack[-1][0] run ${T(node._else)}`,
      `data remove storage mcl:${ns} stack[-1]`
    ]).resloc;
  },
  function_call({ resloc }, { T, ns }) {
    return "function " + T(resloc);
  },
  json(node, { T }) {
    return T(node.json)
  },
  datapath: ({ head, path }, { T }) => `${T(head)} ${T(path)}`,

  datapath_var: ({ path }, { T, ns }) => `storage ${ns}:mcl_vars ${T(path)}`,
  datahead_entity: ({ selector }, { T }) => `entity ${T(selector)}`,
  datahead_storage: ({ name }, { T }) => `storage ${T(name)}`,
  assign_datapath_value: ({ left, right }, { T }) => `data modify ${T(left)} set value ${T(right)}`,
  assign_datapath_scoreboard(node, { T }) {
    return "execute store result " + T(node.left) + " run scoreboard players get " + T(node.right);
  },
  assign_datapath_datapath(node, { T }) {
    return "data modify " + T(node.left) + " set from " + T(node.right);
  },
  assign_datapath_statement(node, { T }) {
    return "execute store result " + T(node.left) + " run " + T(node.right);
  },
  print: ({ selector, parts }, { T }) => {
    return "tellraw " + (selector ? T(selector) : "@s") + " " + JSON.stringify(parts.map(T));
  },
  print_var: ({ name, assert }, { T, varExists, varName, varObjective }) => {
    assert(varExists(name), "undeclared var $" + name);
    return { score: { name: varName(name), objective: varObjective(name) } }
  },
  print_value: ({ value }, { T }) => {
    return { text: T(value).format() }
  },
  print_string: ({ value }, { T }) => {
    return { text: T(value).value }
  },
  print_space: () => {
    return { text: " " }
  },
  delete_datapath: ({ path }, { T }) => `data remove ${T(path)}`,
  template_chars: ({ chars }) => chars,
  template_parts: ({ parts }, { T }) => parts.map(T).join(""),
  template_expand_arg: ({ name }, { T, args }) => {
    return args[T(name)].convert("string").value
  },
  template_expand_tag: ({ name }, { T, tagId }) => {
    return tagId(T(name))
  },
  template_expand_var: ({ name }, { T, varId }) => {
    return varId(T(name))
  },
  template_expand_score: ({ name }, { T, scoreId }) => {
    return scoreId(T(name))
  },
  ident(node) {
    return node.ident;
  },
  assign_scoreboard_value({ left, right }, { T }) {
    return "scoreboard players set " + T(left) + " " + T(right);
  },
  assign_scoreboard_inc({ left }, { T }) {
    return "scoreboard players add " + T(left) + " 1"
  },
  assign_scoreboard_dec({ left }, { constantId, T }) {
    const c = constantId(1);
    return "scoreboard players add " + T(left) + " " + c;
  },
  assign_scoreboard_operation({ left, op, right }, { T }) {
    return "scoreboard players operation " + T(left) + " " + op + " " + T(right);
  },
  assign_scoreboard_datapath(node, { T }) {
    return "execute store result score " + T(node.left) + " run data get " + T(node.right);
  },
  assign_scoreboard_statement(node, { T }) {
    return "execute store result score " + T(node.left) + " run " + T(node.right);
  },
  score_id: ({ holder, id }, { T, scoreObjective }) => {
    return T(holder) + " " + scoreObjective(id)
  },
  var_id: ({ name, assert }, { varExists, varId }) => {
    assert(varExists(name), "Undeclared var $" + name);
    return varId(name);
  },
  constant_id: ({ value }, { constantId, T }) => {
    return constantId(T(value));
  },
  test_entity(node, { T }) {
    return "entity " + T(node.selector)
  },
  test_datapath(node, { T }) {
    return "data " + T(node.path)
  },
  test_scoreboard: ({ left, op, right }, { T }) => {
    return "score " + T(left) + " " + op + " " + T(right)
  },
  tag_id: ({ name }, { T, tagId }) => tagId(T(name)),
  declare_tag: ({ name }, { declareTag, T }) => {
    declareTag(T(name));
    return "";
  },
  tag_set: ({ selector, tag }, { T }) => `tag ${T(selector)} add ${T(tag)}`,
  tag_unset: ({ selector, tag }, { T }) => `tag ${T(selector)} remove ${T(tag)}`,
  assign_tag_value: ({ selector, tag }, { T }) => `tag ${T(selector)} ${T(value).value ? "add" : "remove"} ${T(tag)}`,
  nbt_path: ({ path }, { T }) => path.map(T).join(""),
  nbt_path_root: ({ name, match }, { T }) => [name, match].filter(Boolean).map(T).join(""),
  nbt_path_member: ({ name, match }, { T }) => "." + [name, match].filter(Boolean).map(T).join(""),
  nbt_path_list: () => "[]",
  nbt_path_list_element: ({ index }, { T }) => (console.log(index), `[${T(index).format()}]`),
  nbt_path_list_match: ({ match }, { T }) => `[${T(match)}]`,
  nbt_path_match: ({ match }, { T }) => `${T(match)}`,
  tilde: ({number})=>`~${number}`
}