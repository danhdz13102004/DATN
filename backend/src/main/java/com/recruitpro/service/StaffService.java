package com.recruitpro.service;

import com.recruitpro.dto.request.CreateStaffRequestDto;
import com.recruitpro.dto.request.UpdateStaffRequestDto;
import com.recruitpro.dto.response.StaffMemberResponseDto;
import com.recruitpro.exception.DuplicateResourceException;
import com.recruitpro.exception.ForbiddenException;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Staff;
import com.recruitpro.model.User;
import com.recruitpro.model.enums.CompanyUserRole;
import com.recruitpro.model.enums.UserRole;
import com.recruitpro.model.enums.UserStatus;
import com.recruitpro.repository.StaffRepository;
import com.recruitpro.repository.UserRepository;
import com.recruitpro.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StaffService {

    private final UserRepository userRepository;
    private final StaffRepository staffRepository;
    private final PasswordEncoder passwordEncoder;

    public List<StaffMemberResponseDto> listStaff(UserPrincipal principal) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        return staffRepository.findAllByCompanyId(companyId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public StaffMemberResponseDto createStaff(UserPrincipal principal, CreateStaffRequestDto request) {
        if (!CompanyUserRole.OWNER.name().equals(principal.getCompanyRole())) {
            throw new ForbiddenException("Only company owner can create staff members");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .fullName(request.getFullName())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.COMPANY)
                .status(UserStatus.ACTIVE)
                .build();
        userRepository.save(user);

        Staff staff = Staff.builder()
                .user(user)
                .companyId(UUID.fromString(principal.getCompanyId()))
                .role(CompanyUserRole.valueOf(request.getRole()))
                .build();
        staffRepository.save(staff);

        log.info("Created new staff member {} for company {}", user.getEmail(), principal.getCompanyId());
        return mapToDto(staff);
    }

    @Transactional
    public StaffMemberResponseDto updateName(UUID staffId, UserPrincipal principal, UpdateStaffRequestDto request) {
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff not found"));

        // Allow update if the principal is the staff member themself
        if (!staff.getUser().getId().toString().equals(principal.getId())) {
            throw new ForbiddenException("You can only edit your own profile");
        }

        User user = staff.getUser();
        user.setFullName(request.getFullName());
        userRepository.save(user);

        return mapToDto(staff);
    }

    @Transactional
    public void deleteStaff(UUID staffId, UserPrincipal principal) {
        if (!CompanyUserRole.OWNER.name().equals(principal.getCompanyRole())) {
            throw new ForbiddenException("Only company owner can remove staff members");
        }

        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff not found"));

        if (staff.getUser().getId().toString().equals(principal.getId())) {
            throw new ForbiddenException("Owner cannot remove themselves");
        }

        if (!staff.getCompanyId().toString().equals(principal.getCompanyId())) {
            throw new ForbiddenException("Staff does not belong to your company");
        }

        // Hard delete staff link
        staffRepository.delete(staff);

        // Soft delete user record
        User user = staff.getUser();
        user.setDeletedAt(Instant.now());
        user.setStatus(UserStatus.SUSPENDED);
        userRepository.save(user);

        log.info("Removed staff {} from company {}", user.getEmail(), principal.getCompanyId());
    }

    private StaffMemberResponseDto mapToDto(Staff staff) {
        return StaffMemberResponseDto.builder()
                .id(staff.getId().toString())
                .userId(staff.getUser().getId().toString())
                .email(staff.getUser().getEmail())
                .fullName(staff.getUser().getFullName())
                .role(staff.getRole().name())
                .joinedAt(staff.getCreatedAt())
                .build();
    }
}
