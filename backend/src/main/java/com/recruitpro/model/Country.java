package com.recruitpro.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "countries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Country {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "iso2", unique = true, nullable = false, length = 2)
    private String iso2;

    @Column(name = "iso3", length = 3)
    private String iso3;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "DOUBLE PRECISION")
    private Double latitude;

    @Column(columnDefinition = "DOUBLE PRECISION")
    private Double longitude;

    @OneToMany(mappedBy = "country", fetch = FetchType.LAZY)
    @Builder.Default
    private List<City> cities = new java.util.ArrayList<>();
}
