package com.recruitpro.config;

import com.recruitpro.chat.ChatRedisSubscriber;
import com.recruitpro.chat.NotificationRedisSubscriber;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
@RequiredArgsConstructor
public class RedisPubSubConfig {

    private final RedisConnectionFactory connectionFactory;
    private final ChatRedisSubscriber chatSubscriber;
    private final NotificationRedisSubscriber notificationSubscriber;

    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer() {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(chatSubscriber,         new PatternTopic("redis:channel:chat:*"));
        container.addMessageListener(chatSubscriber,         new PatternTopic("redis:channel:read-receipt:*"));
        container.addMessageListener(notificationSubscriber, new PatternTopic("redis:channel:notification:*"));
        return container;
    }
}
