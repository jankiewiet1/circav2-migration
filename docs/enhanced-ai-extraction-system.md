# Enhanced AI Data Extraction System

## 🚀 **Overview**

The Enhanced AI Data Extraction System uses a sophisticated multi-stage approach with GPT-4 to intelligently extract carbon accounting data from various file types including PDFs, invoices, utility bills, travel expenses, and ERP data.

## 🎯 **Key Improvements Over Standard CSV Upload**

### **1. Multi-Stage Processing Pipeline**
- **Stage 1**: Document Classification & Initial Extraction
- **Stage 2**: Data Validation & Enhancement  
- **Stage 3**: Application Format Conversion

### **2. Carbon Accounting Domain Expertise**
- Specialized prompts for emission data recognition
- GHG Protocol scope classification (Scope 1, 2, 3)
- Industry-specific document type handling

### **3. Confidence Scoring & Quality Assurance**
- Field-level confidence scoring (0.0-1.0)
- Automatic quality validation
- Smart review recommendations

### **4. Document Type Intelligence**
- **Utility Bills**: Energy consumption, meter readings, renewable certificates
- **Fuel Receipts**: Vehicle fuel, heating fuel, volume tracking
- **Travel Expenses**: Business travel, transportation modes, distances
- **Purchase Invoices**: Materials, equipment, services with emission impact

## 🔧 **Technical Architecture**

### **Backend Processing (Supabase Edge Functions)**
```typescript
// Enhanced GPT-4 prompts with carbon accounting expertise
const classificationPrompt = `
You are a specialized Carbon Accounting Document Classifier...

STAGE 1: DOCUMENT CLASSIFICATION
- utility_bill: Electricity, gas, water, heating bills
- fuel_receipt: Gasoline, diesel, fuel purchases  
- travel_expense: Business travel, flights, accommodation
- purchase_invoice: Materials, equipment, services

STAGE 2: CARBON DATA EXTRACTION
Extract ALL emission-related activities as separate entries...
`;
```

### **Frontend Integration (React Components)**
```typescript
// Enhanced processing with confidence indicators
const { data, error } = await AIDataProcessingService.processTextContent(
  content, 
  fileType, 
  companyId, 
  userId
);

// Automatic review flagging based on confidence
if (data.requires_user_review) {
  // Show detailed review interface
  setActiveTab('preview');
}
```

## 📊 **Confidence Scoring System**

### **Confidence Levels**
- **0.9-1.0**: Directly visible and clearly labeled data
- **0.7-0.8**: Data derived from context or calculations
- **0.5-0.6**: Data inferred from document patterns
- **0.3-0.4**: Data estimated from industry standards
- **0.0-0.2**: Data missing or highly uncertain

### **Review Triggers**
- Overall confidence < 0.8
- Any field confidence < 0.7
- Document classification uncertainty
- Missing required fields

## 🏗️ **Processing Workflow**

### **1. Document Upload**
```
User uploads → File validation → Storage → Processing pipeline
```

### **2. Stage 1: Classification & Extraction**
```
GPT-4 Analysis → Document type identification → Field extraction → Initial confidence scoring
```

### **3. Stage 2: Validation & Enhancement**
```
GHG Protocol validation → Unit verification → Data consistency checks → Description enhancement
```

### **4. Stage 3: Application Conversion**
```
Format mapping → Database preparation → Quality flags → User review determination
```

## 🎛️ **Enhanced Features**

### **Smart Document Recognition**
- Automatic document type classification
- Context-aware field extraction
- Multi-language support readiness
- OCR integration for scanned documents

### **Carbon Accounting Intelligence**
- GHG Protocol compliance checking
- Scope classification automation
- Emission factor reference linking
- Unit standardization

### **Quality Assurance**
- Real-time validation during extraction
- Consistency checking across entries
- Duplicate detection
- Data completeness scoring

### **User Experience**
- Progressive disclosure of complexity
- Confidence-based review workflows
- Smart correction suggestions
- Bulk processing capabilities

## 📋 **Supported Data Fields**

### **Required Fields**
- `date`: Activity/consumption date (ISO format)
- `activity_description`: Clear emission activity description
- `quantity`: Numeric consumption/usage amount
- `unit`: Measurement unit (kWh, liters, km, etc.)
- `ghg_category`: GHG Protocol scope classification

