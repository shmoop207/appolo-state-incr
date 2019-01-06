local key = string.format("incr_{%s}", KEYS[1])
local publishName = string.format("incr_state_%s", KEYS[1])
local expire = tonumber(ARGV[2]);
local value = tonumber(ARGV[1]);

redis.call('SET', key,value)

if ( expire > 0) then
    redis.call("pexpire", key, expire)
end

redis.call("PUBLISH", publishName, value)
