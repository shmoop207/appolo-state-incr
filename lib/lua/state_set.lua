local key = string.format("incr:%s:%s", KEYS[1],KEYS[2])
local publishName = string.format("incr_state_%s", KEYS[1])

local value = tonumber(ARGV[1]);
local expire = tonumber(ARGV[2]);

redis.call('SET', key,value)

if ( expire > 0) then
    redis.call("pexpire", key, expire)
end

redis.call("PUBLISH", publishName,KEYS[2].."##"..value)
