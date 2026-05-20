package com.recruitpro.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class GoogleOAuth2Config {

    @Value("${app.google.oauth2.client-id:}")
    private String clientId;

    @Value("${app.google.oauth2.client-secret:}")
    private String clientSecret;

    @Bean
    public RestTemplate googleRestTemplate(RestTemplateBuilder builder) {
        return builder
                .rootUri("https://oauth2.googleapis.com")
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(10))
                .build();
    }
}
