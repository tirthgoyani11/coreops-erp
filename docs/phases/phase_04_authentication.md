# Phase 04: Authentication Module

## 4.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 5 |
| **Screen Numbers** | 1-5 |
| **Access** | All roles (pre-login) |

---

## 4.2 Screen Specifications

### Screen 1: Login
**URL**: `/login`

#### Layout
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│     ┌─────────────────────────────────────────────────────┐     │
│     │                                                     │     │
│     │              🏢 CorpOps ERP                         │     │
│     │                                                     │     │
│     │     ┌─────────────────────────────────────┐        │     │
│     │     │ Email                               │        │     │
│     │     └─────────────────────────────────────┘        │     │
│     │                                                     │     │
│     │     ┌─────────────────────────────────────┐        │     │
│     │     │ Password                        👁   │        │     │
│     │     └─────────────────────────────────────┘        │     │
│     │                                                     │     │
│     │     ☑ Remember me         Forgot Password?         │     │
│     │                                                     │     │
│     │     ┌─────────────────────────────────────┐        │     │
│     │     │           Sign In                   │        │     │
│     │     └─────────────────────────────────────┘        │     │
│     │                                                     │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Components
| Component | Type | Validation |
|-----------|------|------------|
| Email Input | `<Input type="email">` | Required, valid email format |
| Password Input | `<Input type="password">` | Required, min 6 chars |
| Show/Hide Toggle | `<Button>` | Toggle password visibility |
| Remember Me | `<Checkbox>` | Optional |
| Forgot Password Link | `<Link>` | Navigate to `/forgot-password` |
| Submit Button | `<Button>` | Disabled until valid |

#### API Integration
```typescript
POST /api/auth/login
Body: { email: string, password: string }
Response: { token: string, user: User }
```

#### Success Flow
1. Validate inputs
2. Call API
3. Store token in localStorage/cookie
4. Redirect to role-appropriate dashboard

#### Error Handling
- Invalid credentials: Show toast error
- Network error: Show retry option
- Account locked: Show contact admin message

---

### Screen 2: Forgot Password
**URL**: `/forgot-password`

#### Layout
```
┌─────────────────────────────────────────────────────────────────┐
│     ← Back to Login                                             │
│                                                                 │
│     ┌─────────────────────────────────────────────────────┐     │
│     │                                                     │     │
│     │              🔐 Reset Password                      │     │
│     │                                                     │     │
│     │     Enter your email address and we'll send you    │     │
│     │     a link to reset your password.                 │     │
│     │                                                     │     │
│     │     ┌─────────────────────────────────────┐        │     │
│     │     │ Email Address                       │        │     │
│     │     └─────────────────────────────────────┘        │     │
│     │                                                     │     │
│     │     ┌─────────────────────────────────────┐        │     │
│     │     │        Send Reset Link              │        │     │
│     │     └─────────────────────────────────────┘        │     │
│     │                                                     │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### API Integration
```typescript
POST /api/auth/forgot-password
Body: { email: string }
Response: { message: string }
```

---

### Screen 3: Reset Password
**URL**: `/reset-password/:token`

#### Components
| Component | Validation |
|-----------|------------|
| New Password | Min 8 chars, 1 uppercase, 1 number |
| Confirm Password | Must match |
| Submit Button | Validate token on load |

#### API Integration
```typescript
POST /api/auth/reset-password
Body: { token: string, password: string }
Response: { message: string }
```

---

### Screen 4: Registration (Invitation-Based)
**URL**: `/register/:inviteToken`

#### Form Fields
| Field | Type | Validation |
|-------|------|------------|
| First Name | Text | Required |
| Last Name | Text | Required |
| Email | Email | Pre-filled from invite, read-only |
| Password | Password | Min 8 chars |
| Confirm Password | Password | Must match |
| Phone | Tel | Optional |

---

### Screen 5: First-Time Setup Wizard
**URL**: `/setup` (Super Admin only)

#### Steps
1. **Organization Info**: Company name, logo, address
2. **Base Currency**: Select primary currency
3. **First Branch**: Create headquarters
4. **Admin Account**: Confirm super admin details
5. **Complete**: Dashboard redirect

---

## 4.3 State Management

### Auth Store (Zustand)
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}
```

---

## 4.4 Security Features
- JWT token with 24h expiry
- Refresh token mechanism
- Password hashing (bcrypt)
- Rate limiting on login attempts
- Session invalidation on logout
