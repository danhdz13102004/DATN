package com.recruitpro.service;

import com.recruitpro.exception.ForbiddenException;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Company;
import com.recruitpro.model.CompanyAddress;
import com.recruitpro.repository.CompanyAddressRepository;
import com.recruitpro.repository.CompanyRepository;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final CompanyAddressRepository addressRepository;
    private final StorageService storageService;

    // ── Public ───────────────────────────────────

    public Page<Company> findAll(Pageable pageable) {
        return companyRepository.findAll(pageable);
    }

    public Company findById(UUID id) {
        return companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found"));
    }

    // ── Company (own) ────────────────────────────

    @Transactional
    public Company updateProfile(UUID companyId, Company updates) {
        Company company = findById(companyId);
        if (updates.getName() != null) company.setName(updates.getName());
        if (updates.getDescription() != null) company.setDescription(updates.getDescription());
        if (updates.getWebsite() != null) company.setWebsite(updates.getWebsite());
        return companyRepository.save(company);
    }

    @Transactional
    public Company uploadLogo(UUID companyId, MultipartFile file) throws IOException {
        Company company = findById(companyId);
        String key = storageService.upload(
                "logos", file.getOriginalFilename(),
                file.getInputStream(), file.getSize(), file.getContentType()
        );
        company.setLogoUrl(storageService.getPublicUrl(key));
        return companyRepository.save(company);
    }

    // ── Admin ────────────────────────────────────

    @Transactional
    public Company verify(UUID id) {
        Company company = findById(id);
        company.setVerified(true);
        log.info("Company verified: {} (id={})", company.getName(), id);
        return companyRepository.save(company);
    }

    @Transactional
    public Company setBlocked(UUID id, boolean blocked) {
        Company company = findById(id);
        company.setBlocked(blocked);
        log.info("Company {}: {} (id={})", blocked ? "blocked" : "unblocked", company.getName(), id);
        return companyRepository.save(company);
    }

    // ── Addresses ────────────────────────────────

    public List<CompanyAddress> findAddresses(UUID companyId) {
        return addressRepository.findAllByCompanyId(companyId);
    }

    @Transactional
    public CompanyAddress createAddress(UUID companyId, CompanyAddress address) {
        address.setCompanyId(companyId);
        return addressRepository.save(address);
    }

    @Transactional
    public CompanyAddress updateAddress(UUID addressId, CompanyAddress updates, UserPrincipal principal) {
        CompanyAddress address = addressRepository.findById(addressId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found"));
        verifyCompanyOwnership(address.getCompanyId(), principal);

        if (updates.getLabel() != null) address.setLabel(updates.getLabel());
        if (updates.getAddressLine() != null) address.setAddressLine(updates.getAddressLine());
        if (updates.getCity() != null) address.setCity(updates.getCity());
        if (updates.getCountry() != null) address.setCountry(updates.getCountry());

        return addressRepository.save(address);
    }

    @Transactional
    public void deleteAddress(UUID addressId, UserPrincipal principal) {
        CompanyAddress address = addressRepository.findById(addressId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found"));
        verifyCompanyOwnership(address.getCompanyId(), principal);
        addressRepository.delete(address);
    }

    private void verifyCompanyOwnership(UUID companyId, UserPrincipal principal) {
        if (principal.getCompanyId() == null ||
            !companyId.toString().equals(principal.getCompanyId())) {
            throw new ForbiddenException("You do not have permission to manage this company's data");
        }
    }

    @Transactional
    public CompanyAddress setDefaultAddress(UUID addressId, UserPrincipal principal) {
        CompanyAddress address = addressRepository.findById(addressId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found"));
        verifyCompanyOwnership(address.getCompanyId(), principal);

        // Clear all defaults for this company
        List<CompanyAddress> allAddresses = addressRepository.findAllByCompanyId(address.getCompanyId());
        for (CompanyAddress addr : allAddresses) {
            if (addr.isDefault()) {
                addr.setDefault(false);
                addressRepository.save(addr);
            }
        }

        // Set the target as default
        address.setDefault(true);
        return addressRepository.save(address);
    }
}
