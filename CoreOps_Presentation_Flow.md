# CoreOps ERP: Presentation Flow & Demo Script

This document provides a step-by-step guide on how to present the CoreOps ERP system during your faculty demonstration. It is designed to show the interconnectedness of the modules to highlight the "ERP" nature of the application.

---

## 🕒 Phase 1: Introduction & Dashboard Overview (5 mins)
**Goal:** Show the modern interface and explain what role-based access control (RBAC) does.

1. **Login Screen:**
   - Start at the login page.
   - Mention that the system is fully secure with JWT, HTTP-only cookies, and hashed passwords.
   - Mention the 5 distinct roles (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `TECHNICIAN`, `STAFF`).
2. **Login as Super Admin or Manager:**
   - Log in using a powerful account.
   - **Show the Dashboard:** Point out the unified widgets (Pending Approvals, Low Stock Alerts, Total Assets, Open Tickets).
   - **Explain the "Unified Approval Queue":** Show how a manager can see all pending requests (Maintenance, Procurements, Expense Claims) mixed together in one central queue instead of checking 5 different apps.
3. **Show OpsPilot (AI):**
   - Click the AI assistant button at the bottom right.
   - Type a simple prompt: *"Show me low stock items"* or *"What is our overall asset value?"*
   - Explain how Natural Language Processing (NLP) helps executives get data instantly without clicking through menus.

---

## 💻 Phase 2: The "Break-Fix" Lifecycle (Asset & Maintenance) (7 mins)
**Goal:** Demonstrate how an employee reports a broken asset, how a technician fixes it, and how the costs hit the finance module.

1. **Staff View (Reporting the Issue):**
   - Navigate to the **Assets** page. Point out the beautiful asset registry.
   - Pick an active asset (e.g., a Laptop) and click "Raise Ticket".
   - Fill out the ticket (e.g., "Screen is cracked") and set priority to HIGH.
2. **Manager View (Assigning):**
   - Go to **Maintenance > Tickets**.
   - Show the newly created pending ticket.
   - Assign it to a Technician. 
3. **Technician View (Fixing & Costing):**
   - Open that same ticket.
   - Change Status to `IN_PROGRESS`.
   - **Add Costs:** Go to the "Spare Parts / Consumptions" section. Log that you used `1x Screen Unit` (This automatically decrements the Inventory stock!).
   - Add a "Work Log" of 2 hours of labor.
   - Click **Complete Ticket**.
4. **The "Aha!" Moment (Integration):**
   - Explain to the faculty: *"Because this is an ERP, completing that ticket just triggered two background events: 1. Inventory stock went down. 2. A Financial Expense Transaction was automatically generated on the general ledger to track the repair cost."*

---

## 📦 Phase 3: The "Procure-to-Pay" Lifecycle (Inventory & Procurement) (8 mins)
**Goal:** Show the deep integration between requesting items, quoting vendors, receiving goods, and paying the bill.

1. **Inventory Low Stock Scenario:**
   - Go to the **Inventory** page. Show an item that is low on stock (or explain that the system flagged the screen we just used).
2. **Purchase Requisition (PR):**
   - Go to **Procurement > Requisitions**.
   - Click "New Requisition" and request new Screens or Laptops.
   - Submit for approval. 
   - *Optional:* Have a Manager approve the PR.
3. **Request for Quotation (RFQ):**
   - Go to **Procurement > RFQ**. Create a new RFQ for the requested items.
   - Assume vendors emailed you their prices. Click **Record Quotation** to simulate entering a vendor's bid.
   - Show the **Compare Quotes** tab. Explain how the system ranks the vendors by price and rating.
   - Click **Award Contract**.
4. **Purchase Order (PO):**
   - Show that a PO was instantly and automatically drafted from the winning RFQ.
   - Open the PO, review the auto-filled pricing, and move it to `ORDERED`.
5. **Receiving Goods (GRN):**
   - Click **Receive Goods** on the PO.
   - Explain to the faculty: *"When I click receive, the system automatically checks the items into the warehouse, updates the inventory count, and creates a Stock Movement log."*
6. **Finance Payment (The Final Link):**
   - Show that the PO is now fully received. 
   - Click **Approve Payment**. 
   - Explain: *"This completes the Procure-to-Pay cycle by automatically creating an official accounting transaction."*

---

## 💰 Phase 4: Finance, Expenses, and Conclusion (5 mins)
**Goal:** Prove that the ERP ties everything back to the balance sheet.

1. **Finance Dashboard:**
   - Go to the **Finance** module.
   - Show the General Ledger / Transactions list.
   - Point out the transactions that were *automatically* generated during the demo (the Maintenance repair cost and the PO payment). 
2. **Expense Claims (Employee Reimbursement):**
   - Go to **Finance > Expense Claims**.
   - Create a quick claim (e.g., "Client Lunch").
   - Approve and Pay it. Show how it instantly hits the transaction log.
3. **Conclusion:**
   - Summarize the value of CoreOps:
     > *"Before CoreOps, an organization would need a ticketing tool, an inventory spreadsheet, an accounting app, and an email chain to accomplish what we just did in 15 minutes. CoreOps unifies data, enforces strict access control through roles, automates cross-department workflows, and overlays it all with AI."*
   - Open the floor for faculty Q&A.

---

### 💡 Pro-Tips for the Presenter:
- **Pre-fill Data:** Before the presentation, make sure you have 3-4 Vendors, 5-10 Assets, and 5-10 Inventory items already created so the tables don't look empty.
- **Pacing:** If you are short on time, skip Phase 2 (Maintenance) and focus heavily on Phase 3 (Procure-to-Pay) as it shows the most modules talking to each other.
- **Errors:** If an error pops up during the demo, don't panic. Say, *"Ah, our role-based access control caught a permission issue,"* or *"That's a validation error preventing bad data entry,"* to turn it into a feature!
