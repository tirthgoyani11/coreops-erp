-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TECHNICIAN', 'STAFF', 'VIEWER');

-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('LAPTOP', 'COMPUTER', 'FURNITURE', 'VEHICLE', 'EQUIPMENT', 'PHONE', 'PRINTER', 'SERVER', 'NETWORK', 'MACHINERY', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'DECOMMISSIONED', 'LOST', 'SOLD', 'RETIRED');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'DECLINING_BALANCE');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('REQUESTED', 'PENDING', 'IN_PROGRESS', 'PENDING_PARTS', 'APPROVED', 'REJECTED', 'COMPLETED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('HARDWARE_FAILURE', 'SOFTWARE_ISSUE', 'PREVENTIVE', 'UPGRADE', 'OTHER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'AUTO_APPROVED', 'APPROVED', 'REJECTED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "InventoryType" AS ENUM ('PRODUCT', 'SPARE');

-- CreateEnum
CREATE TYPE "TrackingType" AS ENUM ('QUANTITY', 'SERIAL', 'BATCH');

-- CreateEnum
CREATE TYPE "SerialStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'SOLD', 'DEFECTIVE');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'CLEARED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('PURCHASE_ORDER', 'WORK_ORDER', 'INVOICE', 'MANUAL');

-- CreateEnum
CREATE TYPE "OfficeType" AS ENUM ('HEADQUARTERS', 'REGIONAL_OFFICE', 'BRANCH', 'WAREHOUSE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPROVAL_REQUIRED', 'LOW_STOCK', 'TICKET_ASSIGNED', 'TICKET_COMPLETED', 'TICKET_APPROVED', 'TICKET_REJECTED', 'ASSET_TRANSFERRED', 'SYSTEM_ALERT', 'VENDOR_UPDATE');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'CREATE_ASSET', 'UPDATE_ASSET', 'DELETE_ASSET', 'TRANSFER_ASSET', 'CREATE_TICKET', 'APPROVE_TICKET', 'REJECT_TICKET', 'CLOSE_TICKET', 'ASSIGN_TICKET', 'CREATE_INVENTORY', 'UPDATE_INVENTORY', 'DELETE_INVENTORY', 'STOCK_IN', 'STOCK_OUT', 'STOCK_ADJUSTMENT', 'CREATE_VENDOR', 'UPDATE_VENDOR', 'DELETE_VENDOR', 'BLACKLIST_VENDOR', 'CREATE_PURCHASE_ORDER', 'UPDATE_PURCHASE_ORDER', 'APPROVE_PURCHASE_ORDER', 'REJECT_PURCHASE_ORDER', 'CANCEL_PURCHASE_ORDER', 'RECEIVE_PURCHASE_ORDER', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'ACTIVATE_USER', 'DEACTIVATE_USER', 'CREATE_OFFICE', 'UPDATE_OFFICE', 'DELETE_OFFICE', 'CREATE_TRANSACTION', 'UPDATE_TRANSACTION', 'CURRENCY_CONVERSION', 'SYSTEM_ERROR', 'DATA_EXPORT', 'SETTINGS_CHANGE');

-- CreateEnum
CREATE TYPE "AuditResourceType" AS ENUM ('USER_RESOURCE', 'ASSET_RESOURCE', 'MAINTENANCE_RESOURCE', 'INVENTORY_RESOURCE', 'VENDOR_RESOURCE', 'OFFICE_RESOURCE', 'FINANCE_LOG_RESOURCE', 'CURRENCY_RATE_RESOURCE', 'PURCHASE_ORDER_RESOURCE', 'SYSTEM_RESOURCE');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAILURE', 'ERROR');

-- CreateEnum
CREATE TYPE "AiIntent" AS ENUM ('CLOSE_MAINTENANCE', 'PROCESS_BILL', 'APPROVE_PURCHASE', 'REJECT_PURCHASE', 'GENERATE_REPORT', 'QUERY_DATA', 'CREATE_TRANSACTION', 'DETECT_ANOMALY', 'EXTRACT_DOCUMENT', 'PREDICT_MAINTENANCE', 'MATCH_INVOICE', 'FORECAST_BUDGET', 'GENERAL');

