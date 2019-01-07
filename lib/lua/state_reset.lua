local key = string.format("incr:%s:%s", KEYS[1], KEYS[2])
local publishName = string.format("incr_state_%s", KEYS[1])

redis.call('DEL', key)
redis.call("PUBLISH", publishName, KEYS[2] .. "##" .. ARGV[1])
