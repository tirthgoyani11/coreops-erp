const fs = require('fs');
let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

const lines = content.split('\n');
content = lines.slice(0, 1389).join('\n');

const oldDoc = `model Document {
  id          String   @id @default(uuid())
  name        String
  originalName String?
  mimeType    String?
  size        Int?
  path        String
  category    String?
  tags        String[] @default([])
  officeId    String?
  uploadedById String?
  description String?
  ocrText     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([officeId, category])
  @@index([createdAt(sort: Desc)])
}`;

const newDoc = `model Document {
  id             String    @id @default(uuid())
  name           String
  originalName   String?
  mimeType       String?
  size           Int?
  url            String    @map("path")
  publicId       String?
  category       String?   @default("GENERAL")
  tags           String[]  @default([])
  description    String?
  isArchived     Boolean   @default(false)
  officeId       String?
  office         Office?   @relation(fields: [officeId], references: [id])
  uploadedById   String?
  uploadedBy     User?     @relation(fields: [uploadedById], references: [id])
  linkedAssetId  String?
  linkedAsset    Asset?    @relation(fields: [linkedAssetId], references: [id])
  linkedTicketId String?
  ocrText        String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([officeId, category])
  @@index([createdAt(sort: Desc)])
}`;

content = content.replace(oldDoc, newDoc);

content = content.replace('  stocktakes         Stocktake[]\r', '  stocktakes         Stocktake[]\r\n  documents          Document[]\r');
content = content.replace('  stocktakes         Stocktake[]\n', '  stocktakes         Stocktake[]\n  documents          Document[]\n');

content = content.replace('  expenseClaims         ExpenseClaim[]    @relation("ExpenseEmployee")\r', '  expenseClaims         ExpenseClaim[]    @relation("ExpenseEmployee")\r\n  uploadedDocuments     Document[]\r');
content = content.replace('  expenseClaims         ExpenseClaim[]    @relation("ExpenseEmployee")\n', '  expenseClaims         ExpenseClaim[]    @relation("ExpenseEmployee")\n  uploadedDocuments     Document[]\n');

content = content.replace('  preventiveSchedules PreventiveSchedule[]\r', '  preventiveSchedules PreventiveSchedule[]\r\n  documents          Document[]\r');
content = content.replace('  preventiveSchedules PreventiveSchedule[]\n', '  preventiveSchedules PreventiveSchedule[]\n  documents          Document[]\n');

fs.writeFileSync('prisma/schema.prisma', content);
