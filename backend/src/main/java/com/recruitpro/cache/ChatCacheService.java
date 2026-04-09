package com.recruitpro.cache;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ChatCacheService {

    private static final String IDEMPOTENCY_PREFIX = "idempotency:msg:";
    private static final String PRESENCE_PREFIX    = "presence:";
    private static final Duration IDEMPOTENCY_TTL  = Duration.ofHours(24);
    private static final Duration PRESENCE_TTL     = Duration.ofSeconds(30);

    private final StringRedisTemplate redisTemplate;

    // ── Idempotency (atomic SETNX to avoid race condition) ─────────────────

    /**
     * Atomically claims the idempotency slot.
     * Returns null  → slot was free, message should be saved.
     * Returns UUID  → slot was already taken, return that messageId to caller.
     */
    public String acquireIdempotencySlot(String idempotencyKey, String messageId) {
        String redisKey = IDEMPOTENCY_PREFIX + idempotencyKey;
        Boolean acquired = redisTemplate.opsForValue()
                .setIfAbsent(redisKey, messageId, IDEMPOTENCY_TTL);
        if (Boolean.TRUE.equals(acquired)) return null;
        return redisTemplate.opsForValue().get(redisKey);
    }

    // ── Presence ────────────────────────────────────────────────────────────

    public void setUserOnline(UUID userId) {
        redisTemplate.opsForValue()
                .set(PRESENCE_PREFIX + userId, "ONLINE", PRESENCE_TTL);
    }

    public boolean isUserOnline(UUID userId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(PRESENCE_PREFIX + userId));
    }
}
