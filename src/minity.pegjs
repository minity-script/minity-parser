{

  const FN = fn => {
    fn||=($,location,...args)=>{
      const ret = {$}
      for (const arg of args) Object.assign(ret,arg);
      return ret;
    }
    return ($,...args) => {
      const loc = location();
      const {file} = options;
      loc.file = file;
      const node = fn($,loc,...args)
      return node;  
    }
  }
  const N = FN(options.N);
  const V = FN(options.V);
  const I = FN(options.I);
}


file = ___ head:DeclareNamespace tail:(EOL @DeclareNamespace)* ___ {
  return N('file',{namespaces:[head,...tail]})
}
//\\ globals
  DeclareNamespace 
    = "namespace" __ ns:IDENT EOL statements:Globals {
        return V('DeclareNamespace',{},{ns,statements})
      }

  DeclareFunction 
    = "function" 
      __ resloc:ValueResName 
      tags:(__ @ValueResTag)* 
      (_ OPEN CLOSE _)? 
      BEGIN statements:NonGlobals END  {
          return I('DeclareFunction', { resloc, tags}, { statements } )
      }

  DeclareMacro 
    = "macro" 
      __ name:IDENT 
      args:macro_args 
      BEGIN statements:NonGlobals END {
        return V('DeclareMacro', {},{ name, args, statements  } )
      }

  Globals 
    = head:global tail:(EOL @global)* {
        return V('Statements',{statements:[head,...tail]})
      }
  
  NonGlobals 
    = head:Statement tail:(EOL @Statement)* {
        return V('Statements',{statements:[head,...tail]})
      }

  BlockStatements  
    = BEGIN @NonGlobals END  

  StatementOrBlock
    = BlockStatements / __ @Instruction


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
      __ "then" then:StatementOrBlock {
        return V('DeclareEvent',{trigger,conditions,then})
      }

Directive
  =  "import" 
    __ file:string {
      return I('Import',{file})
    } 
  / "define" __ resloc:ValueResLoc __ value:LiteralValue {
    return I('DefineJson',{resloc,value})
  }
