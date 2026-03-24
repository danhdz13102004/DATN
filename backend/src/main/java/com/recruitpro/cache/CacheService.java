package com.recruitpro.cache;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Redis cache abstraction. All Redis access MUST go through this service
 * per backend.md rule — never use RedisTemplate directly from Service/Controller.
 * Every key MUST have a TTL — no indefinite keys.
 * Keys MUST be prefixed with domain namespace (e.g., "job:detail:{id}").
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CacheService {

    private final StringRedisTemplate redisTemplate;

    /**
     * Get a cached value by key.
     */
    public Optional<String> get(String key) {
        String value = redisTemplate.opsForValue().get(key);
        if (value != null) {
            log.debug("Cache HIT: {}", key);
        } else {
            log.debug("Cache MISS: {}", key);
        }
        return Optional.ofNullable(value);
    }

    /**
     * Set a cached value with TTL.
     *
     * @param key      Namespaced key (e.g., "job:detail:uuid")
     * @param value    Serialized value (JSON string)
     * @param ttl      Time-to-live value
     * @param timeUnit Time unit for TTL
     */
    public void set(String key, String value, long ttl, TimeUnit timeUnit) {
        redisTemplate.opsForValue().set(key, value, ttl, timeUnit);
        log.debug("Cache SET: {} (TTL={}{})", key, ttl, timeUnit);
    }

    /**
     * Delete a cached value.
     */
    public void delete(String key) {
        redisTemplate.delete(key);
        log.debug("Cache DELETE: {}", key);
    }

    /**
     * Delete all keys matching a pattern.
     * Use for cache invalidation (e.g., "job:list:*").
     */
    public void deleteByPattern(String pattern) {
        var keys = redisTemplate.keys(pattern);
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
            log.debug("Cache DELETE pattern '{}': {} keys removed", pattern, keys.size());
        }
    }

    /**
     * Check if a key exists.
     */
    public boolean exists(String key) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    /**
     * Set value only if not exists (for distributed locking / dedup).
     */
    public boolean setIfAbsent(String key, String value, long ttl, TimeUnit timeUnit) {
        return Boolean.TRUE.equals(
                redisTemplate.opsForValue().setIfAbsent(key, value, ttl, timeUnit)
        );
    }
}
