package com.recruitpro.chat;

import com.recruitpro.security.JwtUtil;
import com.recruitpro.service.ConversationService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtChannelInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;
    private final ConversationService conversationService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = extractToken(accessor);
            if (token == null) {
                throw new MessageDeliveryException("Missing Authorization token");
            }
            Claims claims = jwtUtil.parseToken(token)
                    .orElseThrow(() -> new MessageDeliveryException("Invalid or expired JWT"));

            String userId = jwtUtil.getSubject(claims);
            String role   = jwtUtil.getRole(claims);

            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    userId, null, List.of(new SimpleGrantedAuthority("ROLE_" + role))
            );
            accessor.setUser(auth);
            log.debug("[WS] CONNECT authenticated: userId={} role={}", userId, role);
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if (destination != null && destination.startsWith("/topic/chat.")) {
                String convId  = destination.replace("/topic/chat.", "");
                String userId  = getUserId(accessor);
                if (userId != null) {
                    conversationService.assertParticipant(UUID.fromString(convId), UUID.fromString(userId));
                }
            }
        }

        return message;
    }

    private String extractToken(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        Map<String, Object> attrs = accessor.getSessionAttributes();
        if (attrs != null) {
            Object t = attrs.get("token");
            if (t instanceof String s) return s;
        }
        return null;
    }

    private String getUserId(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof UsernamePasswordAuthenticationToken auth) {
            return (String) auth.getPrincipal();
        }
        return null;
    }
}
