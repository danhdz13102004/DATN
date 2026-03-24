package com.recruitpro.service;

import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.User;
import com.recruitpro.model.enums.UserRole;
import com.recruitpro.model.enums.UserStatus;
import com.recruitpro.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public Page<User> findAllByFilters(UserRole role, UserStatus status, Pageable pageable) {
        return userRepository.findAllByFilters(role, status, pageable);
    }

    public User findById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Transactional
    public User updateStatus(UUID id, UserStatus status) {
        User user = findById(id);
        user.setStatus(status);
        log.info("User status updated: {} → {} (id={})", user.getEmail(), status, id);
        return userRepository.save(user);
    }
}
