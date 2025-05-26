# AI-Powered Carbon Data Agent Roadmap

## Step-by-Step Roadmap for an AI-Powered Carbon Data Agent

### 1. Define the Data Entry Table Schema
**Goal:** Create a standardized table to store all cleaned carbon accounting data.

**Headers should include (minimally):**
- Date
- Source Type (e.g., invoice, utility bill, ERP, API, manual entry)
- Supplier/Vendor
- Activity Description (e.g., "Diesel Fuel Purchase", "Electricity Usage")
- Quantity
- Unit (e.g., kWh, liters, km)
- Currency (if relevant)
- Cost (if relevant)
- GHG Category (Scope 1, 2, 3)
- Emission Factor Reference (optional)
- User ID/Org ID (for multi-tenancy)
- Status (raw, processed, validated, error)
- Any custom notes/tags

**Agent Task:** Generate and migrate this schema in the database (e.g., PostgreSQL, MySQL, or NoSQL if preferred).

### 2. Design the User Interface Flow
**Goal:** Build a seamless chat-like or step-by-step UI for users to submit data.

**Steps:**
- Display "Connect Data Source or Upload Data" options:
  - "Connect ERP/Accounting System" (OAuth, API)
  - "Upload Files" (CSV, Excel, PDF, Images)
  - "Manual Entry"
- Show drag-and-drop/upload area
- Show progress and chat/feedback window (for clarifications)
- Display extracted data preview table with mapping/highlighted issues

**Agent Task:** Implement this flow in the frontend (React/Next.js suggested), with APIs to backend.

### 3. Implement Data Ingestion & Recognition Pipeline
#### A. System Connections
- Use 3rd-party connectors like Merge.dev, Codat, or direct APIs for ERP/accounting/utilities
- **Agent:** Set up OAuth flow, handle credentials securely, and fetch raw data in standardized JSON/CSV

#### B. File Uploads
- Allow CSV, XLSX, PDF, images (JPEG/PNG) as inputs
- **Agent:** For PDFs/images, use OCR (e.g., AWS Textract, Azure Form Recognizer)
- For Excel/CSV, use Pandas or similar to parse data

#### C. Email Ingestion (Optional)
- Allow forwarding emails with attachments to a unique address
- **Agent:** Parse attachments, same as above

### 4. Data Parsing & AI Recognition
#### A. Table Extraction
**Agent:** Use GPT4 to:
- Detect and extract tables from any format (including OCR output, PDF tables, messy CSVs)
- Map columns (e.g., "Volume" → "Quantity"; "Fuel Type" → "Activity Description")

#### B. Header Normalization
**Agent:** Compare input headers to standardized schema, auto-map as much as possible.
- If ambiguous, ask the user for clarification in chat: "I see a column 'UOM'. Does this mean 'Unit of Measure'?"

#### C. Data Type Cleaning
- Convert all dates to ISO 8601
- Standardize units (e.g., convert "ton" vs "tonne" vs "t")
- Remove duplicate rows
- Flag missing or suspicious data

### 5. Data Validation & User Confirmation
**Agent:** Present the cleaned, structured data in a preview table.

Highlight:
- Mapped columns (green)
- Unmapped/uncertain columns (yellow)
- Errors/outliers (red)

Allow user to edit/fix mappings or entries in the UI.
Confirm user approval before saving.

### 6. Saving Data to Database
After user approval, save the cleaned table to the database under the defined schema.

**Agent:**
- Ensure proper linkage to user/organization, and audit log the data ingestion process
- Mark status as "processed" and "validated" as appropriate

### 7. Ongoing Data Sync (for API Connections)
If connected to live systems, schedule regular syncs (daily/weekly) to check for new data.

**Agent:** Only ingest new/changed records to avoid duplication.

### 8. Error Handling & Support
**Agent:** If there are unrecoverable errors (e.g., unreadable files, unsupported format):
- Inform user in chat window
- Provide instructions or request for additional info
- Log errors for support team review

### 9. Security & Privacy
- Encrypt all data in transit and at rest
- Only store necessary data—mask/delete sensitive info if not needed
- Ensure user authentication and authorization for data access

### 10. Testing & QA
- Test the entire pipeline with a variety of real-world data files (utility bills, fuel receipts, CSVs from SAP, PDFs, etc.)
- Validate AI mapping accuracy and user clarification UX
- Run edge-case and security tests

### 11. Documentation & Feedback Loop
- Provide clear in-app tooltips and help articles for users
- Log user edits/mappings to improve AI accuracy over time
- Allow users to give feedback on data recognition results

## Agent Implementation Checklist (Summary Table)

| Step | Task | Agent Instructions |
|------|------|-------------------|
| 1. Schema | Create/validate database table with standard headers | Use migration tools/scripts |
| 2. UI | Build frontend chat/upload interface | Implement in React/Next.js |
| 3. Ingestion | Integrate API/file/email collection & parsing | Use connectors, OCR, file parsers |
| 4. Recognition | AI extract/map headers, normalize data | Use GPT 4 + fallback logic |
| 5. Validation | Preview table, highlight issues, allow user edits | Show in UI, await user approval |
| 6. Save | Store structured/approved data in DB | Link to user/org, status logging |
| 7. Sync | Automate recurring data collection (for live connections) | Schedule with background jobs |
| 8. Errors | Handle/communicate errors, log for support | Chat updates, error tracking |
| 9. Security | Encrypt, authenticate, log access | Use platform best practices |
| 10. QA | Test with real/edge-case data | Regression and user testing |
| 11. Docs | Provide in-app guides, collect feedback | Documentation + feedback forms |

## Tips for GPT 4 Agent Mode:
- Use the latest function calling capabilities to trigger backend processes (e.g., file parsing, data saving)
- Use the chat interface to ask smart clarifying questions and confirm actions with users
- Log all decisions/actions for auditability and iterative improvement

## Result:
Any data (from file, ERP, or email) is automatically processed, mapped, and structured, with user confirmation, and saved ready for carbon accounting calculations.

## Progress Tracking
- [x] 1. Data Schema Definition
- [x] 2. UI Flow Implementation
- [x] 3. Data Ingestion Pipeline
- [x] 4. AI Recognition System
- [x] 5. Validation Interface
- [x] 6. Database Integration
- [x] 7. Scheduled Sync Setup
- [x] 8. Error Handling System
- [x] 9. Security Implementation
- [x] 10. Testing Phase
- [x] 11. Documentation 