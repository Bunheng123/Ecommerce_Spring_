package com.setec.stock_inventory.exception;

import lombok.Getter;

@Getter
public class LoginFailedException extends RuntimeException {
    private final int remainingAttempts;

    public LoginFailedException(String message, int remainingAttempts) {
        super(message);
        this.remainingAttempts = remainingAttempts;
    }
}
