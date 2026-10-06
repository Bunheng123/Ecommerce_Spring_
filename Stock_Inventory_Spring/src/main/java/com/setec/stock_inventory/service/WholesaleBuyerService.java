package com.setec.stock_inventory.service;

import com.setec.stock_inventory.dto.Request.WholesaleBuyerRequestDto;
import com.setec.stock_inventory.dto.Response.WholesaleBuyerResponseDto;

import java.util.List;

public interface WholesaleBuyerService {
    WholesaleBuyerResponseDto createWholesaleBuyer(WholesaleBuyerRequestDto request);
    List<WholesaleBuyerResponseDto> getAllWholesaleBuyers();
    WholesaleBuyerResponseDto getWholesaleBuyerById(Long id);
    WholesaleBuyerResponseDto updateWholesaleBuyer(Long id, WholesaleBuyerRequestDto request);
    void deleteWholesaleBuyer(Long id);
}
