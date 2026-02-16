# 24: CoreAI Engine Module

## 24.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 4 |
| **Phase** | 7-8 |
| **Backend** | Google Gemini API integration |
| **Key Feature** | NLP queries, predictive maintenance, anomaly detection, smart suggestions |

---

## 24.2 Architecture

### AI Pipeline
```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
│ User     │───→│ Query Parser │───→│ Gemini API   │───→│ Response │
│ Request  │    │ (NLP)        │    │ (AI Engine)  │    │ Renderer │
└──────────┘    └──────────────┘    └──────────────┘    └──────────┘
                                           │
                                    ┌──────▼──────┐
                                    │ ERP Context │
                                    │ (DB data,   │
                                    │  schemas)   │
                                    └─────────────┘
```

### Context Injection
- AI queries are enriched with relevant ERP context:
  - Current user's role and permissions
  - Organization data scope
  - Recent entity data (assets, tickets, inventory)
  - Historical trends

---

## 24.3 Screen: AI Assistant (Command Palette)
**URL**: Modal via `Ctrl + K` or `/` key  |  **Access**: All (results scoped by role)

### Layout
```
┌──────────────────────────────────────────────────────────────────┐
│  🤖 CoreAI — Ask anything...                              [ESC] │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ "Show me all assets in NYC with maintenance due next week"  ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Recent:                                                         │
│  • "Assets with health score below 70"                          │
│  • "Compare maintenance costs Q3 vs Q4"                         │
│  • "Who has the most open tickets?"                             │
│                                                                  │
│  Quick Actions:                                                  │
│  • 📊 Generate Monthly Report                                   │
│  • 🔮 Predict Maintenance Needs                                 │
│  • 📈 Show KPI Dashboard                                        │
│  • 🔍 Search Everything                                         │
└──────────────────────────────────────────────────────────────────┘
```

### Query Types
| Query Type | Example | Output |
|------------|---------|--------|
| **Data Query** | "How many assets do we have in NYC?" | Number + table |
| **Comparison** | "Compare vendor reliability" | Chart + table |
| **Prediction** | "When will HVAC-042 need maintenance?" | Prediction card |
| **Recommendation** | "Should we repair or replace HVAC-042?" | Analysis card |
| **Summary** | "Give me this week's executive summary" | Narrative text |
| **Action** | "Create a ticket for elevator inspection" | Pre-filled form |

### Response Rendering
```
┌──────────────────────────────────────────────────────────────────┐
│  🤖 CoreAI Response                                              │
│                                                                  │
│  You have **42 assets** in NYC across 3 locations:               │
│                                                                  │
│  | Location    | Assets | Total Value |                         │
│  |-------------|--------|-------------|                         │
│  | NYC HQ      | 25     | ₹320,000    |                        │
│  | Brooklyn    | 12     | ₹150,000    |                        │
│  | Queens      | 5      | ₹45,000     |                        │
│                                                                  │
│  💡 3 assets need maintenance this week.                         │
│  [View NYC Assets →] [Schedule Maintenance →]                   │
│                                                                  │
│  Was this helpful? [👍] [👎]                                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 24.4 Screen: Predictive Insights Dashboard
**URL**: `/ai/insights`  |  **Access**: Manager+

### Predictions
```
┌──────────────────────────────────────────────────────────────────┐
│  🔮 Predictive Insights                    Updated: 2 hours ago │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MAINTENANCE PREDICTIONS                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ⚠ HIGH: HVAC-042 (NYC HQ)                                │  │
│  │   87% probability of compressor failure in 14 days        │  │
│  │   Basis: 3 recent tickets, age, similar asset patterns    │  │
│  │   [Schedule Preventive Maintenance] [View Asset]          │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ 🟡 MEDIUM: Elevator-01 (NYC L1)                          │  │
│  │   45% probability of motor issue in 30 days               │  │
│  │   [Schedule Inspection] [View Asset]                      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  INVENTORY PREDICTIONS                                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 📦 Low Stock Alert: 5 items will run out in 2 weeks       │  │
│  │   Based on current consumption rate                       │  │
│  │   [Generate Purchase Orders]                              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ANOMALY DETECTION                                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 🚨 Unusual: 300% increase in maintenance costs at SF      │  │
│  │   office in January vs normal                             │  │
│  │   [Investigate]                                           │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 24.5 Screen: AI Anomaly Alerts
**URL**: `/ai/anomalies`  |  **Access**: Manager+

### Features
- Real-time anomaly detection across modules
- Alert categories: Cost anomaly, Usage spike, Performance degradation, Pattern break
- Severity levels: Info, Warning, Critical
- Auto-dismiss after investigation
- Historical anomaly log

---

## 24.6 Screen: AI Context Configuration
**URL**: `/admin/ai`  |  **Access**: Admin

### Settings
| Setting | Description |
|---------|-------------|
| Gemini API Key | Required for AI features |
| Model | gemini-2.0-flash (default) |
| Enable Predictions | Toggle |
| Prediction Frequency | Daily/Weekly |
| Enable NLP Queries | Toggle |
| Enable Anomaly Detection | Toggle |
| Data Retention | How much history AI can access |
| Usage Limits | Max queries per user/day |

---

## 24.7 Implementation Notes

### Gemini Integration
```javascript
// Backend: services/aiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

class AIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  async query(userPrompt, context) {
    const systemPrompt = `You are CoreAI, an ERP assistant.
      Organization: ${context.organization}
      User Role: ${context.role}
      Available Data: ${JSON.stringify(context.dataSnapshot)}
      Respond with structured JSON when possible.`;

    const result = await this.model.generateContent([systemPrompt, userPrompt]);
    return this.parseResponse(result);
  }

  async predictMaintenance(assetId) {
    const asset = await Asset.findById(assetId).populate('tickets');
    const prompt = `Analyze this asset and predict failure probability:
      Asset: ${JSON.stringify(asset)}
      Tickets: ${JSON.stringify(asset.tickets)}
      Similar assets average: ${similarAssetsData}`;
    
    return this.query(prompt, { type: 'prediction' });
  }

  async detectAnomalies() {
    const data = await this.getModuleStats();
    const prompt = `Detect anomalies in this ERP data: ${JSON.stringify(data)}`;
    return this.query(prompt, { type: 'anomaly' });
  }
}
```
