package com.recruitpro.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "industries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Industry {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = UUID.randomUUID();
    }
}
