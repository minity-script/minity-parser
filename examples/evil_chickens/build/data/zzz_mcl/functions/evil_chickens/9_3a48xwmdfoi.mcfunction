execute if entity @e[type=minecraft:player,tag=--evil_chickens-playing,scores={death=1..}] run function evil_chickens:defeat
execute unless score --evil_chickens-running --evil_chickens--vars matches 0 run schedule function zzz_mcl:evil_chickens/9_3a48xwmdfoi 2t