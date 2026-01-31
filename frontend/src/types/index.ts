// User Types
export interface User {
    id: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'MANAGER' | 'STAFF';
    office: Office | null;
    isActive: boolean;
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
    purchaseCost: number;
    currency: string;
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

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
    count?: number;
}
