package com.ambatucode.dikichi.order.service;

import com.ambatucode.dikichi.order.config.CallerContext;
import com.ambatucode.dikichi.order.dto.catalog.CatalogValidateResponse.CatalogItem;
import com.ambatucode.dikichi.order.dto.common.ErrorDetail;
import com.ambatucode.dikichi.order.dto.common.OrderItemRequest;
import com.ambatucode.dikichi.order.dto.common.OrderStatusPatchRequest;
import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.entity.OrderItem;
import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.entity.Role;
import com.ambatucode.dikichi.order.exception.ApiException;
import com.ambatucode.dikichi.order.repository.OrderRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class OrderService {

    private static final String ORDER_NUMBER_PREFIX = "ORD-";

    private final OrderRepository orders;
    private final CatalogClient catalogClient;
    private final TransactionTemplate transactionTemplate;
    private final CallerContext caller;

    public OrderService(OrderRepository orders, CatalogClient catalogClient,
                        TransactionTemplate transactionTemplate, CallerContext caller) {
        this.orders = orders;
        this.catalogClient = catalogClient;
        this.transactionTemplate = transactionTemplate;
        this.caller = caller;
    }

    public Order create(CreateOrderCommand command) {
        rejectDuplicateItems(command.items());
        List<CatalogItem> catalogItems =
                catalogClient.validate(command.outletId(), command.tableCode(), command.items());
        // WHY: the catalog call stays outside the transaction so a slow catalog never holds a database connection
        return transactionTemplate.execute(status -> persist(command, catalogItems));
    }

    @Transactional(readOnly = true)
    public List<Order> list(String outletIdParam, OrderStatus statusParam) {
        caller.requireRole(Role.CASHIER, Role.KITCHEN);
        String outletId = outletIdParam == null ? caller.outletId() : outletIdParam;
        caller.requireSameOutlet(outletId);

        Set<OrderStatus> allowed = OrderStateMachine.queueFor(caller.role());
        Set<OrderStatus> statuses = allowed;
        if (statusParam != null) {
            if (!allowed.contains(statusParam)) {
                throw ApiException.forbidden("Role cannot list orders with this status");
            }
            statuses = Set.of(statusParam);
        }
        return orders.findByOutletIdAndStatusInOrderByCreatedAtAsc(outletId, statuses);
    }

    @Transactional(readOnly = true)
    public Order get(UUID orderId) {
        caller.requireRole(Role.CASHIER, Role.KITCHEN);
        Order order = orders.findWithItemsById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));
        caller.requireSameOutlet(order.getOutletId());
        return order;
    }

    public Order replace(UUID orderId, CreateOrderCommand command) {
        caller.requireRole(Role.CASHIER);
        Order current = orders.findWithItemsById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));
        requireOwnEditableOrder(current, command.outletId());
        rejectDuplicateItems(command.items());
        List<CatalogItem> catalogItems =
                catalogClient.validate(command.outletId(), command.tableCode(), command.items());
        return transactionTemplate.execute(status -> applyReplacement(orderId, command, catalogItems));
    }

    @Transactional
    public Order updateStatus(UUID orderId, OrderStatusPatchRequest request) {
        caller.requireRole(Role.CASHIER, Role.KITCHEN);
        OrderStatus target = parseTargetStatus(request);
        Order order = orders.findWithItemsById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));
        caller.requireSameOutlet(order.getOutletId());
        if (OrderStateMachine.isNeverPatchable(target)) {
            throw ApiException.conflict("INVALID_STATUS_TRANSITION", "Status cannot be set through this endpoint");
        }
        if (!OrderStateMachine.roleOwns(caller.role(), target)) {
            throw ApiException.forbidden("Role is not allowed to set this status");
        }
        if (!OrderStateMachine.allows(order.getStatus(), target)) {
            throw ApiException.conflict("INVALID_STATUS_TRANSITION",
                    "Transition from " + order.getStatus() + " to " + target + " is not allowed");
        }
        order.changeStatus(target);
        return orders.saveAndFlush(order);
    }

    private Order applyReplacement(UUID orderId, CreateOrderCommand command, List<CatalogItem> catalogItems) {
        Order order = orders.findWithItemsById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));
        requireEditable(order);
        order.removeAllItems();
        // WHY: Hibernate runs inserts before orphan deletes, which would break ux_order_item_order_menu
        orders.flush();
        Map<UUID, CatalogItem> catalogById = catalogItems.stream()
                .collect(Collectors.toMap(CatalogItem::menuItemId, Function.identity()));
        List<OrderItem> newItems = command.items().stream()
                .map(line -> {
                    CatalogItem item = catalogById.get(line.menuItemId());
                    return new OrderItem(item.menuItemId(), item.name(), item.unitPrice(), line.quantity());
                })
                .toList();
        order.replaceContents(command.tableCode(), command.customerName(), newItems);
        return orders.saveAndFlush(order);
    }

    private void requireOwnEditableOrder(Order order, String requestedOutletId) {
        caller.requireSameOutlet(order.getOutletId());
        if (!order.getOutletId().equals(requestedOutletId)) {
            throw ApiException.badRequest("OUTLET_IMMUTABLE", "Order outlet cannot be changed",
                    List.of(new ErrorDetail("outletId", "Order outlet cannot be changed")));
        }
        requireEditable(order);
    }

    private static void requireEditable(Order order) {
        if (!OrderStateMachine.isEditable(order.getStatus())) {
            throw ApiException.conflict("ORDER_NOT_EDITABLE", "Only PENDING orders can be edited");
        }
    }

    private static OrderStatus parseTargetStatus(OrderStatusPatchRequest request) {
        String raw = request == null ? null : request.status();
        if (raw == null || raw.isBlank()) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Request validation failed",
                    List.of(new ErrorDetail("status", "must not be blank")));
        }
        try {
            return OrderStatus.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Request validation failed",
                    List.of(new ErrorDetail("status", "must be a valid order status")));
        }
    }

    private Order persist(CreateOrderCommand command, List<CatalogItem> catalogItems) {
        Map<UUID, CatalogItem> catalogById = catalogItems.stream()
                .collect(Collectors.toMap(CatalogItem::menuItemId, Function.identity()));

        Order order = new Order(formatOrderNumber(orders.nextOrderSequence()), command.outletId(),
                command.tableCode(), command.customerName());
        for (OrderItemRequest line : command.items()) {
            CatalogItem catalogItem = catalogById.get(line.menuItemId());
            order.addItem(new OrderItem(catalogItem.menuItemId(), catalogItem.name(), catalogItem.unitPrice(),
                    line.quantity()));
        }
        return orders.save(order);
    }

    private static void rejectDuplicateItems(List<OrderItemRequest> items) {
        Set<UUID> seen = new HashSet<>();
        List<ErrorDetail> duplicates = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            if (!seen.add(items.get(i).menuItemId())) {
                duplicates.add(new ErrorDetail("items[" + i + "].menuItemId", "Duplicate menu item"));
            }
        }
        if (!duplicates.isEmpty()) {
            throw ApiException.badRequest("DUPLICATE_MENU_ITEM", "The same menu item appears on two lines",
                    duplicates);
        }
    }

    private static String formatOrderNumber(long sequence) {
        return ORDER_NUMBER_PREFIX + String.format("%04d", sequence);
    }
}
