# ERP/API Integration Guide

## Overview

The ERP/API Integration feature allows you to automatically connect your Carbon Data Agent to various business systems and import emission-relevant data. This eliminates manual data entry and ensures comprehensive carbon accounting coverage.

## Supported Systems

### Enterprise Resource Planning (ERP)
- **SAP** - Connect to SAP ERP for invoices, purchase orders, and expense data
- **Odoo** - Comprehensive business data integration
- **Microsoft Dynamics 365** - Financial and operational data

### Customer Relationship Management (CRM)
- **HubSpot** - Travel, deals, and business activity data

### Accounting Systems
- **QuickBooks Online** - Expense tracking and financial data
- **Xero** - Expense and invoice data

## How It Works

1. **Connect**: Securely connect to your business systems using API credentials
2. **Extract**: Automatically extract emission-relevant data (invoices, expenses, travel, utilities)
3. **Process**: AI-powered classification and carbon accounting categorization using GPT-4
4. **Import**: Seamlessly import processed data into your carbon accounting database

## Getting Started

### Step 1: Navigate to ERP/API Integration

1. Go to **Data Upload** page
2. Click on the **ERP/API** tab
3. You'll see three sub-tabs:
   - **Connect Systems**: Add new integrations
   - **Manage Connections**: View and manage existing connections
   - **Sync Data**: Import data from connected systems

### Step 2: Connect Your First System

#### HubSpot Integration (Recommended for beginners)

1. **Get HubSpot Access Token**:
   - Log into your HubSpot account
   - Go to Settings → Integrations → Private Apps
   - Create a new private app with CRM read permissions
   - Copy the access token

2. **Connect in Carbon Data Agent**:
   - Select **HubSpot** from available systems
   - Enter your access token
   - Optionally enter your Portal ID
   - Click **Connect**

#### SAP Integration

1. **Prerequisites**:
   - SAP server URL (e.g., `https://your-sap-server.com`)
   - Client ID (e.g., `100`)
   - Username and password
   - Language preference

2. **Connect**:
   - Select **SAP** from available systems
   - Fill in all required fields
   - Click **Connect**

#### Odoo Integration

1. **Prerequisites**:
   - Odoo server URL (e.g., `https://your-odoo.com`)
   - Database name
   - Username and password

2. **Connect**:
   - Select **Odoo** from available systems
   - Enter your credentials
   - Click **Connect**

### Step 3: Sync Data

1. Go to the **Sync Data** tab
2. Click **Sync Now** for any connected system
3. The system will:
   - Extract relevant business data
   - Process it with AI for carbon accounting
   - Import emission entries automatically

## Data Types Extracted

### From ERP Systems (SAP, Odoo, Dynamics)
- **Invoices**: Utility bills, fuel purchases, material costs
- **Purchase Orders**: Equipment, materials, services
- **Expense Reports**: Travel, fuel, accommodation
- **Vendor Payments**: Energy suppliers, transport companies

### From CRM Systems (HubSpot)
- **Deals**: Travel-related deals, equipment purchases
- **Activities**: Business travel logs, client visits
- **Notes**: Emission-relevant business activities

### From Accounting Systems (QuickBooks, Xero)
- **Expenses**: All business expenses categorized for emissions
- **Bills**: Utility bills, fuel costs, service charges
- **Purchases**: Materials, equipment, services

## AI Processing

The system uses GPT-4 to intelligently process extracted data:

1. **Classification**: Automatically categorizes data into Scope 1, 2, or 3 emissions
2. **Extraction**: Identifies quantities, units, dates, and suppliers
3. **Validation**: Ensures data quality and completeness
4. **Mapping**: Maps business data to carbon accounting standards

### Example Processing

**Raw ERP Data**:
```json
{
  "description": "Office electricity bill",
  "amount": 450.50,
  "currency": "EUR",
  "vendor": "Green Energy Corp",
  "date": "2025-01-15"
}
```

**Processed Carbon Data**:
```json
{
  "date": "2025-01-15",
  "activity_description": "Electricity consumption - Office",
  "quantity": 2500,
  "unit": "kWh",
  "ghg_category": "Scope 2",
  "supplier_vendor": "Green Energy Corp",
  "cost": 450.50,
  "currency": "EUR",
  "confidence": 0.9
}
```

## Security & Privacy

### Data Security
- All credentials are encrypted and stored securely
- API connections use industry-standard authentication (OAuth2, API keys)
- Data transmission is encrypted (HTTPS/TLS)
- No sensitive business data is permanently stored

### Access Control
- Only emission-relevant data is extracted
- Minimal permissions required (read-only access)
- Regular security audits and compliance checks

### Privacy Compliance
- GDPR compliant data handling
- Data minimization principles
- Right to deletion and data portability

## Troubleshooting

### Connection Issues

**"Invalid credentials" error**:
- Double-check all required fields
- Verify API permissions in your source system
- Ensure URLs are correct and accessible

**"Connection timeout" error**:
- Check your network connectivity
- Verify firewall settings
- Ensure the source system is online

### Sync Issues

**"No data found" result**:
- Check date range settings
- Verify data exists in source system
- Review API permissions

**"Processing failed" error**:
- Check OpenAI API configuration
- Review extracted data format
- Contact support if issue persists

## API Reference

### Connection Testing
```typescript
POST /functions/v1/erp-integration
{
  "operation": "test_connection",
  "system_type": "hubspot",
  "credentials": {
    "access_token": "your-token"
  }
}
```

### Data Synchronization
```typescript
POST /functions/v1/erp-integration
{
  "operation": "sync_data",
  "connection_id": "connection-uuid",
  "sync_options": {
    "date_from": "2025-01-01",
    "date_to": "2025-01-31"
  }
}
```

## Best Practices

### Setup
1. **Start Small**: Begin with one system (HubSpot recommended)
2. **Test Connection**: Always test before saving credentials
3. **Regular Syncs**: Set up regular data synchronization schedules

### Data Quality
1. **Review Results**: Check imported data for accuracy
2. **Adjust Mappings**: Fine-tune AI processing if needed
3. **Monitor Confidence**: Pay attention to confidence scores

### Security
1. **Minimal Permissions**: Grant only necessary API permissions
2. **Regular Reviews**: Periodically review connected systems
3. **Credential Rotation**: Update API keys regularly

## Support

### Getting Help
- **Documentation**: Comprehensive guides and examples
- **Support Team**: Technical assistance for complex integrations
- **Community**: User forums and best practices sharing

### Custom Integrations
For systems not currently supported, we offer:
- Custom API development
- Dedicated integration consulting
- Enterprise-grade solutions

## Roadmap

### Coming Soon
- **NetSuite** integration
- **Salesforce** CRM integration
- **Oracle ERP** support
- **Automated scheduling** for regular syncs
- **Advanced filtering** and data mapping options

### Enterprise Features
- **Webhook support** for real-time data sync
- **Custom field mapping**
- **Advanced security controls**
- **Audit logging and compliance reporting** 