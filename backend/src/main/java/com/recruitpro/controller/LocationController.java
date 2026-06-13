package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.model.City;
import com.recruitpro.model.Country;
import com.recruitpro.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @GetMapping("/countries")
    public ResponseEntity<ApiResponse<List<Country>>> listCountries() {
        List<Country> countries = locationService.getAllCountries();
        return ResponseEntity.ok(ApiResponse.ok(countries));
    }

    @GetMapping("/countries/{countryId}/cities")
    public ResponseEntity<ApiResponse<List<City>>> listCitiesByCountry(@PathVariable Long countryId) {
        List<City> cities = locationService.getCitiesByCountryId(countryId);
        return ResponseEntity.ok(ApiResponse.ok(cities));
    }

    @GetMapping("/countries/detect-by-ip")
    public ResponseEntity<ApiResponse<Country>> detectCountryByIp(@RequestParam(required = false) String ip) {
        Country country = locationService.detectCountryByIp(ip);
        return ResponseEntity.ok(ApiResponse.ok(country));
    }

    @PostMapping("/admin/location/seed")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> reseedLocation() {
        locationService.fetchAndSeedCountriesAndCities();
        return ResponseEntity.ok(ApiResponse.ok("Location data reseeded successfully."));
    }
}
