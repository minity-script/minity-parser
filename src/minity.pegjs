{
  const _N = options.N || (($,props,location) => ({$,...props}));
  const N = ($,props) => { 
    const loc = location();
    const node = _N($,props,loc)
    if(!loc) debugger;
    return node;
  }
}


file = ___ head:DeclareNamespace tail:(EOL @DeclareNamespace)* ___ {
  return N('file',{namespaces:[head,...tail]})
}
//\\ globals
  DeclareNamespace 
    = "namespace" __ ns:IDENT EOL globals:globals {
        return N('DeclareNamespace',{ns,globals})
      }

  globals 
    = head:global tail:(EOL @global)* {
        return [head,...tail]
      }

  global 
    = DeclareFunction
    / DeclareMacro
    / DeclareEvent
    / Directive
    / Statement

  DeclareEvent 
    = "on" 
      __ trigger:resloc_mc conditions:(CONCAT @object) 
      __ "then" then:Instructions {
        return N('DeclareEvent',{trigger,conditions,then})
      }


//\\ compile-time constant

  arg_name 'macro argument'
  = "?" @WORD
  arg_value = typed_value
//\\ define macro

  DeclareMacro = "macro" __ name:DeclareName args:macro_args statements:Braces {
      return N('DeclareMacro', { name,args,statements } )
    }

  //\\ macro_args
    macro_args = OPEN head:macro_arg tail:(COMMA @macro_arg)* CLOSE {
      return [head,...tail]
    }
    / OPEN ___ CLOSE {
      return []
    }

    macro_arg = name:arg_name def:(EQUALS @arg_value)? {
      return {name,def}
    }


  


//\\ macro call

  MacroCall
  = ns:(@NAME ":")? name:NAME _ OPEN args:call_args? CLOSE {
      return N('MacroCall', { ns, name, args } )
    }
      
  //\\ call_args
    call_args 
    = numbered:call_args_numbered named:(COMMA @call_args_named)? {
      return {numbered,named:named||{}}
    }
    / named:call_args_named {
      return {numbered:[],named:named||{}}
    }

    call_args_numbered = head:call_arg_numbered tail:(COMMA @call_arg_numbered)* {
      return [head,...tail]
    }

    call_arg_numbered = ___ value:arg_value  {
      return value
    } 

    call_args_named = head:call_arg_named tail:(COMMA @call_arg_named)* {
      return [head,...tail]
    }

    call_arg_named = name:arg_name EQUALS value:arg_value {
      return {name,value}
    }

//\\ declare
  Declaration 'declaration'
  = declare_var
  / declare_score
  / declare_tag

    declare_tag 
      = "tag" __ name:ident_lit {
        return N('declare_tag',{name})
      }
  
    declare_var 
      = "var" __ name:var_name value:(EQUALS @int)? {
          return N('declare_var',{name,value})
        }
  
    declare_score 
      = "score" __ name:IDENT criterion:(__ @score_criterion)? {
        return N('declare_score',{name,criterion})
      }
//\\ assignment
  Assignment 'assignment'
  = AssignmentArg
  / AssignmentSuccess
  / AssignmentScoreboard 
  / math_scoreboard
  / AssignmentDatapath 
  / AssignmentBossbar


  
  
  scale =  scale:(@typed_number _ "*" _)? {
    return N('assignment_scale',{scale})
  }

  AssignmentScoreboard 
    = left:lhand_scoreboard EQUALS rhand:rhand_scoreboard {
        return N('AssignmentScoreboard',{left,...rhand})
      }
    / math_scoreboard

    lhand_scoreboard
      = var_id / score_id

    rhand_scoreboard 
      = right:lhand_scoreboard { return { type:'scoreboard',right } }
      / right:bossbar_prop_int { return { type:'bossbar',right } }
      / scale:scale right:datapath { return { type:'datapath',scale,right } }
      / right:int !(_ "*") { return { type:'value', right } }
      / right:Instructable { return { type:'statement',right } }
      / "test" __ right:Conditionals { return { type:'test',right } }

  AssignmentDatapath 
    = left:datapath EQUALS rhand:rhand_datapath {
        return N('AssignmentDatapath',{left,...rhand})
      }

    rhand_datapath 
      = right:datapath { return { type:'datapath',right } }
      / scale:scale "test" __ right:Conditionals { return { type:'test', scale, right } }
      / right:typed_value !(_ "*") { return { type:'value', right } }
      / scale:scale right:lhand_scoreboard { return { type:'scoreboard',scale,right } }
      / scale:scale right:bossbar_prop_int { return { type:'bossbar',scale,right } }
      / scale:scale right:Instructable { return { type:'statement',scale,right } }
    
  AssignmentBossbar 
    = left:bossbar_prop_bool EQUALS right:bool {
        return N('AssignmentBossbar',{left,type:'value',right})
      }
    / left:bossbar_prop_json EQUALS right:value {
        return N('AssignmentBossbar',{left,type:'json',right})
      }
    / left:bossbar_prop_keyword EQUALS right:ident {
        return N('AssignmentBossbar',{left,type:'value',right})
      }
    / left:bossbar_prop_selector EQUALS right:selector {
      return N('AssignmentBossbar',{left,type:'value',right})
    } 
    / left:lhand_bossbar EQUALS rhand:rhand_bossbar {
        return N('AssignmentBossbar',{left,...rhand})
      }
    
    bossbar_prop_bool 
      = "bossbar" __ id:resloc __ prop:("visible") {
          return N('assignment_bossbar_prop',{id,prop})
        }

    bossbar_prop_int
      = "bossbar" __ id:resloc __ prop:("max"/"value"/"visible"/"players") {
          return N('assignment_bossbar_prop',{id,prop})
        }

    bossbar_prop_keyword
    = "bossbar" __ id:resloc __ prop:("style"/"color") {
        return N('assignment_bossbar_prop',{id,prop})
      }
    bossbar_prop_json
    = "bossbar" __ id:resloc __ prop:("name") {
        return N('assignment_bossbar_prop',{id,prop})
      }
    bossbar_prop_selector
    = "bossbar" __ id:resloc __ prop:("players") {
        return N('assignment_bossbar_prop',{id,prop})
      }
  
    lhand_bossbar 
    = "bossbar" __ id:resloc __ prop:("max"/"value"/"visible") {
        return N('assignment_bossbar_prop',{id,prop})
      }
    
    rhand_bossbar 
      = rhand_scoreboard    

  AssignmentSuccess
    = lhand:lhand_success _ "?=" _ rhand:rhand_success {
      return N('AssignmentSuccess',{...lhand,...rhand})
    }

    lhand_success 
      = left:lhand_bossbar {
          return {target:"bossbar",left}
        }
      / left: lhand_scoreboard {
          return {target:"scoreboard",left}
        }
      / left: datapath {
          return {target:"datapath",left}
      }

    rhand_success 
      = right:Instructable { return { type:'statement',right } }
      / "test" __ right:Conditionals { return { type:'test', right } }

 
    
    
  AssignmentArg 
    = name:arg_name EQUALS value:value {
      return N('AssignmentArg',{name,value})
    }







