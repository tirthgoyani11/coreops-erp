# 25: RBAC & Permissions Reference

## 25.1 Role Definitions

| Role | Scope | Description |
|------|-------|-------------|
| **SUPER_ADMIN** | All organizations | Full platform access, system configuration, manages all orgs |
| **ADMIN** | Assigned organization | Organization-level management, system settings, user management, full CRUD |
| **MANAGER** | Assigned branches | Branch-level management, approvals, reports, team management |
| **TECHNICIAN** | Assigned tickets | Field work, maintenance execution, parts consumption, mobile access |
| **STAFF** | Assigned branch | Day-to-day operations, data entry, basic tasks |
| **VIEWER** | Assigned scope | Read-only access to permitted modules |

---

## 25.2 Permission Matrix

### Core Modules
| Feature | Super Admin | Admin | Manager | Staff | Technician | Viewer |
|---------|:-----------:|:-----:|:-------:|:-----:|:----------:|:------:|
| **Dashboard** | Full | Org | Branch | Own | Tech | Read |
| **User Management** | CRUD | CRUD (own org) | Read | - | - | - |
| **Organization** | CRUD | CRUD (own org) | Read/Edit | Read | Read | Read |
| **Currency Management** | CRUD | CRUD | Read | - | - | - |

### Asset Management
| Feature | Super Admin | Admin | Manager | Staff | Technician | Viewer |
|---------|:-----------:|:-----:|:-------:|:-----:|:----------:|:------:|
| View Assets | ✅ All | ✅ Org | ✅ Branch | ✅ Branch | ✅ Assigned | ✅ Scope |
| Create Asset | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Asset | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Asset | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transfer Asset | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View QR Code | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Depreciation | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export Assets | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Import Assets | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Maintenance
| Feature | Super Admin | Admin | Manager | Staff | Technician | Viewer |
|---------|:-----------:|:-----:|:-------:|:-----:|:----------:|:------:|
| View Tickets | ✅ All | ✅ Org | ✅ Branch | ✅ Own | ✅ Assigned | ✅ Scope |
| Create Ticket | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit Ticket | ✅ | ✅ | ✅ | ✅ Own | ✅ Assigned | ❌ |
| Delete Ticket | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve Ticket | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign Ticket | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change Status | ✅ | ✅ | ✅ | ❌ | ✅ Assigned | ❌ |
| Log Parts | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| View Analytics | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### Inventory
| Feature | Super Admin | Admin | Manager | Staff | Technician | Viewer |
|---------|:-----------:|:-----:|:-------:|:-----:|:----------:|:------:|
| View Inventory | ✅ All | ✅ Org | ✅ Branch | ✅ Branch | ✅ Scope | ✅ Scope |
| Create Item | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Item | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Stock-In | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Stock-Out | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Transfer | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Adjust Stock | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Import | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Procurement
| Feature | Super Admin | Admin | Manager | Staff | Technician | Viewer |
|---------|:-----------:|:-----:|:-------:|:-----:|:----------:|:------:|
| View Vendors | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Manage Vendors | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View POs | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create PO | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve PO | ✅ | ✅ | ✅ (limit) | ❌ | ❌ | ❌ |
| Receive Goods | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

### Financial
| Feature | Super Admin | Admin | Manager | Staff | Technician | Viewer |
|---------|:-----------:|:-----:|:-------:|:-----:|:----------:|:------:|
| View Transactions | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Transaction | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| OCR Scan | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reports | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Bank Reconciliation | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Currency Management | ✅ | ✅ | Read | ❌ | ❌ | ❌ |

### HR
| Feature | Super Admin | Admin | Manager | Staff | Technician | Viewer |
|---------|:-----------:|:-----:|:-------:|:-----:|:----------:|:------:|
| Employee Directory | ✅ | ✅ | ✅ | Read | Read | Read |
| Create Employee | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Attendance | ✅ All | ✅ Org | ✅ Team | ✅ Own | ✅ Own | ❌ |
| Apply Leave | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve Leave | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Org Chart | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### CRM & Sales
| Feature | Super Admin | Admin | Manager | Staff | Technician | Viewer |
|---------|:-----------:|:-----:|:-------:|:-----:|:----------:|:------:|
| View Leads | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Leads | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Sales Orders | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| CRM Analytics | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### Manufacturing
| Feature | Super Admin | Admin | Manager | Staff | Technician | Viewer |
|---------|:-----------:|:-----:|:-------:|:-----:|:----------:|:------:|
| View BOMs | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create/Edit BOM | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Work Orders | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Material Planner | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### Quality & Projects
| Feature | Super Admin | Admin | Manager | Staff | Technician | Viewer |
|---------|:-----------:|:-----:|:-------:|:-----:|:----------:|:------:|
| Quality Inspections | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Projects | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Gantt Chart | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### Administration
| Feature | Super Admin | Admin | Manager | Staff | Technician | Viewer |
|---------|:-----------:|:-----:|:-------:|:-----:|:----------:|:------:|
| System Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Custom Fields | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Workflow Builder | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Webhooks | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Backup | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Universal
| Feature | Super Admin | Admin | Manager | Staff | Technician | Viewer |
|---------|:-----------:|:-----:|:-------:|:-----:|:----------:|:------:|
| Own Profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Documents | ✅ | ✅ | ✅ | ✅ (upload) | ✅ (upload) | Read |
| AI Queries | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI Predictions | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 25.3 Data Scoping Rules

| Role | Data Scope |
|------|------------|
| Super Admin | All organizations, all branches |
| Admin | All data within assigned organization |
| Manager | Only data from assigned branches/organizations |
| Staff | Only data from their assigned branch |
| Technician | Only tickets assigned to them + inventory for parts |
| Viewer | Configure per viewer: specific branches or organization |

### Implementation
```javascript
// Middleware: scopeByRole
const scopeByRole = async (req, res, next) => {
  const { role, organization, branches } = req.user;
  
  switch (role) {
    case 'SUPER_ADMIN':
      req.scope = {}; // No filter
      break;
    case 'ADMIN':
      req.scope = { organization: req.user.organization };
      break;
    case 'MANAGER':
      req.scope = { organization: { $in: branches.map(b => b.org) } };
      break;
    case 'STAFF':
    case 'VIEWER':
      req.scope = { organization: req.user.primaryOrganization };
      break;
    case 'TECHNICIAN':
      req.scope = { assignedTo: req.user._id };
      break;
  }
  next();
};
```

---

## 25.4 Approval Limits

| Role | Max PO Approval | Max Transaction | Auto-Approve |
|------|----------------|-----------------|--------------|
| Super Admin | Unlimited | Unlimited | N/A |
| Admin | Unlimited (own org) | Unlimited (own org) | N/A |
| Manager | ₹10,00,000 | ₹5,00,000 | Under ₹50,000 |
| Technician | ₹0 (cannot approve) | ₹0 | N/A |
| Staff | ₹0 (cannot approve) | ₹0 | N/A |

> These limits are configurable in Admin Settings. All monetary values use the organization's base currency and are automatically converted using real-time exchange rates from the `CurrencyRate` model.
