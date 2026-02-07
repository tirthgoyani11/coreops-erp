// User Types

// All 5 user roles as defined in Phase 2
export type UserRole = 'SUPER_ADMIN' | 'MANAGER' | 'STAFF' | 'TECHNICIAN' | 'VIEWER';

export interface User {
    _id: string;
    id: string;
    name: string;
    email: string;
    role: UserRole;
    office: Office | null;
    officeId?: string;
    isActive: boolean;
    approvalLimit?: number;
}


export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    token: string;
    user: User;
}

// Office Types
export interface Office {
    _id: string;
    name: string;
    code: string;
    country: string;
    currency: string;
    isActive: boolean;
}

// Asset Types
export interface Asset {
    _id: string;
    guai: string;
    name: string;
    category: string;
    purchaseInfo: {
        purchasePrice: number;
        purchaseDate?: string;
        currency?: string;
    };
    officeId: Office;
    status: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
    createdBy: Pick<User, 'id' | 'name' | 'email'>;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAssetPayload {
    name: string;
    category: string;
    purchaseCost: number;
    currency?: string;
    officeId?: string;
    status?: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
}

// Inventory Types
export interface InventoryItem {
    _id: string;
    type: 'PRODUCT' | 'SPARE';
    name: string;
    sku: string;
    quantity: number;
    unitCost: number;
    officeId: Office;
    createdBy: Pick<User, 'id' | 'name' | 'email'>;
    createdAt: string;
    updatedAt: string;
}

export interface CreateInventoryPayload {
    type: 'PRODUCT' | 'SPARE';
    name: string;
    sku?: string;
    quantity: number;
    unitCost: number;
    officeId?: string;
}

// Vendor Types
export interface Vendor {
    _id: string;
    vendorCode: string;
    name: string;
    type: 'PARTS' | 'SERVICE' | 'EQUIPMENT' | 'CONSUMABLES' | 'OTHER';
    contactInfo: {
        email?: string;
        phone?: string;
        contactPerson?: string;
        address?: string;
    };
    reliabilityScore: {
        overallScore: number;
        deliveryScore: number;
        qualityScore: number;
        priceScore: number;
    };
    performanceMetrics: {
        totalOrders: number;
        completedOrders: number;
        onTimeDeliveries: number;
        onTimeDeliveryRate?: number;
        defectiveOrders: number;
        avgLeadTimeDays?: number;
    };
    paymentTerms: string;
    isActive: boolean;
    blacklisted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateVendorPayload {
    name: string;
    type: Vendor['type'];
    contactInfo?: Vendor['contactInfo'];
    paymentTerms?: string;
}

// Notification Types
export interface Notification {
    _id: string;
    recipient: string;
    type: 'system' | 'approval_required' | 'approval_rejected' | 'ticket_assigned' | 'ticket_completed' | 'low_stock' | 'maintenance_due';
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    isRead: boolean;
    readAt?: string;
    metadata?: Record<string, any>;
    actionUrl?: string;
    createdAt: string;
}

// Purchase Order Types
export interface PurchaseOrderItem {
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    inventoryId?: string;
}

export interface PurchaseOrder {
    _id: string;
    poNumber: string;
    vendor: Pick<Vendor, '_id' | 'name' | 'vendorCode'>;
    officeId: string;
    items: PurchaseOrderItem[];
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    shippingCost: number;
    totalAmount: number;
    currency: string;
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
    orderDate: string;
    expectedDeliveryDate?: string;
    approval?: {
        status: 'pending' | 'approved' | 'rejected';
        approvedBy?: Pick<User, '_id' | 'name'>;
        approvedDate?: string;
        rejectionReason?: string;
    };
    requestedBy: Pick<User, '_id' | 'name' | 'email'>;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePurchaseOrderPayload {
    vendor: string;
    items: Array<{ name: string; quantity: number; unitPrice: number }>;
    notes?: string;
    expectedDeliveryDate?: string;
}

// Maintenance Types
export interface MaintenanceTicket {
    _id: string;
    ticketNumber: string;
    asset: Pick<Asset, '_id' | 'guai' | 'name'>;
    type: 'REPAIR' | 'INSPECTION' | 'REPLACEMENT' | 'PREVENTIVE';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'OPEN' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED' | 'CANCELLED';
    description: string;
    estimatedCost: number;
    actualCost?: number;
    assignedTo?: Pick<User, '_id' | 'name'>;
    dueDate?: string;
    completedAt?: string;
    createdBy: Pick<User, '_id' | 'name'>;
    createdAt: string;
    updatedAt: string;
}

// API Response Types
export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    pages?: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
    count?: number;
    pagination?: PaginationMeta;
}

export interface ApiError {
    success: false;
    message: string;
    errors?: Array<{ field: string; message: string }>;
}