//\\ native commands

  command = "/" command:command_parts {
    return N('command', { command  } )
  }

  command_parts
    = parts:command_part* {
        return N('template_parts',{parts})
      }

  command_part
    = template_expand
    / command_chars

  command_chars  
    = chars:(@command_char)+ {
        return N('template_chars', { chars:chars.join('') } )
      }

  command_char 
    = no_expand_char_inline
    / &"{" !template_expand @"{"

  cmd_arg_count_item 
    = __
      count: unsigned_int
      __
      item: item_spec {
        return {count,item}
      }
    / __
      item: item_spec 
      count: ( __ @unsigned_int)? {
        return {count,item}
      }
      
//\\ minity commands
  cmd 
  = "summon" 
    pos:(_ @Position)? 
    __ 
    type:resloc_mc CONCAT 
    nbt:(@object)? 
    then:(__ "then" __ @Instructions )? {
      return N('cmd_summon', { pos,type,nbt, then } )
    }
  / "give" 
    selector:cmd_arg_selector_optional 
    args: cmd_arg_count_item {
      return N('cmd_give', { selector,...args } )
    }
  / "clear" 
    selector:cmd_arg_selector_optional 
    args: cmd_arg_count_item {
      return N('cmd_clear', { selector,...args } )
    }
  / "setblock" 
    pos:(_ @Position)? 
    __
    block:block_spec 
    mode: (__ @("destroy"/"keep"/"replace"))? {
      return N('cmd_setblock', { pos, block, mode } )
    }
  / "after" __ time:float unit:[tds]? 
    statements:Instructions 
    then:(__ "then" @Instruction)? {
      return N('cmd_after', { time, unit: (unit ?? "t"), statements, then } )
    } 
  / "bossbar" 
    __ "add" 
    __ id:resloc 
    __ name:string? {
      return N('bossbar_add', { id, name} )
    }
  / "bossbar" 
    __ "remove" 
    __ id:resloc {
      return N('bossbar_remove', { id } )
  } 
  / "tag" 
    __ selector:selector 
    __ tag:tag_id  {
      return N('tag_set',{selector,tag})
    }
  / "untag" 
    __ selector:selector 
    __ tag:tag_id  {
      return N('tag_unset',{selector,tag})
    }
  / "say" 
    __ parts:command_parts {
    return N('cmd_say',{parts})
  }
  / modify:("merge"/"append"/"prepend") __ left:datapath __ right:typed_value {
      return N('datapath_modify_value',{modify,left,right})
    }
  / modify:("merge"/"append"/"prepend") __ left:datapath __ right:datapath {
      return N('datapath_modify_datapath',{modify,left,right})
    }
  / modify:"insert"__ index:int __ left:datapath __ right:datapath {
      return N('datapath_insert_datapath',{left,index,right})
    }
  / modify:"insert" __ index:int __ left:datapath __ right:typed_value {
      return N('datapath_insert_value',{left,index,right})
    }
  / print
  / delete_datapath 

  //\\ print
  print = "print" selector:(__ @selector)? __ line:raw_line {
    return N('print',{selector,line})
  }

//\\ directives
  Directive
  =  "import" 
    __ file:string {
      return N('import',{file})
    } 
  / "define" __ resloc:resloc __ value:value {
    return N('DefineJson',{resloc,value})
  }
    
    
    


//\\ execute
 
  mod_arg_axes 
    = OPEN @("xyz"/"xy"/"xz"/"yz"/"x"/"y"/"z") CLOSE
    / __ @("xyz"/"xy"/"xz"/"yz"/"x"/"y"/"z")
  
  mod_arg_anchor 
    = OPEN @ANCHOR CLOSE
    / __ @ANCHOR
  

  mod_arg_selector 
    = OPEN @selector CLOSE
    / __ @selector
  
  mod_arg_selector_anchor
    = OPEN selector:selector anchor:(__ @ANCHOR)? CLOSE {
        return { selector, anchor }
      }
    / __ selector:selector anchor:(__ @ANCHOR)? {
        return { selector, anchor }
      }

  mod_arg_test 
    = OPEN @test CLOSE
    / __ @test
  
  mod_arg_test_inverse 
    = OPEN @test_inverse CLOSE
    / __ @test_inverse
  
  mod_arg_resloc 
    = OPEN @resloc CLOSE
    / __ @resloc
  
  dir_number = @float !"deg"
  rot_angle = @float "deg"
  
  mod_arg_number
  	= OPEN @dir_number CLOSE
    / __ @dir_number
    
  mod_arg_angle
  	= OPEN @rot_angle CLOSE
    / __ @rot_angle
    
  cmd_arg_function
    = AnonFunctionResloc
    / FunctionCallResloc

  cmd_arg_selector_optional = spec:(__ @selector_spec)? {
    return N('selector_optional', { spec } )
  }