//\\ compile-time constant

  arg_name 'macro argument'
    = "?" @WORD

  arg_value 
    = LiteralValue


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
  = resloc:ValueResLoc _ OPEN args:call_args? CLOSE {
      return V('MacroCall', { resloc}, { args } )
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
  = DeclareVar
  / DeclareScore
  / DeclareTag

    DeclareTag 
      = "tag" __ name:ident_lit &EOL {
        return I('DeclareTag',{name})
      }
  
    DeclareVar 
      = "var" __ "$" name:IDENT value:(EQUALS @int)? {
          return I('DeclareVar',{value},{name})
        }
  
    DeclareScore 
      = "score" __ name:IDENT criterion:(__ @score_criterion)? {
        return I('DeclareScore',{},{name,criterion})
      }

CompareOp 
    = ">=" { return 'OpGTE' }
    / "<=" { return 'OpLTE' }
    / "==" { return 'OpEQ' }
    / "!=" { return 'OpNEQ' }
    / "<" { return 'OpLT' }
    / ">" { return 'OpGT' }

ValueNode
  = ValueCompare

ValueCompare
  = left:ValueAccessor _ op:CompareOp _ right:ValueAccessor {
      return V(op,{left,right})
    }
  / ValueAccessor

ValueAccessor
  = ValueScore 
  / ValueDataPath
  / ValueAtom

ValueAtom 
  = OPEN @ValueNode CLOSE
  / ValueConstant
  / ValueVariable
  / ValueBossBarProp
  / ValueSelector
  // ValueResLoc
  / LiteralValue
  
  LValue
    = ValueConstant
    / ValueVariable
    / ValueBossBarProp
    / ValueScore
    / ValueDataPath

  RValue
    = Instruction
    / ValueNode

  ValueDataPath
    = ValueDataPathStorage
    / ValueDataPathVar
    / ValueDataPathBlock
    / ValueDataPathGeneric
        
    ValueDataPathGeneric
      = left:ValueAtom "::" right:nbt_path {
          return V('DataPathGeneric', { left, right } )
        }

    ValueDataPathStorage
      = "@@" left:ValueResLoc "::" path:nbt_path {
          return V('DataPathGeneric', { name, path } )
        }

    ValueDataPathBlock
      = position:Position "::" path:nbt_path {
          return V('DataPathBlock', { position,path } )
        }

    ValueDataPathVar
      = "@@" path:nbt_path { return N('ValueDataPathVar', { path } ) }

  ValueVariable 
    = "$" name:IDENT {
      return V('Variable',{},{name})
    }

  ValueConstant
    = "?" name:IDENT {
      return V('Constant',{},{name})
    }

  ValueScore 
    = left:ValueAtom _ "->" _ right:ValueAtom {
      return V( 'Score', { left,right } )
    } 

  ValueSelector 
    = spec:selector_spec {
      return V( 'Selector', { spec } )
    } 

  ValueBossBarProp 
    = "bossbar" __ resloc:resloc __ prop:IDENT {
      return V( 'BossBarProp', { resloc},{ prop } )
    } 
 
  ValueNativeCommand
    = "/" command:command_parts {
      return V('NativeCommand', { command  } )
    } 

  
Assign 
  = AssignScaled 
  / AssignUnary 
  / AssignBinary

  AssignScaled
    = left:LValue EQUALS scale:AssignmentScale right:RValue {
        return I('AssignScaled',{left,right,scale})  
      } 
  AssignBinary
    = left:LValue _ op:AssignOp _ right:RValue {
        return I(op ,{left,right})  
      } 

  AssignUnary
    = left:LValue _ op:AssignOpUnary {
        return I(op ,{left})  
      } 

  AssignmentScale 
    = scale:(@typed_number _ "*" _) {
      return N('AssignmentScale',{scale})
    }

  AssignOp 
    = "<=>" { return 'AssignSwap' }
    / "+=" { return 'AssignAdd' }
    / "-=" { return 'AssignSub' }
    / "*=" { return 'AssignMul' }
    / "/=" { return 'AssignDiv' }
    / "%=" { return 'AssignMod' }
    / ">=" { return 'AssignGT' }
    / "<=" { return 'AssignLT' }
    / "?=" { return 'AssignSuccess' }
    / "=" { return 'Assign' }

  AssignOpUnary 
    = "++" { return 'AssignInc' }
    / "--" { return 'AssignDec' }
    

Assignment
  = AssignConstant
  / Assign

    lhand_scoreboard
      = var_id / score_id
  
    
  AssignConstant 
    = name:arg_name EQUALS value:LiteralValue {
      return I('DeclareConstant',{value},{name})
    }



NativeCommand 
  = "/" command:command_parts {
      return I('NativeCommand', { command  } )
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

MinityCommand
  = "say" 
    __ line:raw_line {
      return I('CmdSay',{line})
    }
  / "print" 
    __ line:raw_line {
      return I('CmdPrint',{line})
    }
  / "tell" 
    __ selector:ValueSelector
    __ line:raw_line {
      return I('CmdTell',{selector,line})
    }
  / "append"
    __ left:ValueNode
    __ right:ValueNode {
      return I('Append',{left,right})
    }
  / "prepend"
    __ left:ValueNode
    __ right:ValueNode {
      return I('Prepend',{left,right})
    }
  / "merge"
    __ left:ValueNode
    __ right:ValueNode {
      return I('Merge',{left,right})
    }
  / "insert"
    __ index:ValueNode
    __ left:ValueNode
    __ right:ValueNode {
      return I('Merge',{index,left,right})
    }
  / "remove"
    __ left:ValueNode {
      return I('Remove',{left})
    }    

WrappedCommand
  = command:cmd {
    return I('NativeCommand',{command})
  }
  cmd 
  = "summon" 
    pos:(_ @Position)? 
    __ 
    type:resloc_mc CONCAT 
    nbt:(@object)? 
    then:(__ "then" __ @StatementOrBlock )? {
      return N('cmd_summon', { pos, type, nbt, then } )
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
  
  

//\\ directives

    
//\\ execute
 
  mod_arg_axes 
    = OPEN @("xyz"/"xy"/"xz"/"yz"/"x"/"y"/"z") CLOSE
    / __ @("xyz"/"xy"/"xz"/"yz"/"x"/"y"/"z")
  
  mod_arg_anchor 
    = OPEN @ANCHOR CLOSE
    / __ @ANCHOR
  

  mod_arg_selector_anchor
    = OPEN selector:selector anchor:(__ @ANCHOR)? CLOSE {
        return [ selector, anchor ]
      }
    / __ selector:selector anchor:(__ @ANCHOR)? {
        return [ selector, anchor ]
      }

  
  dir_number = @float !"deg"
  rot_angle = @float "deg"
  
  mod_arg_number
  	= OPEN @dir_number CLOSE
    / __ @dir_number
    
  mod_arg_angle
  	= OPEN @rot_angle CLOSE
    / __ @rot_angle
    
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
    = CONCAT "." tag:tag_id { return [N('cond_tag', { op:'include', tag }) ]  }
    / CONCAT "!" tag:tag_id  { return [N('cond_tag', { op:'exclude', tag }) ]   }

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
    test = test_predicate/test_datapath/test_scoreboard/test_entity/test_block

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

    test_datapath = path:datapath {
        return N('test_datapath', { path } )
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
    = $([a-z]i [a-z0-9.:_-]i+)


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
      / id:lhand_scoreboard  {
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
        = selector:selector_single "::" path:nbt_path {
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
      = name:ident EQUALS value:(bool/number/string) {
          return N('block_state',{name,value})
        } 

    item_spec 'item predicate'
      = resloc:resloc_or_tag_mc CONCAT nbt:(@object)? {
          return N('item_spec',{resloc,nbt})
        }


//\\ parts

  ResPart = LiteralIdent/ValueConstant

  ValueResName 
    = nameParts:ResNameParts {
        return V('ResLoc',{ nameParts })
      }

  ResNameParts = head:ResPart tail:("/" @ResPart)* {
    return [head,...tail]
  }

  ValueResLoc 
    = ns:(@ResPart ":")? nameParts:ResNameParts {
        return V('ResLoc', {ns,nameParts})
      }

  ValueResTag
    = "#" ns:(@ResPart ":")? nameParts:ResNameParts {
        return V('ResTag', {ns,nameParts})
      }

 

  resloc_spec
    = ns:(@ident ":")? 
      head:ident tail:("/" @ident)* {
        return { ns, nameParts:[head,...tail] }
      }

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
        return N('restag_mc', { name } )
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
          head:array_item
          tail:(COMMA @array_item )*
          COMMA?
          { return [head].concat(tail); }
        )?
        ___ "]"
        { return N('array_lit', { type:'array', items: items || [] } ) }
  
    array_item 
      = "..." _ array:array {
          return N('array_spread', { array })
        } 
      / value:typed_value {
        return N('array_value', { value })
      }
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
      / value:INT suffix:[bsli]i? {
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
      = value:FLOAT suffix:[fd]i? {
          return N('number_lit', { type:'float',value:+value,suffix:suffix||"f" } )
        } 
      / value:INT suffix:[fd]i {
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
      parts:raw_part*
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

  raw_line = parts:raw_line_part* {
    return N('raw_line',{parts})
  }

  raw_line_part 
    = raw_tag 
    / raw_expand
    / chars:$(__+) {
      return N('raw_chars_ws',{chars})
    }
    /  raw_chars

  raw_part 
    = raw_tag 
    / raw_expand
    /  chars:WS+ {
        return N('raw_chars_ws',{chars})
      }
    /  raw_chars


  raw_chars = 
      chars:$((!LT !WS raw_char)+) {
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
  ___ 'whitespace' = WSS*
  SPACE = [ \t]
  
  WS = [ \n\t\r]
  WSS  
    = WS
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
      Instruction / Declaration
    ) {
        statement.text = text();
        return statement;
      }
  Instruction 
    = Execution
    / Construct
    / WrappedConstruct
    
    / PseudoCall 
    / CallFunctionTag
    / MacroCall 

    / Assignment 

    / NativeCommand 
    / MinityCommand
    / WrappedCommand
     
    


  
//\\ execution context modifiers

Execution 
    = mods:Modifiers executable:StatementOrBlock {
      return V( 'Execute', { mods, executable } )
  }
  Modifiers 
    = head:Modifier tail:(__ @Modifier)* {
      return V('Mods',{mods:[head,...tail]})
    }

  Modifier  
    = "align" arg:mod_arg_axes {
        return V( 'ModAlign', {}, { arg } )
      }
    / "anchored" arg:mod_arg_anchor {
        return V( 'ModAnchored', {}, { arg } )
      }
    / "as" __ arg:ValueNode { 
        return V( 'ModAs', { arg } )
      }
    / "at" __ arg:ValueNode { 
        return V( 'ModAt', { arg } )
      }
    / "facing" arg:mod_arg_selector_anchor { 
        return V( 'ModFacing', {arg} )
      }
    / "for" __ arg:ValueNode { 
        return V( 'ModFor', { arg } )
      }
    / "in" __ arg:ValueNode {
      return V( 'ModIn', { arg } )
    }
    / "pos""itioned"? __ "as" __ arg:ValueNode { 
        return V( 'ModPositionedAs', { arg } )
      }
    / "pos""itioned"? __ arg:Position { 
        return V( 'ModPositioned', { arg } )
      }
    / "rot""ated"? __ "as" __ arg:ValueNode { 
        return V( 'ModRotatedAs', { arg } )
      }
    / "rot""ated"? __ arg:Position { 
        return V( 'ModRotated', { arg } )
      }
    / arg:RelativeAngles {
      return V('ModRotated', { arg } )
    }
    / arg:RelativeCoords {
      return V('ModPositioned', { arg } )
    }
    / arg:LocalCoords {
      return V('ModPositioned', { arg } )
    }
//\\ construct  
  Construct 
    = test:Tests then:StatementOrBlock 
        otherwise:(__ "else" @StatementOrBlock)? {
        return V('IfElse', { test, then, otherwise } )
      }
    / "repeat" mods:(__ @mods:Modifiers)? 
      statements:StatementOrBlock? 
      __ test:LoopTests
      then:(__ "then" @StatementOrBlock)? {
        if (mods) return V('RepeatWithMods',{mods,statements,test,then})
        return V('Repeat',{statements,test,then})
      }
    / "after" __ time:float unit:[tds] 
      statements:StatementOrBlock 
      then:(__ "then" @StatementOrBlock)? {
        return V('After', { time, statements, then }, {unit} )
      }
    /  "every" __ time:float unit:[tds] 
        statements:StatementOrBlock 
        test:(__ @LoopTests)?
        then:(__ "then" @StatementOrBlock)? {
          return V('Every',{statements,test,time,then}, {unit} )
      } 
    / "every" __ time:float unit:[tds] 
      test:(__ @LoopTests)?
      then:(__ "then" @StatementOrBlock) {
        return V('Every',{test,time,then},{unit})
      }
      
  

  WrappedConstruct 
    = command:(
        head:Promise tail:(__ "and" __ @Promise)* 
        clauses: ThenCatchClause {
          return N('PromiseCall',{promises:[head,...tail],...clauses})
        } 
    ) {
      return I('NativeCommand',{command})
    }
//\\ conditionals

//\\ block macros
  MacroCallSpec 
    = ns:(@WORD ":")? name:NAME args:(_ OPEN @call_args CLOSE)? {
        return N('MacroCallSpec', {ns, name, args})
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

  ThenClause = __ "then" __ @StatementOrBlock
  CatchClause = __ "catch" __ @StatementOrBlock
  

  PseudoCall
    = "reject" _ "(" _ ")" {
        return I('Reject')
      }
    / "resolve" _ "(" _ ")"  {
        return I('Resolve')
      }
    / "self" _ "(" _ ")" {
        return I('CallSelf', {} )
      }


 
  FunctionCall
    =  resloc:FunctionCallResloc {
      return N('FunctionCall', { resloc } )
    }

  CallFunctionTag
    =  restag:restag _ OPEN _ CLOSE {
      return I('CallFunctionTag', { restag } )
    }

  FunctionCallResloc = !RESERVED @resloc:resloc_or_tag _ OPEN _ CLOSE 





  LiteralValue
    = ValueConstant
    / PseudoFunction
    / LiteralArray
    / LiteralObject
    / LiteralScalar
    


  LiteralScalar
    = LiteralBoolean
    / LiteralString
    / LiteralFloat
    / LiteralInt 


  LiteralBoolean 
    = "true" {  return V('LiteralBoolean', {}, { value: true  } ) }
    / "false" { return V('LiteralBoolean', {}, { value: false } ) }

  LiteralInt
    = value:INT ![.df]i suffix:[islb]i? { 
      const Class = ({
        i: 'LiteralInt',
        b: 'LiteralByte',
        l: 'LiteralLong',
        s: 'LiteralShort'
      })[suffix||"i"]
      return V(Class, {}, {value})
    }

  LiteralFloat
    = value:FLOAT ![islb]i suffix:[df]i? { 
      const Class = ({
        f: 'LiteralFloat',
        d: 'LiteralDouble'
      })[suffix||"f"]
      return V(Class, {}, {value})
    }
    
  LiteralArray
    = "[" ___
      items: (
        head:ArrayItem
        tail:(COMMA @ArrayItem)*
        COMMA?
        { return [head].concat(tail); }
      )?
      ___ "]"
      { return V('LiteralArray', { items: items || [] } ) }

    ArrayItem
      = SpreadArray / LiteralValue
    
    SpreadArray
      = "..." _ right:LiteralValue {
        return V('SpreadArray',{right})
      }
  
  LiteralObject
    = "{" ___
      props:(
        head:ObjectProp tail:(COMMA @ObjectProp)* COMMA? {
          return [head, ...tail];
        }
      )?
      ___ "}"
      { return V('LiteralObject', { props: props || [] } ) }
    
    ObjectProp
      = SpreadObject
      / key:(ObjectPropKey) _":" ___ value:LiteralValue {
          return  V('LiteralProp', { key, value })
        }
    ObjectPropKey
      = LiteralScalar

    SpreadObject
      = "..." _ right:LiteralValue {
        return V('SpreadObject', {right})
      }

  LiteralString
    = value:string_lit {
      return V('LiteralString', { value } )
    }

  LiteralIdent
    = value:IDENT {
      return V('LiteralString', {},{ value } )
    }

  PseudoFunction
    = "json" __ arg:LiteralValue {
        return V('FunctionJson',{arg})
      }
    / "snbt" __ arg:LiteralValue {
        return V('FunctionSnbt',{arg})
      }

  BlockSpec 
  = resloc: (ValueConstant/ValueResLoc/ValueResTag)
    states:(CONCAT @BlockStates)?
    nbt:(CONCAT @LiteralObject)? {
      return V('BlockSpec',{resloc,states,nbt})
    }

    BlockStates
      = "[" ___
        props:(
          head:BlockState tail:(COMMA @BlockState)* COMMA? {
            return [head, ...tail];
          }
        )?
        ___ "]"
        { return V('LiteralObject', { props: props || [] } ) }
    
    BlockState
      = SpreadObject
      / key:(ObjectPropKey) _"=" ___ value:LiteralValue {
          return  V('LiteralProp', { key, value })
        }    


    Tests 
      = head:Test tail:(__ "and" __ @Test)* {
          return V('Tests',{tests:[head,...tail]})
        }
    
    Test
      = "if" __ arg:TestValue {
          return V('TestTrue',{arg})
        }
      / "unless" __ arg:TestValue {
        return V('TestFalse',{arg})
      }


    LoopTests 
      = head:LoopTest tail:(__ "and" __ @LoopTest)* {
          return V('Tests',{tests:[head,...tail]})
        }
    
    LoopTest
      = "while" __ arg:TestValue {
          return V('TestTrue',{arg})
        }
      / "until" __ arg:TestValue {
        return V('TestFalse',{arg})
      }

    TestValue
      = OPEN @TestValue CLOSE
      / ValuePredicate      
      / BlockSpec
      / ValueNode
    
    ValuePredicate
      = "predicate" __ resloc:ValueResLoc {
        return V('ValuePredicate',{resloc})
      }


