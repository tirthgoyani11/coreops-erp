# 14: Sales Module

## 14.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 4 |
| **Phase** | 5 |
| **Models** | SalesOrder |
| **Key Feature** | Quote → Order → Invoice → Payment lifecycle |

---

## 14.2 Screen: Sales Orders List
**URL**: `/sales`  |  **Access**: Manager+, Staff

### Quick Stats
| Total Orders | Draft | Processing | Shipped | Delivered | Revenue This Month |

### Table Columns
- Order Number, Customer, Items Count, Total Amount, Status, Payment Status, Created Date, Actions

---

## 14.3 Screen: Sales Order Detail
**URL**: `/sales/:id`  |  **Access**: Manager+, Staff

### Entity Header
- Order number, customer, total amount, status, payment status

### Tabs
| Tab | Content |
|-----|---------|
| **Items** | Product table: Name, Qty, Unit Price, Discount, Line Total |
| **Payment** | Payment status, method, partial payments log |
| **Shipping** | Tracking info, delivery status |
| **Invoice** | Generated invoice, download PDF |
| **Timeline** | Status changes, notes |

---

## 14.4 Screen: Create Sales Order
**URL**: `/sales/create`  |  **Access**: Manager+, Staff

### Form
| Section | Fields |
|---------|--------|
| **Customer** | Lead/customer autocomplete, or quick-create |
| **Items** | Dynamic rows: Product search → auto-fill price; Qty; Discount %; Line total |
| **Summary** | Subtotal, tax, shipping, total (auto-calculated) |
| **Payment** | Payment terms, due date |
| **Notes** | Delivery instructions, internal notes |

### Generate PDF Invoice
- [Generate Invoice] → creates downloadable PDF
- Auto-numbered invoice with company header
- Email to customer option

---

## 14.5 Screen: Sales Analytics
**URL**: `/sales/analytics`  |  **Access**: Manager+

### KPIs
- Revenue today/week/month/year
- Orders count
- Average order value
- Top selling products (table)

### Charts
1. **Revenue Trend** (Line/Area)
2. **Sales by Product** (Bar)
3. **Sales by Customer** (Horizontal bar)
4. **Payment Collection** (Donut: Paid/Partial/Unpaid)

---

## 14.6 Quote-to-Cash Workflow
```
┌───────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───────┐
│ Lead  │───→│ Quote / │───→│ Sales   │───→│ Invoice │───→│Payment│
│ Won   │    │ Proposal│    │ Order   │    │ Sent    │    │Received│
└───────┘    └─────────┘    └─────────┘    └─────────┘    └───────┘
                                 │
                                 ▼
                           ┌─────────┐    ┌─────────┐
                           │ Process │───→│ Deliver │
                           │ Order   │    │ & Ship  │
                           └─────────┘    └─────────┘
```