//\\ selector
  selector
    = spec: selector_spec {
      return N('selector', { spec } )
    }
  selector_single = spec:selector_spec {
      return N('selector_single', { spec } )
    }
  selector_spec  'selector'
    = selector_uuid
    / selector_complex

  selector_uuid
    = "@[" _ uuid:string _ "]" {
      return N('selector_uuid', { uuid } )
    }

  selector_complex 
    = sort:selector_sort? "@" !"@" initial:(selector_initial/selector_initial_type) conditions:conditions {
      return N('selector_spec', { initial,conditions:[...sort||[],...conditions] } )
    }
    
  //\\ sort
  selector_sort 
    = sort:sort_name __ "all" __ {
        return [N('cond_brackets_lit',{name:'sort',op:'include',value:sort})]
      }
    / sort:sort_name limit:(__ @number) ? __ {
      if (!limit) {
        return [
          N('cond_brackets_lit',{name:'sort',op:'include',value:sort}),
          N('cond_brackets_lit',{name:'limit',op:'include',value:1})
        ]
      }
      return [
        N('cond_brackets_lit',{name:'sort',op:'include',value:sort}),
        N('cond_brackets',{name:'limit',op:'include',value:limit||1}),
      ]
    }
    
  //\\ initial
    selector_initial
    = initial:[a-z] ![a-z0-9_]i {
      if (!initial.match(/[prase]/)) expected('@p, @r, @a, @s, @e or @<type>')
      return N('selector_initial', { initial } )
    }

    selector_initial_type
    = type:resloc_or_tag_mc {
      return N('selector_initial_type', { type } )
    }

  //\\ conditions
    conditions = parts:condition_part* {
      return parts.flat()
    }

    condition_part = condition_tag/condition_brackets/condition_nbt

    condition_tag 'selector tag'
    = CONCAT "." value:tag_id { return [N('cond_brackets', { name:'tag', op:'include', value }) ]  }
    / CONCAT "!" value:tag_id  { return [N('cond_brackets', { name:'tag', op:'exclude', value }) ]   }

    condition_nbt 'selector nbt'
      = CONCAT value:object {
        return N('cond_brackets_nbt', {name:'nbt',op:'include',value} )
      }

    condition_brackets 'selector brackets'
      = CONCAT "[" ___ 
        head:cond_brackets 
        tail:(COMMA @cond_brackets)* 
        ___ "]" {
        return [head,...tail]
    }
    
    cond_brackets  
      =   node: 
          (	 ($("d"? [xyz])     cond_op number )
          /  (( "type" )        cond_op resloc_or_tag_mc )
          /  (( "predicate" )   cond_op resloc )
          /  (( "limit")        cond_op int)
          /  (( "scores")       cond_op cond_brackets_scores)
          /  (( "advancements") cond_op cond_brackets_advancements)
          )
        {
          const [name,op,value] = node;
          return N('cond_brackets', {name,op,value} )
        } 
      /  node:
         ( ("sort"         cond_op sort_name)
         / ("gamemode"     cond_op GAMEMODE)
         ) {
            const [name,op,value] = node;
            return N('cond_brackets_lit', {name,op,value} ) 
         }
      /  node:(( "tag" / "team" / "name") cond_op string? ) {
          const [name,op,value] = node;
          return N('cond_brackets', {name,op,value} )
        } 
      / node:(( "nbt") cond_op object ) {
          const [name,op,value] = node;
          return N('cond_brackets_nbt', {name,op,value} )
        }
      / name:"level" _ value:int_range_match {
          return N('cond_brackets', {name,op:'include',value} )
        }
      / name:("distance"/"x_rotation"/"y_rotation") _ value:range_match {
          return N('cond_brackets', {name,op:'include',value} )
      } 
      / "->" _ name:score_objective _ value:int_range_match {
          return N('cond_brackets_score', {name,op:'score',value} )
      }
    


    cond_op
      = _ "==" _ { return 'include' }
      / _ ("=!"/"!=") _ { return 'exclude' }
      / _ "=" _ { return 'include' }

    cond_brackets_scores 
      = BEGIN 
        head: cond_brackets_score 
        tail: (COMMA @cond_brackets_score)*
        END {
          return N('cond_brackets_braces', {items: [head, ...tail]})
        }

    cond_brackets_score
      = name:ident EQUALS value:range {
          return N('cond_brackets_pair', {name,value})
        }

    cond_brackets_advancements 
      = BEGIN 
        head: cond_brackets_advancement
        tail: (COMMA @cond_brackets_advancement)*
        END {
          return N('cond_brackets_braces', {items: [head, ...tail]})
        }

    cond_brackets_advancement
      = name:resloc_mc EQUALS value:bool {
          return N('cond_brackets_pair', {name,value})
        }
      / BEGIN 
        head: cond_brackets_advancement_criterion
        tail: (COMMA @cond_brackets_advancement_criterion)*
        END {
          return N('cond_brackets_braces', {items: [head, ...tail]})
        }

    cond_brackets_advancement_criterion
      = name:ident EQUALS value:bool {
          return N('cond_brackets_pair', {name,value})
        }
    
    sort_name 
      = ( "nearest" / "closest" ) { return "nearest" }
      / ( "furthest" / "farthest" ) { return "furthest" }
      / ( "random" / "any" ) { return "random" }
      / ( "arbitrary" / "oldest" ) { return "arbitrary" }


  

//\\ if_else
  
  //\\ test
    test = test_predicate/test_entity/test_datapath/test_scoreboard/test_block

    test_inverse = test_scoreboard_inverse


    test_predicate = "predicate" __ predicate:resloc {
      return N('test_predicate', { predicate } )
    }
    

    test_entity = selector:selector {
      return N('test_entity', { selector } )
    }
    
    test_block 
      = pos:Coords __ spec:block_spec {
          return N('test_block_pos', { pos, spec } )
      }
      / spec:block_spec {
        return N('test_block', { spec } )
      } 
    

 
    

