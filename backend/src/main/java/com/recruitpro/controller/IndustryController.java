package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.model.Industry;
import com.recruitpro.repository.IndustryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/industries")
@RequiredArgsConstructor
public class IndustryController {

    private final IndustryRepository industryRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Industry>>> listAll() {
        List<Industry> industries = industryRepository.findAll(Sort.by("name"));
        return ResponseEntity.ok(ApiResponse.ok(industries));
    }
}