-- CreateEnum
CREATE TYPE "AiOperationStatus" AS ENUM ('AI_PENDING', 'AI_COMPLETED', 'AI_FAILED', 'AI_ROLLED_BACK', 'AI_AWAITING_APPROVAL');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN');

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "OfficeType" NOT NULL DEFAULT 'BRANCH',
    "parentId" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "baseCurrency" TEXT NOT NULL DEFAULT 'INR',
    "countryCode" TEXT,
    "locationCode" TEXT,
    "maintenanceApprovalThreshold" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "autoApproveUnder" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "defaultDepreciationMethod" "DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "officeId" TEXT,
    "canApproveTickets" BOOLEAN NOT NULL DEFAULT false,
    "canManageAssets" BOOLEAN NOT NULL DEFAULT false,
    "canManageInventory" BOOLEAN NOT NULL DEFAULT false,
    "canViewFinancials" BOOLEAN NOT NULL DEFAULT false,
    "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
    "canManageVendors" BOOLEAN NOT NULL DEFAULT false,
    "approvalLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockUntil" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "inviteToken" TEXT,
    "inviteTokenExpires" TIMESTAMP(3),
    "phone" TEXT,
    "avatar" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "inAppNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendorCode" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "bankDetails" JSONB,
    "rating" DOUBLE PRECISION DEFAULT 0,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "officeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "guai" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AssetCategory" NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "vendorId" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "purchaseOrderNumber" TEXT,
    "invoiceNumber" TEXT,
    "warrantyStart" TIMESTAMP(3),
    "warrantyEnd" TIMESTAMP(3),
    "warrantyTerms" TEXT,
    "depreciationMethod" "DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "usefulLife" INTEGER NOT NULL DEFAULT 5,
    "salvageValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentBookValue" DOUBLE PRECISION,
    "depreciationRate" DOUBLE PRECISION,
    "lastDepCalculated" TIMESTAMP(3),
    "building" TEXT,
    "floor" TEXT,
    "room" TEXT,
    "assignedToId" TEXT,
    "officeId" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "qrCode" TEXT,
    "images" JSONB,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetMaintenanceHistory" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "AssetMaintenanceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "issueType" "IssueType" NOT NULL DEFAULT 'OTHER',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "estimatedCost" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "algorithmDecision" JSONB,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvalDate" TIMESTAMP(3),
    "approvalNotes" TEXT,
    "assignedToId" TEXT,
    "assignedDate" TIMESTAMP(3),
    "status" "TicketStatus" NOT NULL DEFAULT 'REQUESTED',
    "decision" TEXT,
    "resolution" TEXT,
    "completedDate" TIMESTAMP(3),
    "requestedById" TEXT NOT NULL,
    "reportedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLog" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "hoursWorked" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePartUsage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "inventoryId" TEXT,
    "partNumber" TEXT,
    "name" TEXT,
    "quantity" INTEGER NOT NULL,
    "costPerUnit" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SparePartUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "type" "InventoryType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "partNumber" TEXT,
    "category" TEXT,
    "subcategory" TEXT,
    "officeId" TEXT NOT NULL,
    "storageLocation" TEXT,
    "storageBin" TEXT,
    "storageShelf" TEXT,
    "trackingType" "TrackingType" NOT NULL DEFAULT 'QUANTITY',
    "currentQuantity" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER NOT NULL DEFAULT 10,
    "reorderQuantity" INTEGER NOT NULL DEFAULT 50,
    "maxQuantity" INTEGER,
    "minimumQuantity" INTEGER NOT NULL DEFAULT 5,
    "unit" TEXT NOT NULL DEFAULT 'pieces',
    "costPrice" DOUBLE PRECISION,
    "sellingPrice" DOUBLE PRECISION,
    "marginPercentage" DOUBLE PRECISION,
    "unitCost" DOUBLE PRECISION,
    "pricingCurrency" TEXT NOT NULL DEFAULT 'INR',
    "lastPurchasePrice" DOUBLE PRECISION,
    "lastPurchaseDate" TIMESTAMP(3),
    "lastRestockDate" TIMESTAMP(3),
    "primaryVendorId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "reference" TEXT,
    "performedById" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DOUBLE PRECISION,
    "taxAmount" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "orderDate" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvalDate" TIMESTAMP(3),
    "grnReference" TEXT,
    "invoiceReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "inventoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "referenceType" "ReferenceType" NOT NULL DEFAULT 'MANUAL',
    "referenceId" TEXT,
    "officeId" TEXT,
    "recordedById" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'CLEARED',
    "glAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "limit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "path" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "officeId" TEXT,
    "uploadedById" TEXT,
    "description" TEXT,
    "ocrText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "relatedModel" TEXT,
    "relatedDocId" TEXT,
    "actions" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "resourceType" "AuditResourceType",
    "resourceId" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" "AuditStatus" NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "description" TEXT,
    "sessionId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyRate" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "targetCurrency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "source" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrencyRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "description" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "officeId" TEXT,
    "recordedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "vendorId" TEXT,
    "customerId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PURCHASE',
    "amount" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "ocrData" JSONB,
    "officeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiOperation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "intent" "AiIntent" NOT NULL,
    "inputSummary" TEXT,
    "agentsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "planSteps" JSONB,
    "anomaliesDetected" JSONB,
    "confidenceScore" DOUBLE PRECISION,
    "selfConsistencyVotes" JSONB,
    "rollbackEvents" JSONB,
    "humanApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "humanApprovalById" TEXT,
    "humanApprovalAt" TIMESTAMP(3),
    "humanApprovalDecision" TEXT,
    "totalDurationMs" INTEGER,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "explanation" JSONB,
    "digitalTwinPreview" JSONB,
    "status" "AiOperationStatus" NOT NULL DEFAULT 'AI_PENDING',
    "officeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Office_code_key" ON "Office"("code");

