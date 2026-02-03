# Phase 17: Profile Module

## 17.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 3 (Screens 70-72) |
| **Purpose** | User personal settings |
| **Access** | All roles (own profile only) |

---

## 17.2 Screen 70: User Profile

**URL**: `/profile`  
**Access**: All roles (own profile)

### Profile View
```
┌────────────────────────────────────────────────────────────────────────┐
│ My Profile                                               [Edit Profile]│
├────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐                                                       │
│ │              │  John Smith                                           │
│ │   [Avatar]   │  Branch Manager                                       │
│ │              │  NYC Headquarters                                     │
│ │   [Change]   │  john.smith@corpops.com                               │
│ └──────────────┘                                                       │
├────────────────────────────────────────────────────────────────────────┤
│ PERSONAL INFORMATION                                                   │
├────────────────────────────────────────────────────────────────────────┤
│ Full Name           John Smith                                         │
│ Email               john.smith@corpops.com                             │
│ Phone               +1 (555) 123-4567                                  │
│ Department          Operations                                          │
│ Reports To          Mary Director                                       │
│ Member Since        January 15, 2024                                   │
├────────────────────────────────────────────────────────────────────────┤
│ ROLE & PERMISSIONS                                                     │
├────────────────────────────────────────────────────────────────────────┤
│ Role                Branch Manager                                      │
│ Approval Limit      $500                                               │
│ Location Scope      NYC Headquarters                                   │
│ Active Sessions     2 devices                                          │
├────────────────────────────────────────────────────────────────────────┤
│ QUICK STATS                                                            │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│ │ Approvals  │ │ Assets     │ │ Tickets    │ │ Login Days │           │
│ │   45       │ │   650      │ │   23       │ │   124      │           │
│ │ This Month │ │ Managed    │ │ Resolved   │ │ Streak     │           │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
└────────────────────────────────────────────────────────────────────────┘
```

### Edit Profile
| Field | Editable | Notes |
|-------|----------|-------|
| Avatar | Yes | Upload image |
| Full Name | Yes | With approval if org policy |
| Email | No | Requires admin |
| Phone | Yes | |
| Password | Yes | Via change password flow |
| Role | No | Requires admin |
| Location | No | Requires admin |

---

## 17.3 Screen 71: Account Settings

**URL**: `/profile/settings`  
**Access**: All roles

### Settings Sections

#### Security
```
┌────────────────────────────────────────────────────────────────────────┐
│ SECURITY                                                               │
├────────────────────────────────────────────────────────────────────────┤
│ Password                       Last changed: 45 days ago               │
│                                                    [Change Password]   │
├────────────────────────────────────────────────────────────────────────┤
│ Two-Factor Authentication                              [✓ Enabled]    │
│ Authentication app configured                                          │
│                                                    [Reconfigure]       │
├────────────────────────────────────────────────────────────────────────┤
│ Active Sessions                                             2 devices  │
│ • Chrome on Windows (Current)       NYC        Just now               │
│ • Safari on iPhone                  NYC        2 hours ago  [Revoke]   │
│                                                    [Revoke All Others] │
└────────────────────────────────────────────────────────────────────────┘
```

#### Preferences
```
┌────────────────────────────────────────────────────────────────────────┐
│ PREFERENCES                                                            │
├────────────────────────────────────────────────────────────────────────┤
│ Language                                                 [English ▼]  │
│ Timezone                                             [EST (UTC-5) ▼]  │
│ Date Format                                            [MM/DD/YYYY ▼] │
│ Theme                                                  [Dark Mode ▼]  │
├────────────────────────────────────────────────────────────────────────┤
│ Default Dashboard View                              [Branch Mgr ▼]    │
│ Items Per Page                                              [20 ▼]    │
│ Sound Notifications                                    [✓ Enabled]   │
└────────────────────────────────────────────────────────────────────────┘
```

#### Data & Privacy
```
┌────────────────────────────────────────────────────────────────────────┐
│ DATA & PRIVACY                                                         │
├────────────────────────────────────────────────────────────────────────┤
│ Download My Data        Export all your data in JSON format            │
│                                                    [Request Download]  │
├────────────────────────────────────────────────────────────────────────┤
│ Login History           View complete login history                    │
│                                                    [View History]     │
├────────────────────────────────────────────────────────────────────────┤
│ Account Deletion        Permanently delete your account                │
│                         (Requires admin approval)                      │
│                                                    [Request Deletion] │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 17.4 Screen 72: Activity History

**URL**: `/profile/activity`  
**Access**: All roles (own activity)

### Activity Timeline
```
┌────────────────────────────────────────────────────────────────────────┐
│ My Activity                          Filter: [All Activities ▼] [Date]│
├────────────────────────────────────────────────────────────────────────┤
│ TODAY                                                                  │
├────────────────────────────────────────────────────────────────────────┤
│ ● 10:50 AM   Approved Ticket #MT-789                                  │
│              HVAC Repair - $450                                        │
│                                                                        │
│ ● 10:45 AM   Logged In                                                │
│              Chrome on Windows • IP: 192.168.1.100                     │
│                                                                        │
│ ● 10:42 AM   Viewed Asset                                             │
│              HVAC Unit (COR-USA-NYC-HVAC-0042)                         │
├────────────────────────────────────────────────────────────────────────┤
│ YESTERDAY                                                              │
├────────────────────────────────────────────────────────────────────────┤
│ ● 04:30 PM   Created Purchase Order                                   │
│              PO-00189 - ABC Supply Co. - $2,450                        │
│                                                                        │
│ ● 03:15 PM   Updated Inventory                                        │
│              Stock-In: Compressor Belt x10                             │
│                                                                        │
│ ● 09:00 AM   Logged In                                                │
│              Safari on iPhone • IP: 172.16.0.50                        │
├────────────────────────────────────────────────────────────────────────┤
│ [Load More...]                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Activity Categories
- Authentication (Login, Logout)
- Approvals (Approved, Rejected)
- Asset Management
- Maintenance Actions
- Inventory Changes
- Financial Transactions
- User Management (if admin)
- Settings Changes
