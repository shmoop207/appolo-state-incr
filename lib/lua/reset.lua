local key = string.format("incr_{%s}", KEYS[1])
local publishName = string.format("incr_state_%s", KEYS[1])

redis.call('DEL', key)

redis.call("PUBLISH", publishName, tonumber(ARGV[1]))