-- CreateIndex
CREATE INDEX "Office_name_country_idx" ON "Office"("name", "country");

-- CreateIndex
CREATE INDEX "Office_parentId_idx" ON "Office"("parentId");

-- CreateIndex
CREATE INDEX "Office_type_isActive_idx" ON "Office"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_officeId_idx" ON "User"("role", "officeId");

-- CreateIndex
CREATE INDEX "User_officeId_idx" ON "User"("officeId");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_vendorCode_key" ON "Vendor"("vendorCode");

-- CreateIndex
CREATE INDEX "Vendor_name_idx" ON "Vendor"("name");

-- CreateIndex
CREATE INDEX "Vendor_isBlacklisted_idx" ON "Vendor"("isBlacklisted");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_guai_key" ON "Asset"("guai");

-- CreateIndex
CREATE INDEX "Asset_officeId_status_idx" ON "Asset"("officeId", "status");

-- CreateIndex
CREATE INDEX "Asset_category_status_idx" ON "Asset"("category", "status");

-- CreateIndex
CREATE INDEX "Asset_assignedToId_idx" ON "Asset"("assignedToId");

-- CreateIndex
CREATE INDEX "Asset_serialNumber_idx" ON "Asset"("serialNumber");

-- CreateIndex
CREATE INDEX "Asset_vendorId_idx" ON "Asset"("vendorId");

