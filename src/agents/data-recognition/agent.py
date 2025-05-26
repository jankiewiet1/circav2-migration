"""
Carbon Data Recognition Agent

This agent is responsible for processing uploaded files,
extracting data related to carbon emissions, and mapping
that data to our standard schema.

Now updated to use the Model Context Protocol (MCP).
"""

import os
import json
import requests
from typing import Dict, List, Any, Optional
from datetime import datetime

from openai_agents import Agent, Tool, Message
from openai_agents.tools import file_search
from openai_agents.mcp import MCPContext, MCPAction

# Initialize the agent with the most capable model
data_recognition_agent = Agent(
    name="CarbonDataRecognitionAgent",
    model="gpt-4o-mini",  # Using GPT-4o-mini for balance between capability and cost
    instructions="""
    You are a Carbon Data Recognition Agent specialized in extracting and structuring data from various file formats.
    
    Your main tasks are:
    1. Process uploaded files (PDF, Excel, CSV, images)
    2. Extract all relevant information related to carbon emissions and energy usage
    3. Map the data to our carbon accounting schema
    4. Validate and normalize the extracted data
    5. Return structured JSON output for carbon calculations
    
    Always focus on extracting the following key fields:
    - date: When the activity occurred (ISO format)
    - type: Type of energy/activity (electricity, gas, fuel, etc.)
    - region: Geographic region or location
    - amount: Numeric value of consumption or emissions
    - amount_unit: Unit of measurement (kWh, liters, kg, etc.)
    - year: Year of the activity
    - supplier: Name of supplier or vendor
    - energy_source: Source of energy (renewable, fossil, etc.)
    - connection_type: Type of connection or delivery
    - loss_factor: Any loss factors mentioned
    - recs: Renewable Energy Certificates information
    - invoice_id: Invoice or reference number
    - description: Additional context or description
    
    For any missing fields, use 'unknown' as the value.
    
    You have access to the Model Context Protocol (MCP) which provides additional context
    about the carbon accounting platform and company data.
    """
)

# MCP Context handler
class CarbonMCPContext(MCPContext):
    """MCP Context provider for carbon accounting data"""
    
    def __init__(self, company_id: str, api_base_url: str = "http://localhost:3000"):
        self.company_id = company_id
        self.api_base_url = api_base_url
        self._context_data = None
    
    async def fetch_context(self) -> Dict[str, Any]:
        """Fetch MCP context from the API"""
        if self._context_data:
            return self._context_data
            
        try:
            url = f"{self.api_base_url}/api/mcp-context?companyId={self.company_id}"
            response = requests.get(url)
            response.raise_for_status()
            self._context_data = response.json()
            return self._context_data
        except Exception as e:
            print(f"Error fetching MCP context: {e}")
            # Return minimal context if API call fails
            return {
                "version": "1.0",
                "timestamp": datetime.now().isoformat(),
                "company": {"id": self.company_id, "name": "Unknown Company"},
                "carbonData": {"entries": [], "summary": {"totalEmissions": {"total": 0}}},
                "user": {"id": "unknown", "role": "user"}
            }

# Register MCP context with the agent
@data_recognition_agent.mcp_context_provider
def get_mcp_context(company_id: str) -> MCPContext:
    """Provide MCP context to the agent"""
    return CarbonMCPContext(company_id)

@data_recognition_agent.tool
def detect_file_type(file_path: str) -> Dict[str, Any]:
    """
    Detect the file type and return metadata about the file.
    
    Args:
        file_path: Path to the uploaded file
        
    Returns:
        Dict containing file type information and metadata
    """
    file_extension = os.path.splitext(file_path)[1].lower()
    
    file_types = {
        '.pdf': {'type': 'pdf', 'name': 'PDF Document'},
        '.xlsx': {'type': 'excel', 'name': 'Excel Spreadsheet'},
        '.xls': {'type': 'excel', 'name': 'Excel Spreadsheet'},
        '.csv': {'type': 'csv', 'name': 'CSV File'},
        '.jpg': {'type': 'image', 'name': 'JPEG Image'},
        '.jpeg': {'type': 'image', 'name': 'JPEG Image'},
        '.png': {'type': 'image', 'name': 'PNG Image'},
        '.txt': {'type': 'text', 'name': 'Text Document'},
    }
    
    file_info = file_types.get(file_extension, {'type': 'unknown', 'name': 'Unknown File Type'})
    file_info['extension'] = file_extension
    file_info['path'] = file_path
    file_info['filename'] = os.path.basename(file_path)
    
    return file_info

@data_recognition_agent.tool
def extract_text_from_file(file_path: str) -> Dict[str, Any]:
    """
    Extract text content from a file.
    
    Args:
        file_path: Path to the uploaded file
        
    Returns:
        Dict containing extracted text content
    """
    # This would normally use libraries like PyPDF2, pandas, pytesseract, etc.
    # For now, we'll return a placeholder response
    file_type = detect_file_type(file_path)
    
    return {
        "file_type": file_type["type"],
        "file_path": file_path,
        "text_content": f"Extracted content from {file_path}",
        "extraction_method": "placeholder",
        "timestamp": datetime.now().isoformat()
    }