//\\ scoreboard
  var_name 'variable'
    = "$" @IDENT 
  var_id
    = name:var_name {
      return N('var_id',{name});
    }
  constant_id 
    = value:int {
      return N('constant_id',{value});
    }
  score_id 
    = holder:score_holder _ "->" _ id:score_objective {
      return N( 'score_id', { holder,id } )
    }
   
  tag_id 
    = name:string {
      return N('tag_id',{name})
    }
  score_objective 'score objective'
    = string

  score_holder 
    = selector 
    
  scoreboard_id 
    = var_id 
    / constant_id 
    / score_id


  
  
  score_criterion 'criterion'
    = $([a-z]i [a-z0-9.:_-]i )+
  
  //\\ assign_scoreboard
    math_scoreboard
      = left:scoreboard_lhand _ 
          assign: (
            op:"+=" _ right:int {
              return N('assign_scoreboard_add', { right } )
            }
          / op:"-=" _ right:int {
              return N('assign_scoreboard_remove', { right } )
            }
          / op:assign_scoreboard_op _ right:scoreboard_id {
              return N('assign_scoreboard_operation', { op, right } )
            }
          / op:("><"/"<=>") _ right:scoreboard_lhand {
              return N('assign_scoreboard_operation', { op:'><', right } )
            }
          / "++" {
              return N('assign_scoreboard_inc',{})
            }
          / "--" {
              return N('assign_scoreboard_dec',{})
            }
        ) {
          assign.left = left;
          return assign;
        } 
    scoreboard_lhand 
      = var_id
      / score_id
      

    assign_scoreboard_op 
      = "+="
      / "-="
      / "*="
      / "/="
      / "%="
      / ("<=" / "<") { return "<" }
      / (">=" / ">") { return ">" }
      


  //\\ test_scoreboard
    test_scoreboard
      = left:scoreboard_id _ right:int_range_match {
          return N('test_scoreboard_range',{left,right})
        }
      / left:scoreboard_id _ op:test_scoreboard_op _ right:scoreboard_id {
          return N('test_scoreboard',{left,op,right})
        }
      
    test_scoreboard_inverse
      = left:scoreboard_id _ "!=" _ right:scoreboard_id {
          return N('test_scoreboard',{left,op:"=",right})
        }
      / id:scoreboard_lhand  {
          return N('test_scoreboard_zero',{id})
        }
        

    test_scoreboard_op 
      = "<="
      / ">="
      / ">"
      / "<"
      / @"=" "="?

//\\ nbt
  //\\ datapath
    datapath
      = spec:datapath_spec {
        return N('datapath',{spec})
      }
      datapath_spec
        = datapath_storage
        / datapath_var
        / datapath_entity
        / datapath_block

      datapath_entity 
        = selector:selector "::" path:nbt_path {
            return N('datapath_entity', { selector, path } )
          }

      datapath_storage 
        ="@@" name:resloc "::" path:nbt_path {
            return N('datapath_storage', { name, path } )
          }

      datapath_block 
        =position:Position "::" path:nbt_path {
            return N('datapath_block', { position,path } )
          }

      datapath_var 
      = "@@" path:nbt_path { return N('datapath_var', { path } ) }

    
  //\\ nbt_path
    nbt_path 
      = head:nbt_path_head tail:nbt_path_tail* {
          return N('nbt_path',{path:[head,...tail]})
        }

      nbt_path_head 
        = nbt_path_root
        / nbt_path_match
        / nbt_path_bracket

      nbt_path_tail 
        = @nbt_path_member 
        / nbt_path_bracket

      nbt_path_root 
        = member:nbt_path_step {
            return N('nbt_path_root',member)
          }


      nbt_path_member 
        = "." member:nbt_path_step {
            return N('nbt_path_member',member)
          }

      nbt_path_step 
        = name:string match:nbt_path_match? {
            return {name,match}
          }

      nbt_path_part
        = "{}"
          / nbt_path_ident
          / nbt_path_match
          / nbt_path_bracket

      nbt_path_bracket 
        = nbt_path_list_match
          / nbt_path_list
          / nbt_path_list_element

      nbt_path_list_element
        = "[" index:int "]" {
            return N('nbt_path_list_element',{index})
          }

      nbt_path_list
        = "[]" {
            return N('nbt_path_list')
          }


      nbt_path_list_match 
        = "[" match:object "]" {
            return N('nbt_path_list_match',{match})
          } 

      nbt_path_match 
        = match:object_lit {
            return N('nbt_path_match',{match})
          }

      nbt_path_ident 
        = string


      
 

    delete_datapath 
      = ("delete"/"remove") __ path:datapath {
        return N('delete_datapath', { path } )
      }
  //\\ test_datapath
    test_datapath = path:datapath {
        return N('test_datapath', { path } )
      } 

//\\ block_spec
  block_spec 'block predicate'
    = resloc:resloc_or_tag_mc CONCAT states:block_states? CONCAT nbt:(@object)? {
        return N('block_spec',{resloc,states,nbt})
      }

    block_states 
      = "[" ___ head:block_state tail:( COMMA @block_state)* ___ "]" {
          return N('block_states',{states:[head,...tail]})
        }
    block_state 
      = name:ident EQUALS value:(number/string) {
          return N('block_state',{name,value})
        } 

    item_spec 'item predicate'
      = resloc:resloc_or_tag_mc CONCAT nbt:(@object)? {
          return N('item_spec',{resloc,nbt})
        }


