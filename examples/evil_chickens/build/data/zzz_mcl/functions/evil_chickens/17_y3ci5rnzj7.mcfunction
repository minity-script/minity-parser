say still running
execute as @e[type=minecraft:chicken,sort=random,limit=1,tag=--evil_chickens-evil,nbt={OnGround:1b}] run function zzz_mcl:evil_chickens/15_76zscejw7se
execute as @e[type=minecraft:endermite,tag=--evil_chickens-evil] run data modify entity @s Lifetime set value 0
execute as @e[type=minecraft:chicken,tag=--evil_chickens-evil] at @s run execute unless entity @e[type=minecraft:player,tag=--evil_chickens-playing,distance=..19.999999] run function zzz_mcl:evil_chickens/16_b0b2pmu61p
execute unless score --evil_chickens-running --evil_chickens--vars matches 0 run schedule function zzz_mcl:evil_chickens/17_y3ci5rnzj7 4s