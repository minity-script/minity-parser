execute positioned ~ ~1 ~ facing entity @e[type=minecraft:player,sort=nearest,limit=1,tag=--evil_chickens-playing] eyes positioned ^ ^ ^10 run execute if block ~ ~ ~ minecraft:air run tp @s ~ ~ ~ facing entity @e[type=minecraft:player,sort=nearest,limit=1,tag=--evil_chickens-playing] eyes
execute at @e[type=minecraft:player,sort=nearest,limit=1,tag=--evil_chickens-playing,distance=50.000001..] run tp ~ 10 ~