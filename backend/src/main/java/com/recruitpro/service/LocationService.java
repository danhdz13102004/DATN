package com.recruitpro.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.recruitpro.model.City;
import com.recruitpro.model.Country;
import com.recruitpro.repository.CityRepository;
import com.recruitpro.repository.CountryRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class LocationService {

    private static final String COUNTRIES_API_URL = "https://countriesnow.space/api/v0.1/countries";
    private static final String IP_API_URL = "https://ipapi.co/%s/json/";

    private final CountryRepository countryRepository;
    private final CityRepository cityRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @PostConstruct
    public void init() {
        fetchAndSeedCountriesAndCities();
    }

    @Transactional
    public void fetchAndSeedCountriesAndCities() {
        long existing = countryRepository.count();
        if (existing > 0) {
            log.info("LocationService: Countries table already has {} entries, skipping seed.", existing);
            return;
        }

        log.info("LocationService: Starting country/city seed from {}", COUNTRIES_API_URL);
        try {
            String response = restTemplate.getForObject(COUNTRIES_API_URL, String.class);
            if (response == null) {
                log.error("LocationService: Empty response from countries API");
                return;
            }

            JsonNode root = objectMapper.readTree(response);
            JsonNode data = root.path("data");
            if (!data.isArray()) {
                log.error("LocationService: Unexpected API response format");
                return;
            }

            // Fetch positions for lat/long (iso2 -> position)
            Map<String, Double[]> positions = fetchPositions();

            int countryInserted = 0;
            Map<String, Long> countryNameToId = new HashMap<>();

            for (JsonNode entry : data) {
                String name = entry.path("country").asText(null);
                String iso2 = entry.path("iso2").asText(null);
                String iso3 = entry.path("iso3").asText(null);
                if (name == null || iso2 == null || iso2.isBlank()) continue;

                Double[] pos = positions.getOrDefault(iso2, new Double[]{null, null});

                Country country = Country.builder()
                        .iso2(iso2.toUpperCase())
                        .iso3(iso3 != null && !iso3.isBlank() ? iso3.toUpperCase() : null)
                        .name(name)
                        .latitude(pos[0])
                        .longitude(pos[1])
                        .build();
                Country saved = countryRepository.save(country);
                countryNameToId.put(name.toLowerCase(), saved.getId());
                countryInserted++;
            }

            log.info("LocationService: Inserted {} countries", countryInserted);

            // Second pass: insert cities
            int cityInserted = 0;
            for (JsonNode entry : data) {
                String name = entry.path("country").asText(null);
                Long countryId = countryNameToId.get(name != null ? name.toLowerCase() : null);
                if (countryId == null) continue;

                JsonNode citiesNode = entry.path("cities");
                if (!citiesNode.isArray()) continue;

                for (JsonNode cityNode : citiesNode) {
                    String cityName = cityNode.asText(null);
                    if (cityName == null || cityName.isBlank()) continue;

                    City city = City.builder()
                            .country(countryRepository.getReferenceById(countryId))
                            .name(cityName.trim())
                            .build();
                    cityRepository.save(city);
                    cityInserted++;
                }
            }

            log.info("LocationService: Inserted {} cities", cityInserted);
        } catch (Exception e) {
            log.error("LocationService: Failed to seed countries/cities", e);
        }
    }

    private Map<String, Double[]> fetchPositions() {
        Map<String, Double[]> positions = new HashMap<>();
        try {
            String response = restTemplate.getForObject(
                    "https://countriesnow.space/api/v0.1/countries/positions", String.class);
            if (response == null) return positions;

            JsonNode root = objectMapper.readTree(response);
            JsonNode data = root.path("data");
            if (!data.isArray()) return positions;

            for (JsonNode entry : data) {
                String iso2 = entry.path("iso2").asText(null);
                double lat = entry.path("lat").asDouble(0);
                double lon = entry.path("long").asDouble(0);
                if (iso2 != null && !iso2.isBlank()) {
                    positions.put(iso2.toUpperCase(), new Double[]{lat, lon});
                }
            }
        } catch (Exception e) {
            log.warn("LocationService: Could not fetch country positions", e);
        }
        return positions;
    }

    public List<Country> getAllCountries() {
        return countryRepository.findAll().stream()
                .sorted(Comparator.comparing(Country::getName))
                .toList();
    }

    public List<City> getCitiesByCountryId(Long countryId) {
        return cityRepository.findByCountryIdOrderByName(countryId);
    }

    public Country detectCountryByIp(String ip) {
        if (ip == null || ip.isBlank()) return null;
        try {
            String url = String.format(IP_API_URL, ip);
            String response = restTemplate.getForObject(url, String.class);
            if (response == null) return null;

            JsonNode root = objectMapper.readTree(response);
            String countryCode = root.path("country_code").asText(null);
            if (countryCode == null || countryCode.isBlank()) return null;

            return countryRepository.findByIso2(countryCode.toUpperCase()).orElse(null);
        } catch (Exception e) {
            log.warn("LocationService: Failed to detect country for IP {}", ip, e);
            return null;
        }
    }
}
