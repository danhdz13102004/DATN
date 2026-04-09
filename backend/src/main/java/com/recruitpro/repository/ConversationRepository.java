package com.recruitpro.repository;

import com.recruitpro.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    @Query("""
        SELECT c FROM Conversation c
        WHERE c.staffId = :staffId OR c.jobSeekerId = :jobSeekerId
        ORDER BY c.updatedAt DESC NULLS LAST
        """)
    List<Conversation> findAllByParticipant(@Param("staffId") UUID staffId,
                                            @Param("jobSeekerId") UUID jobSeekerId);

    List<Conversation> findByStaffIdOrderByUpdatedAtDesc(UUID staffId);

    List<Conversation> findByJobSeekerIdOrderByUpdatedAtDesc(UUID jobSeekerId);

    @Query("""
        SELECT c FROM Conversation c
        WHERE c.staffId = :staffId AND c.jobSeekerId = :jobSeekerId
        ORDER BY c.updatedAt DESC NULLS LAST, c.createdAt DESC
        """)
    List<Conversation> findByStaffIdAndJobSeekerIdOrderByLastActivityDesc(
            @Param("staffId") UUID staffId,
            @Param("jobSeekerId") UUID jobSeekerId);

    Optional<Conversation> findByApplicationIdAndStaffIdAndJobSeekerId(
            UUID applicationId, UUID staffId, UUID jobSeekerId);

    boolean existsByApplicationIdAndStaffIdAndJobSeekerId(
            UUID applicationId, UUID staffId, UUID jobSeekerId);
}