### **Optional Fields**
- `supplier_vendor`: Service provider name
- `cost`: Monetary amount
- `currency`: Currency code
- `invoice_id`: Reference number
- `notes`: Additional context

### **System Fields**
- `source_type`: Document origin type
- `ai_processed`: AI processing flag
- `ai_confidence`: Overall confidence score
- `ai_notes`: Processing metadata

## 🔐 **Security & Privacy**

### **Data Protection**
- All processing in secure Supabase environment
- OpenAI API calls encrypted in transit
- No data retention in AI models
- Audit trail for all extractions

### **Access Control**
- Company-scoped data isolation
- User authentication required
- Role-based processing permissions
- Secure file storage

## 🧪 **Testing & Validation**

### **Supported Test Cases**
1. **Utility Bills**: Multi-meter readings, time-of-use rates
2. **Fuel Receipts**: Fleet management, various fuel types
3. **Travel Documents**: Flight itineraries, hotel bills, car rentals
4. **Purchase Orders**: Equipment, materials, services
5. **ERP Extracts**: SAP, Oracle, QuickBooks data

### **Quality Metrics**
- Extraction accuracy: >95% for high-confidence fields
- Classification accuracy: >90% for document types  
- Processing speed: <30 seconds per document
- User review rate: <20% for standard documents

## 🚀 **Usage Examples**

### **1. Utility Bill Processing**
```
Input: Monthly electricity bill PDF
Output: 
- Date: 2024-01-15
- Activity: "Electricity consumption - Office building"
- Quantity: 2450.5
- Unit: "kWh"
- GHG Category: "Scope 2"
- Confidence: 0.92
```

### **2. Travel Expense Processing**
```
Input: Flight booking confirmation
Output:
- Date: 2024-02-20
- Activity: "Business flight - Amsterdam to London"
- Quantity: 372
- Unit: "km"
- GHG Category: "Scope 3"
- Confidence: 0.85
```

### **3. Fuel Receipt Processing**
```
Input: Gas station receipt image
Output:
- Date: 2024-01-10
- Activity: "Diesel fuel purchase - Company vehicle"
- Quantity: 45.2
- Unit: "liters"
- GHG Category: "Scope 1"
- Confidence: 0.94
```

## 🛠️ **Implementation Guide**

### **1. Enable Enhanced Processing**
```typescript
// In your upload component
const result = await AIDataProcessingService.processTextContent(
  fileContent,
  fileType,
  companyId,
  userId
);
```

### **2. Handle Results**
```typescript
if (result.requires_user_review) {
  // Show review interface with confidence indicators
  showReviewPanel(result.extracted_data, result.ambiguous_fields);
} else {
  // Auto-save high-confidence extractions
  await DataEntryService.createDataEntries(result.extracted_data);
}
```

### **3. Display Confidence**
```tsx
{result.extracted_data.map(entry => (
  <div className={`entry ${entry.ai_confidence < 0.7 ? 'needs-review' : 'validated'}`}>
    <span className="confidence">{(entry.ai_confidence * 100).toFixed(0)}%</span>
    <span className="data">{entry.activity_description}</span>
  </div>
))}
```

## 🔮 **Future Enhancements**

### **Planned Features**
1. **Learning System**: User corrections improve future accuracy
2. **Template Recognition**: Company-specific document patterns
3. **Batch Processing**: Handle multiple files simultaneously
4. **API Integration**: Direct ERP/accounting system connections
5. **Mobile OCR**: Smartphone document capture

### **Advanced Capabilities**
- Fine-tuned models for specific industries
- Multi-language document processing
- Real-time processing for live data feeds
- Integration with emission calculation engines
- Automated compliance reporting

## 📞 **Support & Troubleshooting**

### **Common Issues**
- **Low confidence scores**: Improve document quality, ensure clear text
- **Wrong classifications**: Provide document context, use manual override
- **Missing fields**: Check document completeness, add manual entries

### **Contact**
For technical support or feature requests:
- Email: info@circa.site
- Documentation: [Link to full docs]
- GitHub Issues: [Link to repository]

---

*This enhanced AI system represents a significant advancement in automated carbon accounting data processing, combining cutting-edge AI technology with deep domain expertise to streamline sustainability reporting.* 