@data_recognition_agent.tool
def map_to_carbon_schema(extracted_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map extracted data to our standard carbon accounting schema.
    
    Args:
        extracted_data: Dict containing extracted text and metadata
        
    Returns:
        Dict containing mapped data in our standard schema
    """
    # In a real implementation, this would parse the extracted_data and map
    # to our schema using patterns, entity recognition, etc.
    
    # Return a template for the expected schema
    return {
        "mapped_data": {
            "date": "YYYY-MM-DD",
            "type": "electricity",
            "region": "country/region",
            "amount": 0.0,
            "amount_unit": "kWh",
            "year": datetime.now().year,
            "supplier": "supplier name",
            "energy_source": "renewable/fossil/mixed",
            "connection_type": "grid/direct",
            "loss_factor": 0.0,
            "recs": "yes/no/unknown",
            "invoice_id": "reference number",
            "description": "Additional context"
        },
        "confidence": 0.85,
        "original_file": extracted_data.get("file_path", "unknown"),
        "requires_review": True
    }

@data_recognition_agent.tool
def validate_mapped_data(mapped_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate the mapped data for completeness and correctness.
    
    Args:
        mapped_data: Dict containing data mapped to our schema
        
    Returns:
        Dict containing validation results
    """
    # This would check for required fields, data types, etc.
    # For now, we'll return a simple validation response
    
    data = mapped_data.get("mapped_data", {})
    missing_fields = []
    
    required_fields = ["date", "type", "amount", "amount_unit"]
    for field in required_fields:
        if not data.get(field) or data.get(field) == "unknown":
            missing_fields.append(field)
    
    return {
        "is_valid": len(missing_fields) == 0,
        "missing_fields": missing_fields,
        "warnings": [],
        "mapped_data": mapped_data
    }

# Register MCP actions
@data_recognition_agent.mcp_action("extractDataFromDocument")
async def extract_data_from_document(document_url: str, document_type: str, extraction_hints: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    MCP Action: Extract carbon data from a document
    
    Args:
        document_url: URL to the document
        document_type: Type of document (PDF, EXCEL, CSV, IMAGE)
        extraction_hints: Optional hints for extraction
        
    Returns:
        Dict containing extracted data entries
    """
    try:
        # In a real implementation, download the document from the URL
        # and process it using the appropriate method
        
        # For now, return a placeholder response
        return {
            "success": True,
            "extractedEntries": [
                {
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "type": "electricity",
                    "amount": 1250.0,
                    "amount_unit": "kWh",
                    "supplier": "Example Energy Co.",
                    "description": "Monthly electricity consumption"
                }
            ],
            "confidence": 0.9,
            "unmappedFields": [],
            "warnings": []
        }
    except Exception as e:
        return {
            "success": False,
            "extractedEntries": [],
            "confidence": 0.0,
            "unmappedFields": [],
            "warnings": [str(e)]
        }

@data_recognition_agent.mcp_action("validateDataEntry")
async def validate_data_entry(data_entry_id: str, validation: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    MCP Action: Validate a data entry
    
    Args:
        data_entry_id: ID of the data entry to validate
        validation: List of field validations
        
    Returns:
        Dict containing validation results
    """
    # In a real implementation, this would validate the data entry
    # against business rules and data quality standards
    
    # For now, return a placeholder response
    return {
        "valid": True,
        "dataEntryId": data_entry_id,
        "errors": [],
        "warnings": []
    }

def process_file(file_path: str, company_id: str = None) -> Dict[str, Any]:
    """
    Process a file and extract carbon accounting data.
    
    Args:
        file_path: Path to the uploaded file
        company_id: Optional company ID for MCP context
        
    Returns:
        Dict containing processed data in our standard schema
    """
    # This function would be called from the API endpoint
    file_type = detect_file_type(file_path)
    extracted_data = extract_text_from_file(file_path)
    mapped_data = map_to_carbon_schema(extracted_data)
    validated_data = validate_mapped_data(mapped_data)
    
    # If company_id is provided, we could use MCP context to enhance processing
    # This would be implemented in a real system
    
    return {
        "success": validated_data["is_valid"],
        "data": validated_data["mapped_data"],
        "file_info": file_type,
        "missing_fields": validated_data["missing_fields"],
        "requires_review": len(validated_data["missing_fields"]) > 0,
        "warnings": validated_data["warnings"],
        "processed_at": datetime.now().isoformat()
    }

if __name__ == "__main__":
    # For testing purposes
    test_file = "example.pdf"
    result = process_file(test_file, company_id="test-company-id")
    print(json.dumps(result, indent=2)) 