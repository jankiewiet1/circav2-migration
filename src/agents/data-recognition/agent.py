"""
Carbon Data Recognition Agent

This agent is responsible for processing uploaded files,
extracting data related to carbon emissions, and mapping
that data to our standard schema.
"""

import os
import json
from typing import Dict, List, Any, Optional
from datetime import datetime

from openai_agents import Agent, Tool, Message
from openai_agents.tools import file_search

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
    """
)

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

def process_file(file_path: str) -> Dict[str, Any]:
    """
    Process a file and extract carbon accounting data.
    
    Args:
        file_path: Path to the uploaded file
        
    Returns:
        Dict containing processed data in our standard schema
    """
    # This function would be called from the API endpoint
    file_type = detect_file_type(file_path)
    extracted_data = extract_text_from_file(file_path)
    mapped_data = map_to_carbon_schema(extracted_data)
    validated_data = validate_mapped_data(mapped_data)
    
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
    result = process_file(test_file)
    print(json.dumps(result, indent=2)) 