//\\ parts
  
  resname = head:ident tail:("/" @ident)* {
    return N('resname',{parts:[head,...tail]})
  }

  resloc
    = resloc_full
    / name: resname {
        return N('resloc', { name } )
      }

  resloc_full 
  	= ns:ident ":" name:resname {
        return N('resloc', { ns,name } )
      }

  resloc_or_tag 
    = restag 
    / resloc

  resloc_mc
    = resloc_full
    / name: resname {
        return N('resloc_mc', { name } )
      }

  restag
    = restag_full
    / "#" name:resname {
        return N('restag', { name } )
      }

  restag_full 
  	= "#" ns:ident ":" name:resname {
        return N('restag', { ns,name } )
      }

  restag_mc
    = restag_full
    / "#" name: resname {
        return N('resloc_mc', { name } )
      }

  resloc_or_tag_mc
    = restag_mc
    / resloc_mc

  int_range_match
    = "=" "="? _ @int_range 
    / "<=" _ to:int { return N('range_to', { to }) }
    / ">=" _ from:int { return N('range_from', { from }) }
    / "<" _ to:int { return N('range_lt_int', { to }) }
    / ">" _ from:int { return N('range_gt_int', { from }) }

  int_range 
    = from:int ".." to:int { return N('range', { from,to } ) }
    / ".." to:int { return N('range_to', { to } ) }
    / from:int ".." { return N('range_from', { from } ) }
    / int

  range_match
    = "=" "="? _ @range 
    / "<=" _ to:number { return N('range_to', { to }) }
    / ">=" _ from:number { return N('range_from', { from }) }
    / "<" _ to:number { return N('range_lt', { to }) }
    / ">" _ from:number { return N('range_gt', { from }) }
    
  range 
    = from:number ".." to:number { return N('range', { from,to } ) }
    / ".." to:number { return N('range_to', { to } ) }
    / from:number ".." { return N('range_from', { from } ) }
    / number

