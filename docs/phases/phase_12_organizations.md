# Phase 12: Organization Management Module

## 12.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 5 (Screens 48-52) |
| **Purpose** | Company hierarchy management |
| **Key Feature** | Multi-level organization structure |

---

## 12.2 Organization Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ORGANIZATION HIERARCHY                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                       🏛️ CorpOps Global                             │
│                              │                                      │
│           ┌──────────────────┼──────────────────┐                   │
│           │                  │                  │                   │
│      🏢 Americas         🏢 EMEA           🏢 APAC                  │
│           │                  │                  │                   │
│     ┌─────┴─────┐      ┌─────┴─────┐     ┌─────┴─────┐             │
│     │           │      │           │     │           │             │
│  🏠 NYC HQ   🏠 LA   🏠 London  🏠 Dubai  🏠 Mumbai  🏠 Tokyo       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 12.3 Screen 48: Organizations List

**URL**: `/organizations`  
**Access**: Manager roles + Viewer (read-only)

### Tree View
```
┌────────────────────────────────────────────────────────────────────────┐
│ Organization Structure                              [+ Add Organization]│
├────────────────────────────────────────────────────────────────────────┤
│ View: [🌳 Tree] [📋 List] [🗺️ Map]                                     │
├────────────────────────────────────────────────────────────────────────┤
│ 🏛️ CorpOps Global (Root)                                              │
│   ├─ 🏢 Americas Region                           📊 Assets: 1,245    │
│   │   ├─ 🏠 NYC Headquarters          ⭐ HQ       📊 Assets: 650      │
│   │   ├─ 🏠 Los Angeles Office                    📊 Assets: 320      │
│   │   └─ 🏠 Chicago Office                        📊 Assets: 275      │
│   ├─ 🏢 EMEA Region                               📊 Assets: 890      │
│   │   ├─ 🏠 London Office                         📊 Assets: 450      │
│   │   └─ 🏠 Dubai Office                          📊 Assets: 440      │
│   └─ 🏢 APAC Region                               📊 Assets: 1,100    │
│       ├─ 🏠 Mumbai Office                         📊 Assets: 580      │
│       └─ 🏠 Tokyo Office                          📊 Assets: 520      │
└────────────────────────────────────────────────────────────────────────┘
```

### List View Columns
| Column | Description |
|--------|-------------|
| Name | Organization name with level icon |
| Code | Short code (NYC, LA, MUM) |
| Type | Region, Branch, Warehouse |
| Manager | Assigned manager |
| Assets | Asset count |
| Users | User count |
| Status | Active/Inactive |

---

## 12.4 Screen 49: Organization Detail

**URL**: `/organizations/:id`  
**Access**: Manager roles + Viewer (read-only)

### Tabs

#### Overview Tab
| Section | Fields |
|---------|--------|
| Basic Info | Name, Code, Type, Parent |
| Contact | Address, Phone, Email |
| Manager | Assigned manager |
| Currency | Base currency |
| Timezone | Local timezone |
| Status | Active/Inactive |

#### Statistics
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total Assets │ │ Active Users │ │ Open Tickets │ │ MTD Expenses │
│     650      │ │      45      │ │      12      │ │   $24,500    │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

#### Users Tab
- List of users assigned to this location
- Role distribution
- Activity metrics

#### Assets Tab
- Assets at this location
- Category breakdown
- Quick filters

#### Settings Tab
- Approval thresholds
- Notification preferences
- Business hours
- Holiday calendar

---

## 12.5 Screen 50: Create Organization

**URL**: `/organizations/create`  
**Access**: Super Admin only

### Form
| Field | Type | Validation |
|-------|------|------------|
| Organization Name* | Text | Required, unique |
| Code* | Text | 3-5 chars, uppercase |
| Type* | Dropdown | Region, Branch, Warehouse, HQ |
| Parent Organization* | Dropdown | Required |
| Manager | User search | Optional |
| Address | Address fields | Street, City, State, etc. |
| Contact Email | Email | Valid format |
| Contact Phone | Tel | Valid format |
| Base Currency* | Dropdown | Required |
| Timezone* | Dropdown | Required |
| Business Hours | Time range | Optional |
| Status | Toggle | Default: Active |

---

## 12.6 Screen 51: Organization Settings

**URL**: `/organizations/:id/settings`  
**Access**: Admins, managers of the organization

### Configuration Sections

#### Approval Settings
| Setting | Type | Description |
|---------|------|-------------|
| Branch Manager Limit | Currency | Max approval amount ($500 default) |
| Auto-Approve Below | Currency | Skip approval if under amount |
| Require 2nd Approval | Toggle | Above certain threshold |

#### Inventory Settings
| Setting | Type | Description |
|---------|------|-------------|
| Low Stock Alert % | Number | Default: 20% |
| Reorder Lead Days | Number | Buffer days |
| Allow Inter-Branch Transfer | Toggle | Enable/disable |

#### Notification Settings
| Setting | Type | Description |
|---------|------|-------------|
| Email Notifications | Toggle | Enable/disable |
| Daily Digest | Toggle | Summary email |
| Critical Alerts | Dropdown | Immediate/Hourly |

---

## 12.7 Screen 52: Location Map

**URL**: `/organizations/map`  
**Access**: All manager roles

### Interactive Map
```
┌────────────────────────────────────────────────────────────────────────┐
│ Location Map                                    [Satellite ▼] [Search] │
├────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │                                                                    ││
│ │                 🗺️ Interactive Map                                 ││
│ │                                                                    ││
│ │        📍NYC (650 assets)                                          ││
│ │                                    📍London (450)                  ││
│ │   📍LA (320)                                      📍Dubai (440)    ││
│ │                                                                    ││
│ │                              📍Mumbai (580)                        ││
│ │                                          📍Tokyo (520)             ││
│ │                                                                    ││
│ └────────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────────┤
│ Click marker for details │ Filter: [All Locations ▼]                  │
└────────────────────────────────────────────────────────────────────────┘
```

### Marker Popup
- Location name and code
- Asset count
- Open tickets
- Quick links: View, Assets, Tickets
