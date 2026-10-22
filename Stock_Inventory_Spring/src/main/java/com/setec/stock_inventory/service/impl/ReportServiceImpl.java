package com.setec.stock_inventory.service.impl;

import com.setec.stock_inventory.dto.Response.report.*;
import com.setec.stock_inventory.entity.Order;
import com.setec.stock_inventory.entity.OrderItem;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.WholesaleOrder;
import com.setec.stock_inventory.entity.WholesaleOrderItem;
import com.setec.stock_inventory.repo.OrderRepository;
import com.setec.stock_inventory.repo.WholesaleOrderRepository;
import com.setec.stock_inventory.service.ReportService;
import com.setec.stock_inventory.service.StockBatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.IsoFields;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private final OrderRepository orderRepository;
    private final WholesaleOrderRepository wholesaleOrderRepository;
    private final StockBatchService stockBatchService;

    private static class FlattenedSaleItem {
        String uniqueOrderId;
        LocalDateTime orderDate;
        Product product;
        int quantity;
        BigDecimal revenue;
        BigDecimal cogs;
        boolean missingCost;

        boolean matchesCategory(Long filterCategoryId) {
            if (filterCategoryId == null) return true;
            return product != null && product.getCategory() != null && filterCategoryId.equals(product.getCategory().getId());
        }

        boolean matchesBrand(Long filterBrandId, boolean isUnbrandedOnly) {
            if (isUnbrandedOnly) {
                return product != null && product.getBrand() == null;
            }
            if (filterBrandId != null) {
                return product != null && product.getBrand() != null && filterBrandId.equals(product.getBrand().getId());
            }
            return true;
        }
    }

    private static class OrderFinancialMetadata {
        String channel;
        BigDecimal totalAmount;
        BigDecimal taxAmount;
        BigDecimal shippingCost;
    }

    @Override
    @Transactional(readOnly = true)
    public ReportSummaryResponseDto getReportSummary(
            LocalDate startDate,
            LocalDate endDate,
            String channel,
            Long categoryId,
            Long brandId,
            Boolean unbrandedOnly
    ) {
        String targetChannel = channel != null ? channel.trim().toUpperCase() : "ALL";
        boolean includeRetail = "ALL".equals(targetChannel) || "RETAIL".equals(targetChannel);
        boolean includeWholesale = "ALL".equals(targetChannel) || "WHOLESALE".equals(targetChannel);
        boolean isUnbrandedOnly = Boolean.TRUE.equals(unbrandedOnly) || (brandId != null && brandId == -1L);

        Map<Long, BigDecimal> activeFifoCosts = stockBatchService.getAllActiveFifoUnitCosts();

        List<FlattenedSaleItem> allScopeItems = new ArrayList<>();
        Map<String, OrderFinancialMetadata> allOrderMeta = new LinkedHashMap<>();

        // 1. Process Completed Retail Orders within Date Range
        if (includeRetail) {
            List<Order> completedOrders = orderRepository.findCompletedWithDetails();
            for (Order order : completedOrders) {
                LocalDateTime orderDate = order.getOrderDate() != null
                        ? order.getOrderDate()
                        : (order.getUpdateDate() != null ? order.getUpdateDate() : LocalDateTime.now());

                if (startDate != null && orderDate.toLocalDate().isBefore(startDate)) {
                    continue;
                }
                if (endDate != null && orderDate.toLocalDate().isAfter(endDate)) {
                    continue;
                }

                String uniqueOrderId = "R-" + order.getId();
                OrderFinancialMetadata meta = new OrderFinancialMetadata();
                meta.channel = "RETAIL";
                meta.totalAmount = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
                meta.taxAmount = order.getTaxAmount() != null ? order.getTaxAmount() : BigDecimal.ZERO;
                meta.shippingCost = order.getShippingCost() != null ? order.getShippingCost() : BigDecimal.ZERO;
                allOrderMeta.put(uniqueOrderId, meta);

                if (order.getOrderItems() != null) {
                    for (OrderItem item : order.getOrderItems()) {
                        Product p = item.getProduct();
                        if (p == null) continue;

                        int qty = item.getQuantity();
                        BigDecimal unitPrice = BigDecimal.valueOf(item.getPrice()).setScale(2, RoundingMode.HALF_UP);

                        BigDecimal cogs;
                        BigDecimal unitCost;
                        if (item.getTotalCogs() != null) {
                            cogs = item.getTotalCogs().setScale(2, RoundingMode.HALF_UP);
                            unitCost = item.getUnitCost() != null
                                    ? item.getUnitCost().setScale(2, RoundingMode.HALF_UP)
                                    : (qty > 0 ? cogs.divide(BigDecimal.valueOf(qty), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
                        } else {
                            BigDecimal activeCost = activeFifoCosts.get(p.getId());
                            if (activeCost == null) {
                                activeCost = p.getCostPrice() != null ? BigDecimal.valueOf(p.getCostPrice()) : BigDecimal.ZERO;
                            }
                            unitCost = activeCost.setScale(2, RoundingMode.HALF_UP);
                            cogs = unitCost.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
                        }

                        BigDecimal rev = unitPrice.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
                        boolean missingCost = (item.getTotalCogs() == null || item.getTotalCogs().compareTo(BigDecimal.ZERO) <= 0)
                                && (item.getUnitCost() == null || item.getUnitCost().compareTo(BigDecimal.ZERO) <= 0);

                        FlattenedSaleItem sale = new FlattenedSaleItem();
                        sale.uniqueOrderId = uniqueOrderId;
                        sale.orderDate = orderDate;
                        sale.product = p;
                        sale.quantity = qty;
                        sale.revenue = rev;
                        sale.cogs = cogs;
                        sale.missingCost = missingCost;
                        allScopeItems.add(sale);
                    }
                }
            }
        }

        // 2. Process Completed Wholesale Orders within Date Range
        if (includeWholesale) {
            List<WholesaleOrder> completedWholesale = wholesaleOrderRepository.findCompletedWithDetails();
            for (WholesaleOrder w : completedWholesale) {
                LocalDateTime orderDate = w.getOrderDate() != null
                        ? w.getOrderDate()
                        : (w.getUpdateDate() != null ? w.getUpdateDate() : LocalDateTime.now());

                if (startDate != null && orderDate.toLocalDate().isBefore(startDate)) {
                    continue;
                }
                if (endDate != null && orderDate.toLocalDate().isAfter(endDate)) {
                    continue;
                }

                String uniqueOrderId = "W-" + w.getId();
                OrderFinancialMetadata meta = new OrderFinancialMetadata();
                meta.channel = "WHOLESALE";
                meta.totalAmount = BigDecimal.valueOf(w.getTotalAmount()).setScale(2, RoundingMode.HALF_UP);
                meta.taxAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                meta.shippingCost = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                allOrderMeta.put(uniqueOrderId, meta);

                if (w.getItems() != null) {
                    for (WholesaleOrderItem item : w.getItems()) {
                        Product p = item.getProduct();
                        if (p == null) continue;

                        int qty = item.getQuantity();
                        BigDecimal unitPrice = BigDecimal.valueOf(item.getWholesalePrice()).setScale(2, RoundingMode.HALF_UP);

                        BigDecimal cogs;
                        BigDecimal unitCost;
                        if (item.getTotalCogs() != null) {
                            cogs = item.getTotalCogs().setScale(2, RoundingMode.HALF_UP);
                            unitCost = item.getUnitCost() != null
                                    ? item.getUnitCost().setScale(2, RoundingMode.HALF_UP)
                                    : (qty > 0 ? cogs.divide(BigDecimal.valueOf(qty), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
                        } else {
                            BigDecimal activeCost = activeFifoCosts.get(p.getId());
                            if (activeCost == null) {
                                activeCost = p.getCostPrice() != null ? BigDecimal.valueOf(p.getCostPrice()) : BigDecimal.ZERO;
                            }
                            unitCost = activeCost.setScale(2, RoundingMode.HALF_UP);
                            cogs = unitCost.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
                        }

                        BigDecimal rev = unitPrice.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
                        boolean missingCost = (item.getTotalCogs() == null || item.getTotalCogs().compareTo(BigDecimal.ZERO) <= 0)
                                && (item.getUnitCost() == null || item.getUnitCost().compareTo(BigDecimal.ZERO) <= 0);

                        FlattenedSaleItem sale = new FlattenedSaleItem();
                        sale.uniqueOrderId = uniqueOrderId;
                        sale.orderDate = orderDate;
                        sale.product = p;
                        sale.quantity = qty;
                        sale.revenue = rev;
                        sale.cogs = cogs;
                        sale.missingCost = missingCost;
                        allScopeItems.add(sale);
                    }
                }
            }
        }

        // 3. Filter items for Primary KPIs, Sales Over Time, and Best Sellers
        List<FlattenedSaleItem> matchingItems = allScopeItems.stream()
                .filter(it -> it.matchesCategory(categoryId) && it.matchesBrand(brandId, isUnbrandedOnly))
                .toList();

        Set<String> matchingOrderIds = new HashSet<>();
        for (FlattenedSaleItem item : matchingItems) {
            matchingOrderIds.add(item.uniqueOrderId);
        }

        Map<String, OrderFinancialMetadata> matchingOrderMeta = new LinkedHashMap<>();
        for (String orderId : matchingOrderIds) {
            OrderFinancialMetadata meta = allOrderMeta.get(orderId);
            if (meta != null) {
                matchingOrderMeta.put(orderId, meta);
            }
        }

        int totalOrders = matchingOrderMeta.size();
        int retailOrdersCount = 0;
        int wholesaleOrdersCount = 0;
        for (OrderFinancialMetadata meta : matchingOrderMeta.values()) {
            if ("RETAIL".equals(meta.channel)) retailOrdersCount++;
            else if ("WHOLESALE".equals(meta.channel)) wholesaleOrdersCount++;
        }

        int totalUnitsSold = 0;
        BigDecimal netProductRevenue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalCogs = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        for (FlattenedSaleItem item : matchingItems) {
            totalUnitsSold += item.quantity;
            netProductRevenue = netProductRevenue.add(item.revenue);
            totalCogs = totalCogs.add(item.cogs);
        }

        BigDecimal grossProfit = netProductRevenue.subtract(totalCogs).setScale(2, RoundingMode.HALF_UP);
        BigDecimal profitMarginPercent = netProductRevenue.compareTo(BigDecimal.ZERO) > 0
                ? grossProfit.multiply(BigDecimal.valueOf(100)).divide(netProductRevenue, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        long missingCostCount = matchingItems.stream().filter(it -> it.missingCost).count();

        BigDecimal grossRevenue;
        BigDecimal totalTaxCollected;
        BigDecimal totalShippingCollected;

        boolean isItemLevelFilterActive = (categoryId != null || brandId != null || isUnbrandedOnly);

        if (!isItemLevelFilterActive) {
            BigDecimal totalOrderAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            BigDecimal totalTax = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            BigDecimal totalShip = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

            for (OrderFinancialMetadata meta : matchingOrderMeta.values()) {
                totalOrderAmount = totalOrderAmount.add(meta.totalAmount);
                totalTax = totalTax.add(meta.taxAmount);
                totalShip = totalShip.add(meta.shippingCost);
            }
            grossRevenue = totalOrderAmount;
            totalTaxCollected = totalTax;
            totalShippingCollected = totalShip;
        } else {
            grossRevenue = netProductRevenue;
            totalTaxCollected = null;
            totalShippingCollected = null;
        }

        ReportKpiDto kpis = ReportKpiDto.builder()
                .totalOrders(totalOrders)
                .retailOrdersCount(retailOrdersCount)
                .wholesaleOrdersCount(wholesaleOrdersCount)
                .totalUnitsSold(totalUnitsSold)
                .grossRevenue(grossRevenue)
                .netProductRevenue(netProductRevenue)
                .totalTaxCollected(totalTaxCollected)
                .totalShippingCollected(totalShippingCollected)
                .totalCogs(totalCogs)
                .grossProfit(grossProfit)
                .profitMarginPercent(profitMarginPercent)
                .itemsMissingCost(missingCostCount)
                .build();

        // 4. Compute Sales Over Time (Daily, Weekly, Monthly)
        SalesOverTimeDto salesOverTime = buildSalesOverTime(matchingItems);

        // 5. Compute Best Sellers & Product Profit Table
        List<ProductPerformanceDto> bestSellers = buildBestSellers(matchingItems, activeFifoCosts);

        // 6. Compute Revenue by Category (Independent of categoryId filter!)
        List<FlattenedSaleItem> categoryScopeItems = allScopeItems.stream()
                .filter(it -> it.matchesBrand(brandId, isUnbrandedOnly))
                .toList();
        BigDecimal totalCategoryRevenue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        for (FlattenedSaleItem it : categoryScopeItems) {
            totalCategoryRevenue = totalCategoryRevenue.add(it.revenue);
        }
        List<CategoryRevenueDto> revenueByCategory = buildCategoryRevenue(categoryScopeItems, totalCategoryRevenue);

        // 7. Compute Revenue by Brand (Independent of brandId/unbrandedOnly filter!)
        List<FlattenedSaleItem> brandScopeItems = allScopeItems.stream()
                .filter(it -> it.matchesCategory(categoryId))
                .toList();
        BigDecimal totalBrandRevenue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        for (FlattenedSaleItem it : brandScopeItems) {
            totalBrandRevenue = totalBrandRevenue.add(it.revenue);
        }
        List<BrandRevenueDto> revenueByBrand = buildBrandRevenue(brandScopeItems, totalBrandRevenue);

        return ReportSummaryResponseDto.builder()
                .kpis(kpis)
                .salesOverTime(salesOverTime)
                .bestSellers(bestSellers)
                .revenueByCategory(revenueByCategory)
                .revenueByBrand(revenueByBrand)
                .build();
    }

    private SalesOverTimeDto buildSalesOverTime(List<FlattenedSaleItem> items) {
        Map<String, PeriodAccumulator> dailyMap = new TreeMap<>();
        Map<String, PeriodAccumulator> weeklyMap = new TreeMap<>();
        Map<String, PeriodAccumulator> monthlyMap = new TreeMap<>();

        DateTimeFormatter dailyFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter monthlyFmt = DateTimeFormatter.ofPattern("yyyy-MM");

        for (FlattenedSaleItem item : items) {
            String dailyKey = item.orderDate.format(dailyFmt);

            int isoYear = item.orderDate.get(IsoFields.WEEK_BASED_YEAR);
            int isoWeek = item.orderDate.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
            String weeklyKey = String.format("%04d-W%02d", isoYear, isoWeek);

            String monthlyKey = item.orderDate.format(monthlyFmt);

            dailyMap.computeIfAbsent(dailyKey, k -> new PeriodAccumulator(k)).accumulate(item);
            weeklyMap.computeIfAbsent(weeklyKey, k -> new PeriodAccumulator(k)).accumulate(item);
            monthlyMap.computeIfAbsent(monthlyKey, k -> new PeriodAccumulator(k)).accumulate(item);
        }

        List<SalesPeriodDto> daily = new ArrayList<>();
        for (PeriodAccumulator acc : dailyMap.values()) {
            daily.add(acc.toDto());
        }

        List<SalesPeriodDto> weekly = new ArrayList<>();
        for (PeriodAccumulator acc : weeklyMap.values()) {
            weekly.add(acc.toDto());
        }

        List<SalesPeriodDto> monthly = new ArrayList<>();
        for (PeriodAccumulator acc : monthlyMap.values()) {
            monthly.add(acc.toDto());
        }

        return SalesOverTimeDto.builder()
                .daily(daily)
                .weekly(weekly)
                .monthly(monthly)
                .build();
    }

    private static class PeriodAccumulator {
        final String label;
        final Set<String> orderIds = new HashSet<>();
        int unitsSold = 0;
        BigDecimal revenue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal cogs = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        PeriodAccumulator(String label) {
            this.label = label;
        }

        void accumulate(FlattenedSaleItem item) {
            orderIds.add(item.uniqueOrderId);
            unitsSold += item.quantity;
            revenue = revenue.add(item.revenue);
            cogs = cogs.add(item.cogs);
        }

        SalesPeriodDto toDto() {
            BigDecimal profit = revenue.subtract(cogs).setScale(2, RoundingMode.HALF_UP);
            return SalesPeriodDto.builder()
                    .periodLabel(label)
                    .ordersCount(orderIds.size())
                    .unitsSold(unitsSold)
                    .revenue(revenue)
                    .cogs(cogs)
                    .profit(profit)
                    .build();
        }
    }

    private List<ProductPerformanceDto> buildBestSellers(
            List<FlattenedSaleItem> items,
            Map<Long, BigDecimal> activeFifoCosts
    ) {
        Map<Long, ProductAccumulator> map = new LinkedHashMap<>();

        for (FlattenedSaleItem item : items) {
            Product p = item.product;
            map.computeIfAbsent(p.getId(), k -> new ProductAccumulator(p, activeFifoCosts)).accumulate(item);
        }

        List<ProductPerformanceDto> list = new ArrayList<>();
        for (ProductAccumulator acc : map.values()) {
            list.add(acc.toDto());
        }

        list.sort((a, b) -> {
            int cmp = Integer.compare(b.getUnitsSold(), a.getUnitsSold());
            if (cmp != 0) return cmp;
            return b.getRevenue().compareTo(a.getRevenue());
        });
        return list;
    }

    private static class ProductAccumulator {
        final Product product;
        final BigDecimal currentUnitCost;
        int unitsSold = 0;
        BigDecimal revenue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal cogs = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        ProductAccumulator(Product product, Map<Long, BigDecimal> activeFifoCosts) {
            this.product = product;
            BigDecimal cost = activeFifoCosts.get(product.getId());
            if (cost == null) {
                cost = product.getCostPrice() != null ? BigDecimal.valueOf(product.getCostPrice()) : BigDecimal.ZERO;
            }
            this.currentUnitCost = cost.setScale(2, RoundingMode.HALF_UP);
        }

        void accumulate(FlattenedSaleItem item) {
            unitsSold += item.quantity;
            revenue = revenue.add(item.revenue);
            cogs = cogs.add(item.cogs);
        }

        ProductPerformanceDto toDto() {
            BigDecimal profit = revenue.subtract(cogs).setScale(2, RoundingMode.HALF_UP);
            BigDecimal avgPrice = unitsSold > 0
                    ? revenue.divide(BigDecimal.valueOf(unitsSold), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            BigDecimal marginPercent = revenue.compareTo(BigDecimal.ZERO) > 0
                    ? profit.multiply(BigDecimal.valueOf(100)).divide(revenue, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

            Long catId = product.getCategory() != null ? product.getCategory().getId() : null;
            String catName = product.getCategory() != null ? product.getCategory().getName() : "Uncategorized";
            Long brId = product.getBrand() != null ? product.getBrand().getId() : null;
            String brName = product.getBrand() != null ? product.getBrand().getName() : "Unbranded";

            return ProductPerformanceDto.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .categoryId(catId)
                    .categoryName(catName)
                    .brandId(brId)
                    .brandName(brName)
                    .unitsSold(unitsSold)
                    .avgSellingPrice(avgPrice)
                    .unitCost(currentUnitCost)
                    .revenue(revenue)
                    .cogs(cogs)
                    .profit(profit)
                    .marginPercent(marginPercent)
                    .build();
        }
    }

    private List<CategoryRevenueDto> buildCategoryRevenue(List<FlattenedSaleItem> items, BigDecimal totalNetRevenue) {
        Map<Long, CategoryAccumulator> map = new LinkedHashMap<>();

        for (FlattenedSaleItem item : items) {
            Long catId = item.product.getCategory() != null ? item.product.getCategory().getId() : null;
            String catName = item.product.getCategory() != null ? item.product.getCategory().getName() : "Uncategorized";
            map.computeIfAbsent(catId != null ? catId : -1L, k -> new CategoryAccumulator(catId, catName)).accumulate(item);
        }

        List<CategoryRevenueDto> list = new ArrayList<>();
        for (CategoryAccumulator acc : map.values()) {
            list.add(acc.toDto(totalNetRevenue));
        }
        list.sort((a, b) -> b.getRevenue().compareTo(a.getRevenue()));
        return list;
    }

    private static class CategoryAccumulator {
        final Long id;
        final String name;
        int unitsSold = 0;
        BigDecimal revenue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal cogs = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        CategoryAccumulator(Long id, String name) {
            this.id = id;
            this.name = name;
        }

        void accumulate(FlattenedSaleItem item) {
            unitsSold += item.quantity;
            revenue = revenue.add(item.revenue);
            cogs = cogs.add(item.cogs);
        }

        CategoryRevenueDto toDto(BigDecimal totalNetRevenue) {
            BigDecimal profit = revenue.subtract(cogs).setScale(2, RoundingMode.HALF_UP);
            BigDecimal share = totalNetRevenue.compareTo(BigDecimal.ZERO) > 0
                    ? revenue.multiply(BigDecimal.valueOf(100)).divide(totalNetRevenue, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

            return CategoryRevenueDto.builder()
                    .id(id)
                    .name(name)
                    .unitsSold(unitsSold)
                    .revenue(revenue)
                    .cogs(cogs)
                    .profit(profit)
                    .sharePercent(share)
                    .build();
        }
    }

    private List<BrandRevenueDto> buildBrandRevenue(List<FlattenedSaleItem> items, BigDecimal totalNetRevenue) {
        Map<Long, BrandAccumulator> map = new LinkedHashMap<>();

        for (FlattenedSaleItem item : items) {
            Long brId = item.product.getBrand() != null ? item.product.getBrand().getId() : null;
            String brName = item.product.getBrand() != null ? item.product.getBrand().getName() : "Unbranded";
            map.computeIfAbsent(brId != null ? brId : -1L, k -> new BrandAccumulator(brId, brName)).accumulate(item);
        }

        List<BrandRevenueDto> list = new ArrayList<>();
        for (BrandAccumulator acc : map.values()) {
            list.add(acc.toDto(totalNetRevenue));
        }
        list.sort((a, b) -> b.getRevenue().compareTo(a.getRevenue()));
        return list;
    }

    private static class BrandAccumulator {
        final Long id;
        final String name;
        int unitsSold = 0;
        BigDecimal revenue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal cogs = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        BrandAccumulator(Long id, String name) {
            this.id = id;
            this.name = name;
        }

        void accumulate(FlattenedSaleItem item) {
            unitsSold += item.quantity;
            revenue = revenue.add(item.revenue);
            cogs = cogs.add(item.cogs);
        }

        BrandRevenueDto toDto(BigDecimal totalNetRevenue) {
            BigDecimal profit = revenue.subtract(cogs).setScale(2, RoundingMode.HALF_UP);
            BigDecimal share = totalNetRevenue.compareTo(BigDecimal.ZERO) > 0
                    ? revenue.multiply(BigDecimal.valueOf(100)).divide(totalNetRevenue, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

            return BrandRevenueDto.builder()
                    .id(id)
                    .name(name)
                    .unitsSold(unitsSold)
                    .revenue(revenue)
                    .cogs(cogs)
                    .profit(profit)
                    .sharePercent(share)
                    .build();
        }
    }
}
