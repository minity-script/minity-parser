tag @s remove --mclang--internal-summoned
scoreboard players add --evil_chickens-chickens --evil_chickens--vars 1
execute store result bossbar evil_chickens:chickens value run scoreboard players get --evil_chickens-chickens --evil_chickens--vars
effect give @s minecraft:resistance 120 2 true
effect give @e[type=minecraft:endermite] minecraft:invisibility 120 1 true
tag @s add --evil_chickens-evil
spreadplayers ~ ~ 5 30 false @s