//\\ values
  value
    = value_arg
    / value_lit

  value_arg
    = name:arg_name {
        return N('arg', { type:'value',name } )
      }

  value_lit
    = object
    / array
    / number
    / string


  typed_value "typed value"
    = typed_value_arg
    / typed_value_lit

  typed_value_arg
    = name:arg_name {
        return N('arg', { type:'value',name } )
      }

  typed_value_lit
    = object
    / array
    / typed_number
    / string


  //\\ bool
    bool 
      = bool_arg/bool_lit
    bool_arg
      = name:arg_name {
          return N('arg', { type:'bool',name } )
        }

    bool_lit
      = "true" { return N('boolean_lit', { type:'bool', value: true  } ) }
      / "false" { return N('boolean_lit', { type:'bool', value: false  } ) }

  //\\ object
    object 
      = object_arg
      / object_lit
    
    object_arg
      = name:arg_name { 
          return N('arg', { type:'object',name } ) 
        }


    object_lit
      = "{" ___
        members:(
          head:member tail:(COMMA @member)* COMMA? {
            return [head,...tail];
          }
        )?
        ___ "}"
        { return N('object_lit', { type:'object',members:members||[] } ) }
    member
      = name:(string) _":" ___ value:typed_value {
          return { name: name, value: value }
        }


  //\\ array
    array 
      = array_arg
      / array_lit

    array_arg 
      = name:arg_name {	return N('arg', { type:'array',name } ) }

    array_lit
      = "[" ___
        items:(
          head:typed_value
          tail:(COMMA @typed_value )*
          COMMA?
          { return [head].concat(tail); }
        )?
        ___ "]"
        { return N('array_lit', { type:'array', items: items || [] } ) }
  
  //\\ number
    typed_number 
      = name:arg_name {	
          return N('arg', { type:'number',name } ) 
        }
      / typed_number_lit

    typed_number_lit 
      = typed_float_lit
      / typed_int_lit

    number 
      = name:arg_name {	
          return N('arg', { type:'number',name } ) 
        }
      / number_lit

    number_lit 
      = float_lit
      / int_lit

    unsigned_int 
      = name:arg_name {	
          return N('arg', { type:'count',name } ) 
        }
      / unsigned_int_lit

    unsigned_int_lit 
      = $(UNSIGNED) {
          return N('number_lit', { type:'int',value:1 } )
        }
    
    int 
      = name:arg_name {	
          return N('arg', { type:'int',name } ) 
        }
      / int_lit

    int_lit  'integer'
      = "true" {
          return N('number_lit', { type:'int',value:1 } )
        }
      / "false" {
          return N('number_lit', { type:'int',value:0 } )
        }
      / value:INT {
          return N('number_lit', { type:'int',value:+value } )
        }

    typed_int 
      =  name:arg_name {	
          return N('arg', { type:'int',name } ) 
        }
      / typed_int_lit

    typed_int_lit  'integer'
      = "true" {
          return N('number_lit', { type:'int',value:1,suffix:"b" } )
        }
      / "false" {
          return N('number_lit', { type:'int',value:0,suffix:"b" } )
        }
      / value:INT suffix:[bsli]? {
          return N('number_lit', { type:'int',value:+value,suffix } )
        }

    typed_float  
      = name:arg_name {	
          return N('arg', { type:'float',name } ) 
        }
      / typed_float_lit

    float  
      = name:arg_name {	
          return N('arg', { type:'float',name } ) 
        }
      / float_lit

    
    typed_float_lit 
      = value:FLOAT suffix:[fd]? {
          return N('number_lit', { type:'float',value:+value,suffix:suffix||"f" } )
        } 
      / value:INT suffix:[fd] {
          return N('number_lit', { type:'float',value:+value,suffix } )
        }
        
    float_lit
      = value:(FLOAT/INT) {
          return N('number_lit', { type:'float',value:+value } )
        } 

    FLOAT
      = value:$(INT (FRAC EXP?/EXP)) { return +value }

    EXP
      = [eE] ([-+])? DIGIT+

    FRAC
      = "." DIGIT+

    INT
      = value: $([+-]? UNSIGNED) { return +value }

    UNSIGNED
      = value:$( ZERO / !ZERO DIGIT+) { return +value }

    ZERO
      = "0"

    DIGIT
      = [0-9]

    DIGIT_NO_ZERO
      = [0-9]

  //\\ ident
    ident 
      = ident_arg
      / ident_lit

    ident_arg 
      = name:arg_name { 
          return N('arg',{type:'ident',name}) 
        } 

    ident_lit   
      =  word:WORD { 
        return N('string_lit', { type:'ident', value: word  } )
      }

  //\\ string
    string 
      = string_arg
      / string_lit
      
    string_arg 
      = name:arg_name {
          return N('arg', { type:'string',name } ) 
        }
    string_lit 
      = template_lit
      / string_json_lit 
      / string_snbt_lit 
      / ident_lit
      / raw_text_lit

    template 
      = template_arg 
      / template_lit
    
    template_arg 
      = name:arg_name {
          return N('arg', { type:'template',name } ) 
        }


    template_lit  
      = '"' parts:template_part* '"' {
        return N('template_lit', { type:'template', parts } )
      }

    template_parts 
      = parts:template_part* {
          return N('template_parts',{parts})
        }

    template_part 
      = template_expand
      / template_chars

    template_expand
      = template_expand_arg
      / template_expand_value
      / template_expand_var
      / template_expand_tag
      / template_expand_score
      / template_expand_score_id
      / template_expand_selector
      / template_expand_coords

    template_chars  
      = chars:(@template_char)+ {
          return N('template_chars', { chars:chars.join('') } )
        }
    
    template_sep  
      = chars:[{}] {
          return N('template_chars', { chars } )
        }

	  template_char 
    	= ![{}"] @char
      / "\\" @.
        
    template_expand_arg  
      = "{?" name:template_parts "}" {
          return N('template_expand_arg', { name } )
        }
    template_expand_value  
    = "{=" value:(value/&{expected("value")}) "}" {
        return N('template_expand_value', { value } )
      }
    template_expand_tag  
      = "{." name:template_parts "}" {
          return N('template_expand_tag', { name } )
        }

    template_expand_var  
      = "{$" name:template_parts "}" {
          return N('template_expand_var', { name } )
        }
    
    template_expand_score  
      = "{->" name:template_parts "}" {
          return N('template_expand_score', { name } )
        }

    template_expand_score_id  
      = "{" id:score_id "}" {
          return N('template_expand_score_id', { id } )
        }
        
    template_expand_selector
      = "{" &(selector_sort? "@" !"@") selector:(@selector/&{expected('selector')}) "}" {
          return N('template_expand_selector', { selector } )
        }
	
    template_expand_coords
      = "{" &"(" coords:(@Position/&{expected('coordinates')}) "}" {
          return N('template_expand_coords', { coords } )
        }
        
    
  //\\ string_json
    string_json 
      = string_json_arg
      / string_json_lit

    string_json_arg 
      = name:arg_name {
          return N('arg', { type:'string_json',name } ) 
        }
    string_json_lit 
      = "json" __ value:value { 
        return N('string_json', { type:'string_json', value: value  } )
        } 

    string_snbt 
      = string_snbt_arg
      / string_snbt_lit

    string_snbt_arg 
      = name:arg_name {
          return N('arg', { type:'string_snbt',name } ) 
        }
    string_snbt_lit 
      = "snbt" __ value:typed_value { 
        return N('string_snbt', { type:'string_snbt', value: value  } )
        } 

    no_expand_char_inline
      = ![{\n\r] @char

    no_expand_char
      = ![{] @char

    char
      = unescaped
      / escape sequence:(
            
            'b' { return '\b'; }
          / 'f' { return '\f'; }
          / 'n' { return '\n'; }
          / 'r' { return '\r'; }
          / 't' { return '\t'; }
          / 'u' digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
              return String.fromCharCode(parseInt(digits, 16));
            }
          / .
        )
        { return sequence; }

    escape
      = "\\"
    
    quotation_mark
      = '"'

    unescaped
      = [^\0-\x1F\\]


//\\ raw text
  raw_text 
    = raw_text_arg
    / raw_text_lit
    
  raw_text_lit
    = raw_tag

  raw_text_arg 
    = name:arg_name {
        return N('arg', { type:'raw_text',name } ) 
      }
  

  raw_tag 
    = open:raw_tag_open ___ GT
      ___
      parts:raw_part*
      ___
      close:(
        tag:raw_tag_close {
          if(tag == open.tag) return tag;
          expected('</'+open.tag+'>')
        }
      ) { 
        open.parts = parts;
        return open;
      }
    / @raw_tag_open SGT 

  raw_tag_open
    = /*LT attr:(head:raw_attr tail:(___ @raw_attr)* { return [head,...tail] }) &(GT/SGT) {
      const tag = N('raw_tag',{props:{}})
      tag.attr = attr;
      return tag;	
      }
    / */
    !LTS LT tag:(WORD)  attr:(___ @raw_attr)* {
      return N('raw_tag',{tag,attr});
    }

    raw_attr = name:ident EQUALS value:value {
      return {name,value}
    }

  raw_tag_close
    = LTS @WORD GT

  raw_line = parts:(raw_tag/raw_expand/raw_chars)* {
    return N('raw_line',{parts})
  }

  raw_part 
    = raw_tag 
    / raw_expand 
    /  chars:$(EOL) {
        return N('raw_chars_ws',{chars})
      }
    /  raw_chars

  raw_chars = chars:$(!(LT) (raw_char))+ {
      return N('raw_chars',{chars})
    }

    raw_char 
      = no_expand_char
      / &"{" !raw_expand @"{"


  raw_expand
    = template_expand_arg
    / raw_expand_var
    / raw_expand_score_id
    / raw_expand_nbt
    / template_expand_value
    / template_expand_tag
    / template_expand_score
    / template_expand_selector
    / template_expand_coords
    
    raw_expand_var  
      = "{$" name:template_parts "}" {
          return N('raw_expand_var', { name } )
        }
    
    raw_expand_nbt
      = "{" spec:datapath_spec "}" {
        return N('raw_expand_nbt', { spec } )
      }


    raw_expand_score_id  
      = "{" holder:score_holder _ "->" _ id:score_objective "}" {
          return N('raw_expand_score_id', { holder, id } )
        }


//\\ TOKENS
  LT = "<" _
  LTS = "</" _
  GT = ___ ">"
  SGT = ___ "/>"
  CONCAT = (_ "&" _)?

  
  OPEN = _ "(" ___
  CLOSE =  ___ ")"
  BEGIN = _ "{" ___
  END =  ___ "}"

  COMMA = ___ "," ___
  EQUALS = _ "=" _

  HEXDIG = [0-9a-f]i
  WORD_INIT = [A-Z_]i
  WORD_CHAR = [A-Z0-9_]i
  WORD = $(WORD_INIT WORD_CHAR*)
  IDENT  = WORD

  _ 'whitespace' = SPACE*
  __ 'whitespace' = SPACE+
  ___ 'whitespace' = WS*
  SPACE = [ \t]
  WS  
    = [ \n\t\r]
    / EOL_COMMENT
  EOL 'end of line' = __? [\n\r]+ ___ / EOL_COMMENT

  EOL_COMMENT 
    = _ "//" [^\n\r]* [\n\r]+ ___ 

  NAME_OR_DIE 
    = NAME
    / word:WORD &{ error(word +' is a reserved word')}

  NAME 
    = !RESERVED @$([a-z_][a-z0-9_]*)
  RESERVED 
    = ( CONDITION / GAMEMODE / SORT
      / MOD / ANCHOR / DIRECTION
      / KEYWORD / DECLARE / PSEUDO / COMMAND
      / STRINGIFY / BOOLEAN / OTHER
      ) ![a-z-_]i

  CONDITION
    = "advancements" / "distance" / "gamemode" / "level" 
    / "limit" / "name" / "scores" / "sort" / "type" 
    / "x_rotation" / "y_rotation" 

  GAMEMODE
    = "adventure" / "creative" / "spectator" / "survival" 

  SORT
    = "furthest" / "farthest" / "arbitrary" / "nearest" 
    / "oldest" / "random" / "all" / "any" 

  MOD
  = "align" / "anchored" / "as" / "at" / "facing" / "for" 
    / "in" / "pos" / "positioned" / "predicate" / "rot" / "rotated"

  ANCHOR 
    = "eyes"/"feet"


  DIRECTION
    = "back" / "down" / "downward" / "east" / "forward" / "left" 
    / "north" / "right" / "south" / "up" / "upward" / "west"  

  KEYWORD
    = "after" / "else" / "every" / "and" / "if" / "import" / "repeat" 
    / "test" / "then" / "until" / "unless" / "on" / "while" / "when" 
    / "except" / "catch"  

  PSEUDO
    = "resolve" / "reject" / "self" 

  DECLARE
    = "function" / "macro" / "namespace" / "score" / "tag" / "var" 

  COMMAND
    = "append" / "delete" / "merge" / "bossbar" / "clear" / "delete" / "give" / "prepend" / "remove" 
    / "print" / "say" / "setblock" / "summon" / "tag" / "untag" / "add" / "remove" / "max" / "players" 
    / "value" / "visible" / "style" / "color"

  BOOLEAN
    = "false" / "true" 

  STRINGIFY
    = "json" / "nbt" / "snbt" 

  OTHER  
    = "deg"


//\\ POSITION AND COORDINATES

  Position 
    = OPEN @Coords CLOSE / NativeCoords
  
  Coords 
    = RelativeCoords 
    / LocalCoords 
    / NativeCoords
  
  RelativeCoords
    = head: RelativeCoord tail:(__ @RelativeCoord)* {
      return N('RelativeCoords',{ _coords: [head, ...tail]} )
    }
    
  RelativeCoord
    = "east"  __ d:Coord { return { axis:'x', f:+1, d } }
    / "west"  __ d:Coord { return { axis:'x', f:-1, d } }
    / "up"    __ d:Coord { return { axis:'y', f:+1, d } }
    / "down"  __ d:Coord { return { axis:'y', f:-1, d } }
    / "south" __ d:Coord { return { axis:'z', f:+1, d } }
    / "north" __ d:Coord { return { axis:'z', f:-1, d } }
  
  LocalCoords
    = head: LocalCoord tail:(__ @LocalCoord)* {
      return N('LocalCoords',{ _coords: [head, ...tail]} )
    }

  LocalCoord
    = "left"        __ d:Coord { return { axis:'x', f:+1, d } }
    / "right"       __ d:Coord { return { axis:'x', f:-1, d } }
    / "upward"      __ d:Coord { return { axis:'y', f:+1, d } }
    / "downward"    __ d:Coord { return { axis:'y', f:-1, d } }
    / "forward"     __ d:Coord { return { axis:'z', f:+1, d } }
    / "back""ward"? __ d:Coord { return { axis:'z', f:-1, d } }

  NativeCoords
    = NativeLocalCoords
    / NativeWorldCoords
  
  NativeWorldCoords 
    = x: NativeCoord __ y: NativeCoord  __ z: NativeCoord {
        return N('NativeCoords',{x,y,z})
      }
      
  NativeCoord 
    = TildeCoord 
    / Coord

  NativeLocalCoords 
    = x: CaretCoord __ y: CaretCoord  __ z: CaretCoord {
         return N('NativeCoords',{x,y,z} )
      }
  
  Rotation 
    = OPEN @Angles CLOSE / NativeAngles
  

  Angles
  	= NativeAngles / RelativeAngles
    
  NativeAngles
  	= x:NativeCoord "deg"? __ y:NativeCoord "deg"? {
      return N('NativeAngles',{x,y} )
   }
  
  RelativeAngles
  	= head: RelativeAngle tail:(__ @RelativeAngles)* {
      return N('RelativeAngles',{ _coords: [head, ...tail]} )
    } 
  
  RelativeAngle
    = "left"        __ d:Angle { return { axis:'x', f:+1, d } }
    / "right"       __ d:Angle { return { axis:'x', f:-1, d } }
    / "up" 		      __ d:Angle { return { axis:'y', f:+1, d } }
    / "down"    	  __ d:Angle { return { axis:'y', f:-1, d } }
    

  Coord 
    = float

  Angle 
    = @float "deg"

  TildeCoord 
    = "~" arg:Coord?  {
        return N('TildeCoord',{arg})
      }

  CaretCoord 
    = "^" arg:Coord  {
        return N('CaretCoord',{arg})
      }
      



/*---------------------------------------------------------------------*/
  Statements 
    = head:Statement 
      tail:(EOL @Statement)* {
        return [head,...tail]
      }
  Statement 
    = statement:(
      Declaration / Instructable / Execution 
    ) {
        statement.text = text();
        return statement;
      }
  Instructable 
    = BlockArg 
    / Construct
    / PromiseCall 
    / math_scoreboard
    / Assignment 
    / command 
    / cmd 
     
    / CallSelf 
    / FunctionTagCall
    / MacroCall 



  CodeBlock = BEGIN statements:Statements END {
      return N( 'CodeBlock', { statements } )
  }
  AnonFunctionResloc = BEGIN statements:Statements END {
      return N( 'AnonFunctionResloc', { statements } )
  }
  Instruction 
    = CodeBlock
    / (__ @Execution)
    / (__ @Instructable)
  
  Instructions 
    = Braces
    / instruction:(__ @Execution / __ @Instructable) {
      return [instruction]
   }
  
  Braces = BEGIN @statements:Statements END 

//\\ execution context modifiers

  Execution 
    = modifiers:Modifiers executable:Executable {
      return N( 'Execution', { modifiers, executable } )
  }
  Executable = last:(CodeBlock / (__ @Instructable)) {
      return N( 'Executable', { last } )
  }
  Modifiers 
    = head:Modifier tail:(__ @Modifier)* {
      return [head,...tail]
    }

  Modifier  
  = MOD:"align" ARG:mod_arg_axes {
      return N( 'ModifierNativeLiteral', { MOD, ARG } )
    }
  / MOD:"anchored" ARG:mod_arg_anchor {
      return N( 'ModifierNativeLiteral', { MOD, ARG } )
    }
  / "facing" args:mod_arg_selector_anchor { 
      return N( 'ModifierFacing', { ...args} )
    }
  / MOD:
    ( "as"
    / "at"
    / "pos" "itioned"? __ "as" { return "positioned as" }
    / "rot" "ated"? __ "as" { return "rotated as" }
    ) arg:mod_arg_selector {
    return N( 'ModifierNative', { MOD, arg } )
  }
  
  / "for" arg:mod_arg_selector {
      return N( 'ModifierFor', { arg } )
  }
  / MOD:"in" arg:mod_arg_resloc {
    return N( 'ModifierNative', { MOD, arg } )
  }
  / "pos" "itioned"? _ arg:Position {
    return N( 'ModifierNative', { MOD:'positioned', arg } )
  }
  / "rot" "ated"? _ arg:Rotation {
    return N( 'ModifierNative', { MOD:'rotated', arg } )
  }
  / arg:RelativeAngles {
    return N('ModifierNative', { MOD:'rotated', arg} )
  }
  / arg:RelativeCoords {
    return N('ModifierNative', { MOD:'positioned', arg } )
  }
  / arg:LocalCoords {
    return N('ModifierNative', { MOD:'positioned', arg } )
  }
//\\ construct  
  Construct 
    = arg:Conditionals then:Instruction 
        otherwise:(__ "else" @Instruction)? {
        return N('StructureIfElse', { arg, then, otherwise } )
      }
    / "repeat" mods:(__ @mods:Modifiers)? 
      statements:Braces? 
      __ conds:LoopConditionals 
      then:(__ "then" @Instruction)? {
        return N('StructureRepeat',{mods,statements,conds,then})
      }

    / "every" __ time:float unit:[tds]? 
      statements:Instructions 
      conds:(__ @LoopConditionals)?
      then:(__ "then" @Instruction)?{
      return N('every_until',{statements,conds,time,unit,then})
    }

//\\ conditionals

  Conditionals
    = head:Conditional tail:(__ "and" __ @Conditional)* {
        return N('Conditionals',{subs:[head,...tail]})
      } 
  TestTrue
    = arg:mod_arg_test {
        return N('ConditionalIf',{arg})
      } 
    / arg:mod_arg_test_inverse {
        return N('ConditionalUnless',{arg})
      } 

  TestFalse = 
    arg:mod_arg_test {
        return N('ConditionalUnless',{arg})
      } 
    / arg:mod_arg_test_inverse {
        return N('ConditionalIf',{arg})
      } 
  

  Conditional
    = "if" @TestTrue
    / "unless" @TestFalse 
    
  LoopConditionals
    = head:LoopConditional tail:(__ "and" __ @LoopConditional)* {
      return N('Conditionals',{subs:[head,...tail]})
    } 

  LoopConditional
    = "while" @TestTrue
    / "until" @TestFalse


//\\ block macros
  MacroCallSpec 
    = ns:(@WORD ":")? name:NAME args:(_ OPEN @call_args CLOSE)? {
        return N('MacroCallSpec', {ns, name, args})
      }

  PromiseCall
    = head:Promise tail:(__ "and" __ @Promise)* 
      clauses: ThenCatchClause {
        return N('PromiseCall',{promises:[head,...tail],...clauses})
      } 

  Promise
    = "when" __ @PromiseTrue
    / "when" OPEN @PromiseTrue CLOSE
    / "except" __ @PromiseFalse
    / "except" OPEN @PromiseFalse CLOSE

  PromiseTrue = spec:MacroCallSpec {
    return N("PromiseTrue",{spec})
  }
  PromiseFalse = spec:MacroCallSpec {
    return N("PromiseFalse",{spec})
  }

  ThenCatchClause = then:ThenClause _catch:CatchClause? {
    return {then,_catch}
  }

  ThenClause = __ "then" __ @Instruction
  CatchClause = __ "catch" __ @Instruction
  

  BlockArg
    = "resolve" _ "(" _ ")" {
        return N('BlockArgThen')
      }
    / "reject" _ "(" _ ")"  {
        return N('BlockArgElse')
      }

//\\ function

  FunctionCall
    =  resloc:FunctionCallResloc {
      return N('FunctionCall', { resloc } )
    }

  FunctionTagCall
    =  restag:restag _ OPEN _ CLOSE {
      return N('FunctionTagCall', { restag } )
    }

  FunctionCallResloc = !RESERVED @resloc:resloc_or_tag _ OPEN _ CLOSE 


  CallSelf = "self" _ "(" _ ")" {
    return N('CallSelf', {} )
  }

  DeclareFunction 
    = "function" __ name:resname tags:(__ @restag)* (_ OPEN CLOSE _)? statements:Braces {
        return N('DeclareFunction', { name,tags,statements } )
    }

  
  DeclareName 
    = NAME_OR_DIE 

