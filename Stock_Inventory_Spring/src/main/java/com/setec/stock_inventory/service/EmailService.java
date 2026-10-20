package com.setec.stock_inventory.service;

import com.setec.stock_inventory.dto.email.OrderEmailItemDto;
import com.setec.stock_inventory.dto.email.OrderEmailPayload;
import com.setec.stock_inventory.dto.email.StockAlertEmailPayload;
import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.admin.email:hengheng513.513@gmail.com}")
    private String adminEmail;

    public String getAdminEmail() {
        if (adminEmail != null && !adminEmail.isBlank()) {
            return adminEmail.trim();
        }
        return "hengheng513.513@gmail.com";
    }

    @PostConstruct
    public void init() {
        if (mailSender instanceof JavaMailSenderImpl impl) {
            String currentPwd = impl.getPassword();
            if (currentPwd != null && currentPwd.contains(" ")) {
                impl.setPassword(currentPwd.replace(" ", ""));
                log.info("Sanitized Gmail app password in JavaMailSender (removed spaces)");
            }
        }
    }

    @Async
    public void sendOrderCompletedEmail(OrderEmailPayload payload) {
        if (payload == null) {
            log.warn("Cannot send completed order email: payload is null");
            return;
        }

        if (mailUsername == null || mailUsername.isBlank() || mailPassword == null || mailPassword.isBlank()) {
            log.warn("Gmail SMTP credentials (MAIL_USERNAME/MAIL_PASSWORD) are not configured. Skipping email for Order #{}", payload.getOrderId());
            return;
        }

        if (payload.getRecipientEmail() == null || payload.getRecipientEmail().isBlank()) {
            log.warn("Recipient email is blank for Order #{}. Skipping email notification.", payload.getOrderId());
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            helper.setFrom(mailUsername.trim(), "Stock Inventory");
            helper.setTo(payload.getRecipientEmail().trim());
            helper.setSubject("Order #" + payload.getOrderId() + " Has Arrived — Official Receipt");

            String htmlBody = buildOrderReceiptHtml(payload);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("Successfully sent order completion receipt email for Order #{} to {}", payload.getOrderId(), payload.getRecipientEmail());
        } catch (Exception ex) {
            // NEVER propagate or re-throw: an email failure must never rollback or fail order completion
            log.error("Failed to send order completed email for Order #{}: {}", payload.getOrderId(), ex.getMessage(), ex);
        }
    }

    @Async
    public void sendOrderCancelledEmail(OrderEmailPayload payload, boolean isRefunded) {
        if (payload == null) {
            log.warn("Cannot send cancelled order email: payload is null");
            return;
        }

        if (mailUsername == null || mailUsername.isBlank() || mailPassword == null || mailPassword.isBlank()) {
            log.warn("Gmail SMTP credentials (MAIL_USERNAME/MAIL_PASSWORD) are not configured. Skipping cancellation email for Order #{}", payload.getOrderId());
            return;
        }

        if (payload.getRecipientEmail() == null || payload.getRecipientEmail().isBlank()) {
            log.warn("Recipient email is blank for Order #{}. Skipping cancellation email notification.", payload.getOrderId());
            return;
        }

        try {
            payload.setRefunded(isRefunded);
            if (payload.getRefundAmount() == null) {
                payload.setRefundAmount(isRefunded
                        ? (payload.getTotalAmount() != null ? payload.getTotalAmount() : BigDecimal.ZERO)
                        : BigDecimal.ZERO);
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            String subject = isRefunded
                    ? "Order #" + payload.getOrderId() + " Cancelled & Refunded"
                    : "Order #" + payload.getOrderId() + " Cancelled (Non-Refundable)";

            helper.setFrom(mailUsername.trim(), "Stock Inventory");
            helper.setTo(payload.getRecipientEmail().trim());
            helper.setSubject(subject);

            String htmlBody = buildOrderCancelledHtml(payload, isRefunded);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("Successfully sent order cancellation email (refunded: {}) for Order #{} to {}", isRefunded, payload.getOrderId(), payload.getRecipientEmail());
        } catch (Exception ex) {
            // NEVER propagate or re-throw: an email failure must never rollback or fail order cancellation
            log.error("Failed to send order cancelled email for Order #{}: {}", payload.getOrderId(), ex.getMessage(), ex);
        }
    }

    @Async
    public void sendOrderCancelledEmail(OrderEmailPayload payload) {
        sendOrderCancelledEmail(payload, payload != null && payload.isRefunded());
    }

    @Async
    public void sendAdminStockAlertEmail(StockAlertEmailPayload payload) {
        if (payload == null) {
            log.warn("Cannot send admin stock alert email: payload is null");
            return;
        }

        if (mailUsername == null || mailUsername.isBlank() || mailPassword == null || mailPassword.isBlank()) {
            log.warn("Gmail SMTP credentials (MAIL_USERNAME/MAIL_PASSWORD) are not configured. Skipping stock alert email for Product #{}", payload.getProductId());
            return;
        }

        String recipient = getAdminEmail();
        if (recipient == null || recipient.isBlank()) {
            log.warn("Admin alert recipient email is blank. Skipping stock alert email for Product #{}.", payload.getProductId());
            return;
        }

        try {
            boolean isOutOfStock = payload.getCurrentStock() <= 0;
            String subject = isOutOfStock
                    ? "[OUT OF STOCK] " + payload.getProductName() + " (ID #" + payload.getProductId() + ") — 0 Units Left"
                    : "[LOW STOCK ALERT] " + payload.getProductName() + " — Only " + payload.getCurrentStock() + " Left";

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            helper.setFrom(mailUsername.trim(), "Stock Inventory");
            helper.setTo(recipient);
            helper.setSubject(subject);

            String htmlBody = buildAdminStockAlertHtml(payload, isOutOfStock);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("Successfully sent admin stock alert email ({}) for Product #{} ('{}') to {}",
                    isOutOfStock ? "OUT OF STOCK" : "LOW STOCK",
                    payload.getProductId(),
                    payload.getProductName(),
                    recipient);
        } catch (Exception ex) {
            // NEVER propagate or re-throw: an email failure must never rollback or fail stock adjustments
            log.error("Failed to send admin stock alert email for Product #{}: {}", payload.getProductId(), ex.getMessage(), ex);
        }
    }

    @Async
    public void sendAdminOrderCancelledAlertEmail(OrderEmailPayload payload, boolean isRefunded, String cancelledBy) {
        if (payload == null) {
            log.warn("Cannot send admin cancelled order alert email: payload is null");
            return;
        }

        if (mailUsername == null || mailUsername.isBlank() || mailPassword == null || mailPassword.isBlank()) {
            log.warn("Gmail SMTP credentials (MAIL_USERNAME/MAIL_PASSWORD) are not configured. Skipping admin cancellation alert for Order #{}", payload.getOrderId());
            return;
        }

        String recipient = getAdminEmail();
        if (recipient == null || recipient.isBlank()) {
            log.warn("Admin alert recipient email is blank. Skipping admin cancellation alert for Order #{}.", payload.getOrderId());
            return;
        }

        try {
            BigDecimal totalAmount = payload.getTotalAmount() != null ? payload.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal refundAmount = payload.getRefundAmount() != null
                    ? payload.getRefundAmount()
                    : (isRefunded ? totalAmount : BigDecimal.ZERO);
            payload.setRefundAmount(refundAmount);
            payload.setRefunded(isRefunded);

            boolean isUnpaid = "UNPAID".equalsIgnoreCase(payload.getPaymentStatus())
                    || "CASH_ON_DELIVERY".equalsIgnoreCase(payload.getPaymentMethod());

            String subject;
            if (isRefunded) {
                subject = String.format("[ADMIN REFUND ALERT] Order #%d Cancelled — $%.2f Refunded",
                        payload.getOrderId(), refundAmount.doubleValue());
            } else if (!isUnpaid) {
                subject = String.format("[ADMIN CANCEL ALERT] Order #%d Cancelled (>2h Non-Refundable — $%.2f Retained)",
                        payload.getOrderId(), totalAmount.doubleValue());
            } else {
                subject = String.format("[ADMIN CANCEL ALERT] Order #%d Cancelled (Unpaid / $0.00 Refund)",
                        payload.getOrderId());
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            helper.setFrom(mailUsername.trim(), "Stock Inventory");
            helper.setTo(recipient);
            helper.setSubject(subject);

            String htmlBody = buildAdminOrderCancelledHtml(payload, isRefunded, cancelledBy, isUnpaid);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("Successfully sent admin order cancelled alert email for Order #{} to {}", payload.getOrderId(), recipient);
        } catch (Exception ex) {
            // NEVER propagate or re-throw: an email failure must never rollback or fail cancellation
            log.error("Failed to send admin order cancelled alert email for Order #{}: {}", payload.getOrderId(), ex.getMessage(), ex);
        }
    }

    private String buildOrderReceiptHtml(OrderEmailPayload payload) {
        StringBuilder itemsHtml = new StringBuilder();
        if (payload.getItems() != null && !payload.getItems().isEmpty()) {
            for (OrderEmailItemDto item : payload.getItems()) {
                BigDecimal unitPrice = item.getPrice() != null ? item.getPrice() : BigDecimal.ZERO;
                BigDecimal lineTotal = item.getLineTotal() != null ? item.getLineTotal() : unitPrice.multiply(BigDecimal.valueOf(item.getQuantity()));

                itemsHtml.append("""
                    <tr style="border-bottom: 1px solid #e5e5e5;">
                        <td style="padding: 12px 8px; font-size: 13px; font-weight: 600; color: #111111;">
                            %s
                        </td>
                        <td style="padding: 12px 8px; font-size: 13px; font-family: monospace; text-align: center; color: #444444;">
                            %d
                        </td>
                        <td style="padding: 12px 8px; font-size: 13px; font-family: monospace; text-align: right; color: #444444;">
                            $%.2f
                        </td>
                        <td style="padding: 12px 8px; font-size: 13px; font-family: monospace; font-weight: 700; text-align: right; color: #111111;">
                            $%.2f
                        </td>
                    </tr>
                """.formatted(
                        escapeHtml(item.getProductName() != null ? item.getProductName() : "Product"),
                        item.getQuantity(),
                        unitPrice.doubleValue(),
                        lineTotal.doubleValue()
                ));
            }
        } else {
            itemsHtml.append("""
                <tr>
                    <td colspan="4" style="padding: 16px 8px; text-align: center; font-size: 13px; color: #888888;">
                        No item details available.
                    </td>
                </tr>
            """);
        }

        String targetUrl = frontendUrl.replaceAll("/+$", "") + "/orders/" + payload.getOrderId();

        BigDecimal subtotal = payload.getSubtotal() != null ? payload.getSubtotal() : BigDecimal.ZERO;
        BigDecimal shipping = payload.getShippingCost() != null ? payload.getShippingCost() : BigDecimal.ZERO;
        BigDecimal tax = payload.getTaxAmount() != null ? payload.getTaxAmount() : BigDecimal.ZERO;
        BigDecimal total = payload.getTotalAmount() != null ? payload.getTotalAmount() : BigDecimal.ZERO;

        String customerName = payload.getCustomerName() != null && !payload.getCustomerName().isBlank()
                ? payload.getCustomerName()
                : (payload.getUsername() != null ? payload.getUsername() : "Valued Customer");

        String shippingAddress = payload.getShippingAddress() != null && !payload.getShippingAddress().isBlank()
                ? payload.getShippingAddress()
                : "Standard Delivery Address";

        String phone = payload.getPhone() != null && !payload.getPhone().isBlank()
                ? payload.getPhone()
                : "Not Provided";

        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Order Receipt</title>
            </head>
            <body style="margin: 0; padding: 24px; background-color: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111111;">
                <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e2e2; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                    
                    <!-- Header -->
                    <div style="background-color: #111111; padding: 28px 32px; color: #ffffff;">
                        <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: #a1a1aa; margin-bottom: 6px;">
                            STOCK INVENTORY &bull; DELIVERY CONFIRMATION
                        </div>
                        <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase;">
                            Order #%d Has Arrived
                        </h1>
                        <p style="margin: 6px 0 0; font-size: 13px; color: #d4d4d8;">
                            Official Delivery Receipt &bull; Status: <span style="display: inline-block; padding: 2px 8px; background: #ffffff; color: #111111; font-weight: 800; font-size: 10px; border-radius: 4px; letter-spacing: 0.08em; text-transform: uppercase;">COMPLETED</span>
                        </p>
                    </div>

                    <!-- Intro greeting -->
                    <div style="padding: 28px 32px 16px; border-bottom: 1px solid #f0f0f0;">
                        <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.5; color: #333333;">
                            Hello <strong>%s</strong>,
                        </p>
                        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #555555;">
                            Great news! Your order <strong>#%d</strong> has been successfully delivered and transitioned to <strong>COMPLETED</strong> status. Below is your official itemized receipt and delivery summary.
                        </p>
                    </div>

                    <!-- Order Metadata Cards -->
                    <div style="padding: 20px 32px; background-color: #fafafa; border-bottom: 1px solid #f0f0f0;">
                        <table style="width: 100%%; border-collapse: collapse; font-size: 12px;">
                            <tr>
                                <td style="width: 50%%; padding: 4px 0; vertical-align: top;">
                                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; font-weight: 700; display: block; margin-bottom: 2px;">Order Date</span>
                                    <span style="font-weight: 600; color: #111111;">%s</span>
                                </td>
                                <td style="width: 50%%; padding: 4px 0; vertical-align: top;">
                                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; font-weight: 700; display: block; margin-bottom: 2px;">Payment Method</span>
                                    <span style="font-weight: 600; color: #111111;">%s</span>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Items Table -->
                    <div style="padding: 24px 32px 12px;">
                        <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #71717a; margin-bottom: 12px;">
                            Itemized Receipt
                        </div>
                        <table style="width: 100%%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="border-bottom: 2px solid #111111;">
                                    <th style="padding: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #111111;">Product</th>
                                    <th style="padding: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #111111; text-align: center;">Qty</th>
                                    <th style="padding: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #111111; text-align: right;">Unit Price</th>
                                    <th style="padding: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #111111; text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                %s
                            </tbody>
                        </table>
                    </div>

                    <!-- Financial Summary -->
                    <div style="padding: 12px 32px 24px;">
                        <div style="margin-left: auto; max-width: 260px;">
                            <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                                <tr>
                                    <td style="padding: 6px 0; color: #666666;">Subtotal:</td>
                                    <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 600; color: #111111;">$%.2f</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #666666;">Shipping:</td>
                                    <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 600; color: #111111;">
                                        %s
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #666666;">Tax (10%%):</td>
                                    <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 600; color: #111111;">$%.2f</td>
                                </tr>
                                <tr style="border-top: 2px solid #111111;">
                                    <td style="padding: 10px 0 4px; font-size: 14px; font-weight: 800; text-transform: uppercase; color: #111111;">Total Paid:</td>
                                    <td style="padding: 10px 0 4px; text-align: right; font-family: monospace; font-size: 16px; font-weight: 900; color: #111111;">$%.2f</td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <!-- Shipping Address & Phone -->
                    <div style="padding: 20px 32px; background-color: #fafafa; border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0;">
                        <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #71717a; margin-bottom: 8px;">
                            Delivery Information
                        </div>
                        <table style="width: 100%%; border-collapse: collapse; font-size: 12px;">
                            <tr>
                                <td style="width: 60%%; padding: 4px 0; vertical-align: top;">
                                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; font-weight: 700; display: block; margin-bottom: 2px;">Delivery Address</span>
                                    <span style="color: #222222; font-weight: 500;">%s</span>
                                </td>
                                <td style="width: 40%%; padding: 4px 0; vertical-align: top;">
                                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; font-weight: 700; display: block; margin-bottom: 2px;">Contact Phone</span>
                                    <span style="color: #222222; font-weight: 500; font-family: monospace;">%s</span>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Call to action button -->
                    <div style="padding: 32px; text-align: center;">
                        <a href="%s" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                            View &amp; Download Official Receipt
                        </a>
                        <p style="margin: 12px 0 0; font-size: 11px; color: #888888;">
                            You can also track status and download a PDF invoice anytime from your account.
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="padding: 20px 32px; background-color: #f8f8f8; border-top: 1px solid #e5e5e5; text-align: center; font-size: 11px; color: #888888; line-height: 1.5;">
                        <p style="margin: 0 0 4px; font-weight: 700; color: #555555;">STOCK INVENTORY MANAGEMENT</p>
                        <p style="margin: 0;">This is an automated notification. Please do not reply directly to this email.</p>
                    </div>

                </div>
            </body>
            </html>
        """.formatted(
                payload.getOrderId(),
                escapeHtml(customerName),
                payload.getOrderId(),
                escapeHtml(payload.getOrderDate() != null ? payload.getOrderDate() : "N/A"),
                escapeHtml(payload.getPaymentMethod() != null ? payload.getPaymentMethod() : "N/A"),
                itemsHtml.toString(),
                subtotal.doubleValue(),
                shipping.compareTo(BigDecimal.ZERO) == 0 ? "FREE" : String.format("$%.2f", shipping.doubleValue()),
                tax.doubleValue(),
                total.doubleValue(),
                escapeHtml(shippingAddress),
                escapeHtml(phone),
                targetUrl
        );
    }

    private String buildOrderCancelledHtml(OrderEmailPayload payload, boolean isRefunded) {
        StringBuilder itemsHtml = new StringBuilder();
        if (payload.getItems() != null && !payload.getItems().isEmpty()) {
            for (OrderEmailItemDto item : payload.getItems()) {
                BigDecimal unitPrice = item.getPrice() != null ? item.getPrice() : BigDecimal.ZERO;
                BigDecimal lineTotal = item.getLineTotal() != null ? item.getLineTotal() : unitPrice.multiply(BigDecimal.valueOf(item.getQuantity()));

                itemsHtml.append("""
                    <tr style="border-bottom: 1px solid #e5e5e5;">
                        <td style="padding: 12px 8px; font-size: 13px; font-weight: 600; color: #111111;">
                            %s
                        </td>
                        <td style="padding: 12px 8px; font-size: 13px; font-family: monospace; text-align: center; color: #444444;">
                            %d
                        </td>
                        <td style="padding: 12px 8px; font-size: 13px; font-family: monospace; text-align: right; color: #444444;">
                            $%.2f
                        </td>
                        <td style="padding: 12px 8px; font-size: 13px; font-family: monospace; font-weight: 700; text-align: right; color: #111111;">
                            $%.2f
                        </td>
                    </tr>
                """.formatted(
                        escapeHtml(item.getProductName() != null ? item.getProductName() : "Product"),
                        item.getQuantity(),
                        unitPrice.doubleValue(),
                        lineTotal.doubleValue()
                ));
            }
        } else {
            itemsHtml.append("""
                <tr>
                    <td colspan="4" style="padding: 16px 8px; text-align: center; font-size: 13px; color: #888888;">
                        No item details available.
                    </td>
                </tr>
            """);
        }

        String targetUrl = frontendUrl.replaceAll("/+$", "") + "/orders/" + payload.getOrderId();

        BigDecimal subtotal = payload.getSubtotal() != null ? payload.getSubtotal() : BigDecimal.ZERO;
        BigDecimal shipping = payload.getShippingCost() != null ? payload.getShippingCost() : BigDecimal.ZERO;
        BigDecimal tax = payload.getTaxAmount() != null ? payload.getTaxAmount() : BigDecimal.ZERO;
        BigDecimal total = payload.getTotalAmount() != null ? payload.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal refundAmount = payload.getRefundAmount() != null
                ? payload.getRefundAmount()
                : (isRefunded ? total : BigDecimal.ZERO);

        String customerName = payload.getCustomerName() != null && !payload.getCustomerName().isBlank()
                ? payload.getCustomerName()
                : (payload.getUsername() != null ? payload.getUsername() : "Valued Customer");

        String shippingAddress = payload.getShippingAddress() != null && !payload.getShippingAddress().isBlank()
                ? payload.getShippingAddress()
                : "Standard Delivery Address";

        String phone = payload.getPhone() != null && !payload.getPhone().isBlank()
                ? payload.getPhone()
                : "Not Provided";

        String headerTitle = isRefunded
                ? "Order #" + payload.getOrderId() + " Cancelled &amp; Refunded"
                : "Order #" + payload.getOrderId() + " Cancelled (Non-Refundable)";

        boolean isUnpaid = "UNPAID".equalsIgnoreCase(payload.getPaymentStatus())
                || "CASH_ON_DELIVERY".equalsIgnoreCase(payload.getPaymentMethod());

        String statusBadge;
        String introNotice;
        String policyStatusText;
        String refundDisplayFormatted;
        String refundLineInSummary;
        BigDecimal retainedAmount;

        if (isUnpaid) {
            statusBadge = "<span style=\"display: inline-block; padding: 2px 8px; background: #27272a; color: #ffffff; border: 1px solid #52525b; font-weight: 800; font-size: 10px; border-radius: 4px; letter-spacing: 0.08em; text-transform: uppercase;\">CANCELLED &bull; UNPAID / COD</span>";
            introNotice = String.format("Your order <strong>#%d</strong> has been cancelled and reserved items restored to stock. Since this order was marked <strong>UNPAID / Cash on Delivery</strong>, no payment was ever charged ($0.00 collected), and no financial refund is necessary.",
                    payload.getOrderId());
            policyStatusText = "Order Cancelled &bull; Unpaid / COD (No Charge Incurred)";
            refundDisplayFormatted = "$0.00 (No Charge Incurred)";
            refundLineInSummary = "$0.00";
            retainedAmount = BigDecimal.ZERO;
        } else if (isRefunded) {
            statusBadge = "<span style=\"display: inline-block; padding: 2px 8px; background: #ffffff; color: #111111; font-weight: 800; font-size: 10px; border-radius: 4px; letter-spacing: 0.08em; text-transform: uppercase;\">CANCELLED &bull; FULL REFUND</span>";
            introNotice = String.format("Your order <strong>#%d</strong> was cancelled within the eligible 2-hour window. As per our cancellation policy, a <strong>full refund of $%.2f</strong> has been approved to your original payment method and reserved stock items have been restored.",
                    payload.getOrderId(), refundAmount.doubleValue());
            policyStatusText = "Within 2-Hour Grace Period &bull; 100% Full Refund Approved";
            refundDisplayFormatted = String.format("$%.2f (100%% Refunded)", refundAmount.doubleValue());
            refundLineInSummary = String.format("-$%.2f", refundAmount.doubleValue());
            retainedAmount = BigDecimal.ZERO;
        } else {
            statusBadge = "<span style=\"display: inline-block; padding: 2px 8px; background: #27272a; color: #ffffff; border: 1px solid #52525b; font-weight: 800; font-size: 10px; border-radius: 4px; letter-spacing: 0.08em; text-transform: uppercase;\">CANCELLED &bull; NON-REFUNDABLE</span>";
            introNotice = String.format("Your order <strong>#%d</strong> was cancelled after the 2-hour cancellation window. As per our store policy, cancellations after 2 hours are <strong>non-refundable</strong>. The refund amount is <strong>$0.00</strong> (full order total of <strong>$%.2f</strong> retained). Reserved items have been restored to inventory.",
                    payload.getOrderId(), total.doubleValue());
            policyStatusText = "Exceeded 2-Hour Window &bull; Non-Refundable per Store Policy";
            refundDisplayFormatted = "$0.00 (Non-Refundable)";
            refundLineInSummary = "$0.00";
            retainedAmount = total;
        }

        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Order Cancellation</title>
            </head>
            <body style="margin: 0; padding: 24px; background-color: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111111;">
                <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e2e2; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                    
                    <!-- Header -->
                    <div style="background-color: #111111; padding: 28px 32px; color: #ffffff;">
                        <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: #a1a1aa; margin-bottom: 6px;">
                            STOCK INVENTORY &bull; CANCELLATION NOTICE
                        </div>
                        <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase;">
                            %s
                        </h1>
                        <p style="margin: 6px 0 0; font-size: 13px; color: #d4d4d8;">
                            Official Cancellation Notice &bull; Status: %s
                        </p>
                    </div>

                    <!-- Intro greeting -->
                    <div style="padding: 28px 32px 16px; border-bottom: 1px solid #f0f0f0;">
                        <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.5; color: #333333;">
                            Hello <strong>%s</strong>,
                        </p>
                        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #555555;">
                            %s
                        </p>
                    </div>

                    <!-- Specific Refund & Policy Box -->
                    <div style="margin: 20px 32px 10px; padding: 18px 24px; background-color: #fafafa; border: 1px solid #e5e5e5; border-radius: 8px;">
                        <table style="width: 100%%; border-collapse: collapse;">
                            <tr>
                                <td style="width: 50%%; padding-bottom: 10px; vertical-align: top;">
                                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; font-weight: 700; display: block; margin-bottom: 3px;">Total Order Amount</span>
                                    <span style="font-size: 18px; font-weight: 800; color: #111111; font-family: monospace;">$%.2f</span>
                                </td>
                                <td style="width: 50%%; padding-bottom: 10px; vertical-align: top;">
                                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; font-weight: 700; display: block; margin-bottom: 3px;">Specific Refund Amount</span>
                                    <span style="font-size: 18px; font-weight: 900; color: #111111; font-family: monospace;">%s</span>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2" style="padding-top: 10px; border-top: 1px dashed #e5e5e5; font-size: 12px; color: #444444;">
                                    <strong>Cancellation Policy:</strong> %s
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Order Metadata Cards -->
                    <div style="padding: 16px 32px; background-color: #ffffff; border-bottom: 1px solid #f0f0f0;">
                        <table style="width: 100%%; border-collapse: collapse; font-size: 12px;">
                            <tr>
                                <td style="width: 33%%; padding: 4px 0; vertical-align: top;">
                                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; font-weight: 700; display: block; margin-bottom: 2px;">Order Date</span>
                                    <span style="font-weight: 600; color: #111111;">%s</span>
                                </td>
                                <td style="width: 33%%; padding: 4px 0; vertical-align: top;">
                                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; font-weight: 700; display: block; margin-bottom: 2px;">Payment Method</span>
                                    <span style="font-weight: 600; color: #111111;">%s</span>
                                </td>
                                <td style="width: 33%%; padding: 4px 0; vertical-align: top;">
                                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; font-weight: 700; display: block; margin-bottom: 2px;">Payment Status</span>
                                    <span style="font-weight: 600; color: #111111;">%s</span>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Items Table -->
                    <div style="padding: 24px 32px 12px;">
                        <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #71717a; margin-bottom: 12px;">
                            Cancelled Items (Restored to Stock)
                        </div>
                        <table style="width: 100%%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="border-bottom: 2px solid #111111;">
                                    <th style="padding: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #111111;">Product</th>
                                    <th style="padding: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #111111; text-align: center;">Qty</th>
                                    <th style="padding: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #111111; text-align: right;">Unit Price</th>
                                    <th style="padding: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #111111; text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                %s
                            </tbody>
                        </table>
                    </div>

                    <!-- Financial Summary -->
                    <div style="padding: 12px 32px 24px;">
                        <div style="margin-left: auto; max-width: 280px;">
                            <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                                <tr>
                                    <td style="padding: 6px 0; color: #666666;">Subtotal:</td>
                                    <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 600; color: #111111;">$%.2f</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #666666;">Shipping:</td>
                                    <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 600; color: #111111;">
                                        %s
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #666666;">Tax (10%%):</td>
                                    <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 600; color: #111111;">$%.2f</td>
                                </tr>
                                <tr style="border-top: 1px solid #e5e5e5;">
                                    <td style="padding: 8px 0 4px; font-weight: 700; color: #111111;">Order Total:</td>
                                    <td style="padding: 8px 0 4px; text-align: right; font-family: monospace; font-weight: 700; color: #111111;">$%.2f</td>
                                </tr>
                                <tr>
                                    <td style="padding: 4px 0; font-weight: 700; color: #111111;">Refund Issued:</td>
                                    <td style="padding: 4px 0; text-align: right; font-family: monospace; font-weight: 800; color: #111111;">%s</td>
                                </tr>
                                <tr style="border-top: 2px solid #111111;">
                                    <td style="padding: 10px 0 4px; font-size: 14px; font-weight: 800; text-transform: uppercase; color: #111111;">Net Retained:</td>
                                    <td style="padding: 10px 0 4px; text-align: right; font-family: monospace; font-size: 16px; font-weight: 900; color: #111111;">$%.2f</td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <!-- Shipping Address & Phone -->
                    <div style="padding: 20px 32px; background-color: #fafafa; border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0;">
                        <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #71717a; margin-bottom: 8px;">
                            Delivery Information (Cancelled)
                        </div>
                        <table style="width: 100%%; border-collapse: collapse; font-size: 12px;">
                            <tr>
                                <td style="width: 60%%; padding: 4px 0; vertical-align: top;">
                                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; font-weight: 700; display: block; margin-bottom: 2px;">Delivery Address</span>
                                    <span style="color: #222222; font-weight: 500;">%s</span>
                                </td>
                                <td style="width: 40%%; padding: 4px 0; vertical-align: top;">
                                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; font-weight: 700; display: block; margin-bottom: 2px;">Contact Phone</span>
                                    <span style="color: #222222; font-weight: 500; font-family: monospace;">%s</span>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Call to action button -->
                    <div style="padding: 32px; text-align: center;">
                        <a href="%s" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                            View Order Details
                        </a>
                        <p style="margin: 12px 0 0; font-size: 11px; color: #888888;">
                            Questions regarding your cancellation or refund? Feel free to contact our customer support.
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="padding: 20px 32px; background-color: #f8f8f8; border-top: 1px solid #e5e5e5; text-align: center; font-size: 11px; color: #888888; line-height: 1.5;">
                        <p style="margin: 0 0 4px; font-weight: 700; color: #555555;">STOCK INVENTORY MANAGEMENT</p>
                        <p style="margin: 0;">This is an automated notification. Please do not reply directly to this email.</p>
                    </div>

                </div>
            </body>
            </html>
        """.formatted(
                headerTitle,
                statusBadge,
                escapeHtml(customerName),
                introNotice,
                total.doubleValue(),
                refundDisplayFormatted,
                policyStatusText,
                escapeHtml(payload.getOrderDate() != null ? payload.getOrderDate() : "N/A"),
                escapeHtml(payload.getPaymentMethod() != null ? payload.getPaymentMethod() : "N/A"),
                escapeHtml(payload.getPaymentStatus() != null ? payload.getPaymentStatus() : "UNPAID"),
                itemsHtml.toString(),
                subtotal.doubleValue(),
                shipping.compareTo(BigDecimal.ZERO) == 0 ? "FREE" : String.format("$%.2f", shipping.doubleValue()),
                tax.doubleValue(),
                total.doubleValue(),
                refundLineInSummary,
                retainedAmount.doubleValue(),
                escapeHtml(shippingAddress),
                escapeHtml(phone),
                targetUrl
        );
    }

    private String buildAdminStockAlertHtml(StockAlertEmailPayload payload, boolean isOutOfStock) {
        String baseFrontend = frontendUrl.replaceAll("/+$", "");
        String poUrl = baseFrontend + "/admin/purchase-orders";
        String productsUrl = baseFrontend + "/admin/products";

        String brand = payload.getBrandName() != null && !payload.getBrandName().isBlank() ? payload.getBrandName() : "N/A";
        String category = payload.getCategoryName() != null && !payload.getCategoryName().isBlank() ? payload.getCategoryName() : "N/A";
        String triggerSource = payload.getTriggerSource() != null && !payload.getTriggerSource().isBlank() ? payload.getTriggerSource() : "Inventory System";

        String headerTag = isOutOfStock ? "STOCK INVENTORY &bull; OUT OF STOCK ALERT" : "STOCK INVENTORY &bull; LOW STOCK WARNING";
        String title = isOutOfStock
                ? String.format("OUT OF STOCK: %s", escapeHtml(payload.getProductName()))
                : String.format("LOW STOCK: %s", escapeHtml(payload.getProductName()));
        String statusBadge = isOutOfStock
                ? "<span style=\"display: inline-block; padding: 2px 8px; background: #ffffff; color: #111111; font-weight: 800; font-size: 10px; border-radius: 4px; letter-spacing: 0.08em; text-transform: uppercase;\">0 UNITS LEFT</span>"
                : String.format("<span style=\"display: inline-block; padding: 2px 8px; background: #27272a; color: #ffffff; border: 1px solid #52525b; font-weight: 800; font-size: 10px; border-radius: 4px; letter-spacing: 0.08em; text-transform: uppercase;\">ONLY %d LEFT</span>", payload.getCurrentStock());

        String noticeText = isOutOfStock
                ? "<strong>CRITICAL ALERT:</strong> Product stock has reached <strong>0 units</strong>. This product is automatically hidden from the storefront catalog until new stock arrives via a Supplier Purchase Order."
                : String.format("<strong>ATTENTION:</strong> Current inventory level (<strong>%d units</strong>) has reached or dropped below the configured reorder threshold of <strong>%d units</strong>. Please replenish inventory soon.",
                        payload.getCurrentStock(), payload.getReorderLevel());

        String ctaButtons = isOutOfStock
                ? """
                    <div style="padding: 24px 32px 32px; text-align: center;">
                        <a href="%s" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 13px 24px; border-radius: 6px; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; margin: 4px 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                            Create Purchase Order
                        </a>
                        <a href="%s" style="display: inline-block; background-color: #ffffff; color: #111111; border: 1px solid #111111; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; margin: 4px 6px;">
                            View in Products
                        </a>
                    </div>
                """.formatted(poUrl, productsUrl)
                : """
                    <div style="padding: 24px 32px 32px; text-align: center;">
                        <a href="%s" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 13px 26px; border-radius: 6px; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                            View in Product Catalog
                        </a>
                    </div>
                """.formatted(productsUrl);

        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>%s</title>
            </head>
            <body style="margin: 0; padding: 24px; background-color: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111111;">
                <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e2e2; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                    
                    <!-- Header -->
                    <div style="background-color: #111111; padding: 28px 32px; color: #ffffff;">
                        <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: #a1a1aa; margin-bottom: 6px;">
                            %s
                        </div>
                        <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase;">
                            %s
                        </h1>
                        <p style="margin: 6px 0 0; font-size: 13px; color: #d4d4d8;">
                            Product ID #%d &bull; Status: %s
                        </p>
                    </div>

                    <!-- Alert Notice Banner -->
                    <div style="padding: 20px 32px; background-color: #fafafa; border-bottom: 1px solid #f0f0f0;">
                        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #333333;">
                            %s
                        </p>
                    </div>

                    <!-- Details Table -->
                    <div style="padding: 24px 32px 12px;">
                        <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #71717a; margin-bottom: 12px;">
                            Inventory Audit Specifications
                        </div>
                        <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                            <tr style="border-bottom: 1px solid #f0f0f0;">
                                <td style="padding: 10px 0; color: #71717a; width: 40%%;">Product Name</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #111111;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f0f0f0;">
                                <td style="padding: 10px 0; color: #71717a;">Product ID</td>
                                <td style="padding: 10px 0; font-family: monospace; font-weight: 600; color: #111111;">#%d</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f0f0f0;">
                                <td style="padding: 10px 0; color: #71717a;">Brand / Category</td>
                                <td style="padding: 10px 0; font-weight: 600; color: #111111;">%s &bull; %s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f0f0f0;">
                                <td style="padding: 10px 0; color: #71717a;">Trigger Source</td>
                                <td style="padding: 10px 0; font-weight: 600; color: #111111;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f0f0f0;">
                                <td style="padding: 10px 0; color: #71717a;">Previous Stock</td>
                                <td style="padding: 10px 0; font-family: monospace; font-weight: 600; color: #111111;">%d units</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f0f0f0;">
                                <td style="padding: 10px 0; color: #71717a;">Current Stock Level</td>
                                <td style="padding: 10px 0; font-family: monospace; font-size: 15px; font-weight: 900; color: %s;">
                                    %d units
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #71717a;">Reorder Threshold</td>
                                <td style="padding: 10px 0; font-family: monospace; font-weight: 600; color: #111111;">%d units</td>
                            </tr>
                        </table>
                    </div>

                    <!-- CTA Buttons -->
                    %s

                    <!-- Footer -->
                    <div style="padding: 20px 32px; background-color: #f8f8f8; border-top: 1px solid #e5e5e5; text-align: center; font-size: 11px; color: #888888; line-height: 1.5;">
                        <p style="margin: 0 0 4px; font-weight: 700; color: #555555;">STOCK INVENTORY ADMIN ALERT SYSTEM</p>
                        <p style="margin: 0;">Automated administrative notification dispatched to %s.</p>
                    </div>

                </div>
            </body>
            </html>
        """.formatted(
                title,
                headerTag,
                title,
                payload.getProductId(),
                statusBadge,
                noticeText,
                escapeHtml(payload.getProductName()),
                payload.getProductId(),
                escapeHtml(brand),
                escapeHtml(category),
                escapeHtml(triggerSource),
                payload.getPreviousStock(),
                isOutOfStock ? "#b91c1c" : "#111111",
                payload.getCurrentStock(),
                payload.getReorderLevel(),
                ctaButtons,
                escapeHtml(getAdminEmail())
        );
    }

    private String buildAdminOrderCancelledHtml(OrderEmailPayload payload, boolean isRefunded, String cancelledBy, boolean isUnpaid) {
        StringBuilder itemsHtml = new StringBuilder();
        if (payload.getItems() != null && !payload.getItems().isEmpty()) {
            for (OrderEmailItemDto item : payload.getItems()) {
                BigDecimal unitPrice = item.getPrice() != null ? item.getPrice() : BigDecimal.ZERO;
                BigDecimal lineTotal = item.getLineTotal() != null ? item.getLineTotal() : unitPrice.multiply(BigDecimal.valueOf(item.getQuantity()));

                itemsHtml.append("""
                    <tr style="border-bottom: 1px solid #e5e5e5;">
                        <td style="padding: 12px 8px; font-size: 13px; font-weight: 600; color: #111111;">
                            %s
                        </td>
                        <td style="padding: 12px 8px; font-size: 13px; font-family: monospace; text-align: center; color: #444444;">
                            +%d (restocked)
                        </td>
                        <td style="padding: 12px 8px; font-size: 13px; font-family: monospace; text-align: right; color: #444444;">
                            $%.2f
                        </td>
                        <td style="padding: 12px 8px; font-size: 13px; font-family: monospace; font-weight: 700; text-align: right; color: #111111;">
                            $%.2f
                        </td>
                    </tr>
                """.formatted(
                        escapeHtml(item.getProductName() != null ? item.getProductName() : "Product"),
                        item.getQuantity(),
                        unitPrice.doubleValue(),
                        lineTotal.doubleValue()
                ));
            }
        } else {
            itemsHtml.append("""
                <tr>
                    <td colspan="4" style="padding: 16px 8px; text-align: center; font-size: 13px; color: #888888;">
                        No item details recorded.
                    </td>
                </tr>
            """);
        }

        String baseFrontend = frontendUrl.replaceAll("/+$", "");
        String ordersUrl = baseFrontend + "/admin/orders";

        BigDecimal subtotal = payload.getSubtotal() != null ? payload.getSubtotal() : BigDecimal.ZERO;
        BigDecimal shipping = payload.getShippingCost() != null ? payload.getShippingCost() : BigDecimal.ZERO;
        BigDecimal tax = payload.getTaxAmount() != null ? payload.getTaxAmount() : BigDecimal.ZERO;
        BigDecimal total = payload.getTotalAmount() != null ? payload.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal refundAmount = payload.getRefundAmount() != null
                ? payload.getRefundAmount()
                : (isRefunded ? total : BigDecimal.ZERO);

        String username = payload.getUsername() != null && !payload.getUsername().isBlank() ? payload.getUsername() : "anonymous";
        String recipientEmail = payload.getRecipientEmail() != null ? payload.getRecipientEmail() : "N/A";
        String phone = payload.getPhone() != null && !payload.getPhone().isBlank() ? payload.getPhone() : "N/A";
        String cancelOrigin = cancelledBy != null && !cancelledBy.isBlank() ? cancelledBy : "Customer Self-Cancel";

        String statusBadge;
        String policyApplied;
        BigDecimal retainedAmount;

        if (isUnpaid) {
            statusBadge = "<span style=\"display: inline-block; padding: 2px 8px; background: #27272a; color: #ffffff; border: 1px solid #52525b; font-weight: 800; font-size: 10px; border-radius: 4px; letter-spacing: 0.08em; text-transform: uppercase;\">UNPAID / COD VOIDED</span>";
            policyApplied = "Unpaid Order Voided";
            retainedAmount = BigDecimal.ZERO;
        } else if (isRefunded) {
            statusBadge = "<span style=\"display: inline-block; padding: 2px 8px; background: #ffffff; color: #111111; font-weight: 800; font-size: 10px; border-radius: 4px; letter-spacing: 0.08em; text-transform: uppercase;\">FULL REFUND ISSUED</span>";
            policyApplied = "<= 2h Full Refund";
            retainedAmount = BigDecimal.ZERO;
        } else {
            statusBadge = "<span style=\"display: inline-block; padding: 2px 8px; background: #27272a; color: #ffffff; border: 1px solid #52525b; font-weight: 800; font-size: 10px; border-radius: 4px; letter-spacing: 0.08em; text-transform: uppercase;\">FUNDS RETAINED (>2H)</span>";
            policyApplied = "> 2h Non-Refundable";
            retainedAmount = total;
        }

        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Admin Order Cancellation Audit</title>
            </head>
            <body style="margin: 0; padding: 24px; background-color: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111111;">
                <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e2e2; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                    
                    <!-- Header -->
                    <div style="background-color: #111111; padding: 28px 32px; color: #ffffff;">
                        <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: #a1a1aa; margin-bottom: 6px;">
                            STOCK INVENTORY &bull; FINANCIAL AUDIT ALERT
                        </div>
                        <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase;">
                            Order #%d Cancelled Audit
                        </h1>
                        <p style="margin: 6px 0 0; font-size: 13px; color: #d4d4d8;">
                            Audit Status: %s &bull; Cancelled By: <strong>%s</strong>
                        </p>
                    </div>

                    <!-- Customer & Order Meta -->
                    <div style="padding: 20px 32px; background-color: #fafafa; border-bottom: 1px solid #f0f0f0;">
                        <table style="width: 100%%; border-collapse: collapse; font-size: 12px;">
                            <tr>
                                <td style="width: 50%%; padding: 6px 0; vertical-align: top;">
                                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; font-weight: 700; display: block; margin-bottom: 2px;">Customer Account</span>
                                    <span style="font-weight: 700; color: #111111;">@%s</span><br>
                                    <span style="color: #555555;">%s &bull; %s</span>
                                </td>
                                <td style="width: 50%%; padding: 6px 0; vertical-align: top;">
                                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; font-weight: 700; display: block; margin-bottom: 2px;">Payment Details</span>
                                    <span style="font-weight: 600; color: #111111;">Method: %s</span><br>
                                    <span style="font-weight: 700; color: #111111;">Status: %s</span>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Financial Audit Box -->
                    <div style="margin: 20px 32px 10px; padding: 18px 24px; background-color: #fafafa; border: 1px solid #e5e5e5; border-radius: 8px;">
                        <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                            <tr>
                                <td style="padding: 6px 0; color: #666666;">Order Total:</td>
                                <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 700; color: #111111;">$%.2f</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #666666;">Refund Issued to Customer:</td>
                                <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 800; color: %s;">
                                    %s
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #666666;">Net Revenue Retained by Store:</td>
                                <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 800; color: #111111;">$%.2f</td>
                            </tr>
                            <tr style="border-top: 1px dashed #e5e5e5;">
                                <td style="padding-top: 10px; font-size: 12px; color: #71717a;">Financial Policy Applied:</td>
                                <td style="padding-top: 10px; text-align: right; font-size: 12px; font-weight: 700; color: #111111;">%s</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Items Table -->
                    <div style="padding: 24px 32px 12px;">
                        <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #71717a; margin-bottom: 12px;">
                            Restocked Items (Inventory Restored)
                        </div>
                        <table style="width: 100%%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="border-bottom: 2px solid #111111;">
                                    <th style="padding: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #111111;">Product</th>
                                    <th style="padding: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #111111; text-align: center;">Restocked Qty</th>
                                    <th style="padding: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #111111; text-align: right;">Unit Price</th>
                                    <th style="padding: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #111111; text-align: right;">Line Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                %s
                            </tbody>
                        </table>
                    </div>

                    <!-- Breakdown table -->
                    <div style="padding: 12px 32px 20px;">
                        <div style="margin-left: auto; max-width: 260px;">
                            <table style="width: 100%%; border-collapse: collapse; font-size: 12px;">
                                <tr>
                                    <td style="padding: 4px 0; color: #71717a;">Subtotal:</td>
                                    <td style="padding: 4px 0; text-align: right; font-family: monospace; color: #111111;">$%.2f</td>
                                </tr>
                                <tr>
                                    <td style="padding: 4px 0; color: #71717a;">Shipping:</td>
                                    <td style="padding: 4px 0; text-align: right; font-family: monospace; color: #111111;">
                                        %s
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 4px 0; color: #71717a;">Tax:</td>
                                    <td style="padding: 4px 0; text-align: right; font-family: monospace; color: #111111;">$%.2f</td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <!-- Call to action button -->
                    <div style="padding: 24px 32px 32px; text-align: center;">
                        <a href="%s" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 13px 26px; border-radius: 6px; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                            Review in Admin Orders
                        </a>
                    </div>

                    <!-- Footer -->
                    <div style="padding: 20px 32px; background-color: #f8f8f8; border-top: 1px solid #e5e5e5; text-align: center; font-size: 11px; color: #888888; line-height: 1.5;">
                        <p style="margin: 0 0 4px; font-weight: 700; color: #555555;">STOCK INVENTORY AUDIT SYSTEM</p>
                        <p style="margin: 0;">Dispatched to store administrator at %s.</p>
                    </div>

                </div>
            </body>
            </html>
        """.formatted(
                payload.getOrderId(),
                statusBadge,
                escapeHtml(cancelOrigin),
                escapeHtml(username),
                escapeHtml(recipientEmail),
                escapeHtml(phone),
                escapeHtml(payload.getPaymentMethod() != null ? payload.getPaymentMethod() : "N/A"),
                escapeHtml(payload.getPaymentStatus() != null ? payload.getPaymentStatus() : "UNPAID"),
                total.doubleValue(),
                isRefunded ? "#b91c1c" : "#111111",
                isRefunded ? String.format("-$%.2f", refundAmount.doubleValue()) : "$0.00",
                retainedAmount.doubleValue(),
                policyApplied,
                itemsHtml.toString(),
                subtotal.doubleValue(),
                shipping.compareTo(BigDecimal.ZERO) == 0 ? "FREE" : String.format("$%.2f", shipping.doubleValue()),
                tax.doubleValue(),
                ordersUrl,
                escapeHtml(getAdminEmail())
        );
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
