package com.setec.stock_inventory.exception;

import lombok.Getter;

@Getter
public class IpBlockedException extends RuntimeException {
    private final boolean blocked = true;
    private final long retryAfterSeconds;
    private final int remainingAttempts;

    public IpBlockedException(String message, long retryAfterSeconds, int remainingAttempts) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
        this.remainingAttempts = remainingAttempts;
    }
}