-- CreateIndex
CREATE INDEX "Asset_createdAt_idx" ON "Asset"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "AssetMaintenanceHistory_assetId_date_idx" ON "AssetMaintenanceHistory"("assetId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceTicket_ticketNumber_key" ON "MaintenanceTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_assetId_status_idx" ON "MaintenanceTicket"("assetId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_requestedById_reportedDate_idx" ON "MaintenanceTicket"("requestedById", "reportedDate" DESC);

-- CreateIndex
CREATE INDEX "MaintenanceTicket_status_priority_idx" ON "MaintenanceTicket"("status", "priority");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_approvalStatus_idx" ON "MaintenanceTicket"("approvalStatus");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_assignedToId_status_idx" ON "MaintenanceTicket"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_officeId_status_idx" ON "MaintenanceTicket"("officeId", "status");

-- CreateIndex
CREATE INDEX "WorkLog_ticketId_idx" ON "WorkLog"("ticketId");

-- CreateIndex
CREATE INDEX "WorkLog_technicianId_idx" ON "WorkLog"("technicianId");

-- CreateIndex
CREATE INDEX "SparePartUsage_ticketId_idx" ON "SparePartUsage"("ticketId");

-- CreateIndex
CREATE INDEX "SparePartUsage_inventoryId_idx" ON "SparePartUsage"("inventoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_sku_key" ON "Inventory"("sku");

-- CreateIndex
CREATE INDEX "Inventory_officeId_type_idx" ON "Inventory"("officeId", "type");

-- CreateIndex
CREATE INDEX "Inventory_category_idx" ON "Inventory"("category");

-- CreateIndex
CREATE INDEX "Inventory_type_isActive_idx" ON "Inventory"("type", "isActive");

-- CreateIndex
CREATE INDEX "StockMovement_inventoryId_date_idx" ON "StockMovement"("inventoryId", "date" DESC);

-- CreateIndex
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_officeId_status_idx" ON "PurchaseOrder"("officeId", "status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_createdAt_idx" ON "PurchaseOrder"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_inventoryId_idx" ON "PurchaseOrderItem"("inventoryId");

-- CreateIndex
CREATE INDEX "Transaction_officeId_date_idx" ON "Transaction"("officeId", "date" DESC);

-- CreateIndex
CREATE INDEX "Transaction_type_category_idx" ON "Transaction"("type", "category");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Budget_officeId_year_month_idx" ON "Budget"("officeId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_officeId_category_month_year_key" ON "Budget"("officeId", "category", "month", "year");

-- CreateIndex
CREATE INDEX "Document_officeId_category_idx" ON "Document"("officeId", "category");

-- CreateIndex
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_recipientId_isRead_sentAt_idx" ON "Notification"("recipientId", "isRead", "sentAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_action_timestamp_idx" ON "AuditLog"("action", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_status_idx" ON "AuditLog"("status");

-- CreateIndex
CREATE INDEX "CurrencyRate_baseCurrency_idx" ON "CurrencyRate"("baseCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyRate_baseCurrency_targetCurrency_key" ON "CurrencyRate"("baseCurrency", "targetCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Counter_name_key" ON "Counter"("name");

-- CreateIndex
CREATE INDEX "FinanceLog_officeId_createdAt_idx" ON "FinanceLog"("officeId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "FinanceLog_type_idx" ON "FinanceLog"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_officeId_status_idx" ON "Invoice"("officeId", "status");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "AiOperation_intent_createdAt_idx" ON "AiOperation"("intent", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AiOperation_relatedEntityType_relatedEntityId_idx" ON "AiOperation"("relatedEntityType", "relatedEntityId");

-- CreateIndex
CREATE INDEX "AiOperation_officeId_createdAt_idx" ON "AiOperation"("officeId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AiOperation_confidenceScore_idx" ON "AiOperation"("confidenceScore");

-- CreateIndex
CREATE INDEX "AiOperation_status_idx" ON "AiOperation"("status");

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMaintenanceHistory" ADD CONSTRAINT "AssetMaintenanceHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "MaintenanceTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePartUsage" ADD CONSTRAINT "SparePartUsage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "MaintenanceTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePartUsage" ADD CONSTRAINT "SparePartUsage_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiOperation" ADD CONSTRAINT "AiOperation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiOperation" ADD CONSTRAINT "AiOperation_humanApprovalById_fkey" FOREIGN KEY ("humanApprovalById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiOperation" ADD CONSTRAINT "AiOperation_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;
