package com.recruitpro.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;
import org.postgresql.util.PGobject;

import java.sql.SQLException;

/**
 * JPA {@link AttributeConverter} that maps a Java object to a PostgreSQL {@code jsonb} column
 * and back, using Jackson for serialisation.
 *
 * <p>Usage on entity fields:
 * <pre>{@code
 * @Column(name = "my_json", columnDefinition = "jsonb")
 * @Convert(converter = JsonbConverter.class)
 * private MyDto myJson;
 * }</pre>
 */
@Slf4j
@Converter
public class JsonbConverter<T> implements AttributeConverter<T, Object> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    // ── To DB ────────────────────────────────────────────────────────────────

    @Override
    public Object convertToDatabaseColumn(T attribute) {
        try {
            PGobject pgObject = new PGobject();
            pgObject.setType("jsonb");
            pgObject.setValue(attribute == null ? null : MAPPER.writeValueAsString(attribute));
            return pgObject;
        } catch (JsonProcessingException | SQLException e) {
            log.error("Failed to convert object to jsonb: {}", e.getMessage());
            return null;
        }
    }

    // ── From DB ──────────────────────────────────────────────────────────────

    @Override
    @SuppressWarnings("unchecked")
    public T convertToEntityAttribute(Object dbData) {
        if (dbData == null) return null;
        try {
            String json = dbData instanceof PGobject pg ? pg.getValue() : dbData.toString();
            // Return as a generic Map so the field type on the entity can be Map<String, Object>
            return (T) MAPPER.readValue(json, Object.class);
        } catch (JsonProcessingException e) {
            log.error("Failed to convert jsonb to object: {}", e.getMessage());
            return null;
        }
    }
}
