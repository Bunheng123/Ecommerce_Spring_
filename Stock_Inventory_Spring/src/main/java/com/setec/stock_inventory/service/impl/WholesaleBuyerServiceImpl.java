package com.setec.stock_inventory.service.impl;

import com.setec.stock_inventory.dto.Request.WholesaleBuyerRequestDto;
import com.setec.stock_inventory.dto.Response.WholesaleBuyerResponseDto;
import com.setec.stock_inventory.entity.WholesaleBuyer;
import com.setec.stock_inventory.entity.WholesaleOrder;
import com.setec.stock_inventory.exception.ResourceNotFoundException;
import com.setec.stock_inventory.mapper.WholesaleBuyerMapper;
import com.setec.stock_inventory.repo.WholesaleBuyerRepository;
import com.setec.stock_inventory.repo.WholesaleOrderRepository;
import com.setec.stock_inventory.service.WholesaleBuyerService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WholesaleBuyerServiceImpl implements WholesaleBuyerService {

    private final WholesaleBuyerRepository wholesaleBuyerRepository;
    private final WholesaleOrderRepository wholesaleOrderRepository;

    @Override
    @Transactional
    public WholesaleBuyerResponseDto createWholesaleBuyer(WholesaleBuyerRequestDto request) {
        WholesaleBuyer buyer = WholesaleBuyerMapper.toEntity(request);
        WholesaleBuyer saved = wholesaleBuyerRepository.save(buyer);
        return WholesaleBuyerMapper.toResponse(saved);
    }

    @Override
    public List<WholesaleBuyerResponseDto> getAllWholesaleBuyers() {
        return wholesaleBuyerRepository.findAll().stream()
                .map(WholesaleBuyerMapper::toResponse)
                .toList();
    }

    @Override
    public WholesaleBuyerResponseDto getWholesaleBuyerById(Long id) {
        WholesaleBuyer buyer = wholesaleBuyerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find wholesale buyer with id: " + id));
        return WholesaleBuyerMapper.toResponse(buyer);
    }

    @Override
    @Transactional
    public WholesaleBuyerResponseDto updateWholesaleBuyer(Long id, WholesaleBuyerRequestDto request) {
        WholesaleBuyer buyer = wholesaleBuyerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find wholesale buyer with id: " + id));

        WholesaleBuyerMapper.updateEntity(buyer, request);
        WholesaleBuyer updated = wholesaleBuyerRepository.save(buyer);
        return WholesaleBuyerMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void deleteWholesaleBuyer(Long id) {
        WholesaleBuyer buyer = wholesaleBuyerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find wholesale buyer with id: " + id));

        List<WholesaleOrder> existingOrders = wholesaleOrderRepository.findByBuyerId(id);
        if (!existingOrders.isEmpty()) {
            buyer.setActive(false);
            wholesaleBuyerRepository.save(buyer);
        } else {
            wholesaleBuyerRepository.delete(buyer);
        }
    }
}
