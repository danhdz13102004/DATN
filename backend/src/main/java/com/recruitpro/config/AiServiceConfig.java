package com.recruitpro.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Configuration for the AI service HTTP client.
 * Reads AI_SERVICE_URL from environment and sets connection/read timeouts.
 */
@Slf4j
@Configuration
public class AiServiceConfig {

    @Value("${app.ai-service.url:http://ai-service:8000}")
    private String aiServiceUrl;

    @Bean(name = "aiRestTemplate")
    public RestTemplate aiRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);   // 5 s
        factory.setReadTimeout(30_000);     // 30 s

        RestTemplate restTemplate = new RestTemplate(factory);

        // Prepend base URL via an interceptor so callers only pass relative paths
        restTemplate.getInterceptors().add((request, body, execution) -> {
            String original = request.getURI().toString();
            if (!original.startsWith("http")) {
                throw new IllegalArgumentException(
                        "aiRestTemplate requires absolute URI. Use rootUri pattern or pass full URL.");
            }
            return execution.execute(request, body);
        });

        log.info("Configuring AI service client — base URL: {}", aiServiceUrl);
        return restTemplate;
    }

    public String getAiServiceUrl() {
        return aiServiceUrl;
    }
}
