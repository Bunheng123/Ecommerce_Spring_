package com.setec.stock_inventory.service;

import com.setec.stock_inventory.dto.Request.LoginRequest;
import com.setec.stock_inventory.dto.Request.RegisterRequest;
import com.setec.stock_inventory.dto.Response.LoginResponse;
import com.setec.stock_inventory.dto.Response.LoginStatusResponse;
import com.setec.stock_inventory.dto.Response.MessageResponse;
import jakarta.servlet.http.HttpServletRequest;

public interface AuthService {
    MessageResponse register(RegisterRequest request);
    LoginResponse login(LoginRequest request);
    LoginStatusResponse getLoginStatus(HttpServletRequest request);
}
