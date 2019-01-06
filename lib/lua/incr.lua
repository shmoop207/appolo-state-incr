local key = string.format("incr_{%s}", KEYS[1])
local publishName = string.format("incr_state_%s", KEYS[1])

local expire = tonumber(ARGV[3]);

local changed = redis.call("SETNX", key, tonumber(ARGV[2]))

if (changed == 1 and expire > 0) then
    redis.call("pexpire", key, expire)
end

local newIncr = redis.call("INCRBYFLOAT", key, tonumber(ARGV[1]));

redis.call("PUBLISH", publishName, newIncr)

return newIncr




