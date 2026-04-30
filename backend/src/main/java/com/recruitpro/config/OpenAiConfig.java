package com.recruitpro.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Configuration for the OpenAI HTTP client used to structure resume text.
 */
@Slf4j
@Configuration
public class OpenAiConfig {

    @Value("${app.openai.api-key:}")
    private String apiKey;

    /** Connect timeout for OpenAI calls (ms). */
    @Value("${app.openai.connect-timeout-ms:10000}")
    private int connectTimeoutMs;

    /** Read timeout for OpenAI calls (ms) — GPT responses can be slow. */
    @Value("${app.openai.read-timeout-ms:60000}")
    private int readTimeoutMs;

    @Value("${app.openai.model:gpt-4o-mini}")
    private String model;

    @Value("${app.openai.base-url:https://api.openai.com/v1}")
    private String baseUrl;

    @Bean(name = "openAiRestTemplate")
    public RestTemplate openAiRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);

        RestTemplate restTemplate = new RestTemplate(factory);

        // Attach Authorization and Content-Type headers to every request
        restTemplate.getInterceptors().add((request, body, execution) -> {
            request.getHeaders().set(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey);
            request.getHeaders().setContentType(MediaType.APPLICATION_JSON);
            return execution.execute(request, body);
        });

        log.info("OpenAI REST client configured — model={}, baseUrl={}", model, baseUrl);
        return restTemplate;
    }

    public String getApiKey()       { return apiKey; }
    public String getModel()        { return model; }
    public String getBaseUrl()      { return baseUrl; }
}
