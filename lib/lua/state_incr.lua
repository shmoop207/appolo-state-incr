local key = string.format("incr:%s:%s", KEYS[1],KEYS[2])
local publishName = string.format("incr_state_%s", KEYS[1])

local expire = tonumber(ARGV[3]);

local changed = redis.call("SETNX", key, tonumber(ARGV[2]))

if (changed == 1 and expire > 0) then
    redis.call("pexpire", key, expire)
end

local incr = redis.call("INCRBYFLOAT", key, tonumber(ARGV[1]));

redis.call("PUBLISH", publishName,KEYS[2].."##"..incr)

return {KEYS[2],incr}




