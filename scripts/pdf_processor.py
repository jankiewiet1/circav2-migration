#!/usr/bin/env python3
"""
Advanced PDF Processing for Carbon Accounting
Uses pdfplumber, pytesseract, and other libraries for comprehensive document analysis
"""

import os
import sys
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import json
from datetime import datetime
import re

# PDF Processing Libraries
import pdfplumber
import pandas as pd
from PIL import Image
import pytesseract

# Additional PDF Libraries
try:
    import tabula
except ImportError:
    tabula = None
    
try:
    import camelot
except ImportError:
    camelot = None

# AI and Data Processing
import openai
from openai import OpenAI
import numpy as np
import requests
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AdvancedPDFProcessor:
    """
    Advanced PDF processor using multiple libraries for maximum extraction accuracy
    """
    
    def __init__(self, openai_api_key: Optional[str] = None):
        load_dotenv()
        self.openai_client = OpenAI(
            api_key=openai_api_key or os.getenv('OPENAI_API_KEY')
        )
        
        # Configure Tesseract path if needed (adjust for your system)
        # pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'  # Linux
        # pytesseract.pytesseract.tesseract_cmd = '/opt/homebrew/bin/tesseract'  # macOS with Homebrew
        
    def extract_text_with_pdfplumber(self, pdf_path: str) -> Dict[str, Any]:
        """
        Extract text and tables using pdfplumber (most reliable for digital PDFs)
        """
        logger.info(f"Processing PDF with pdfplumber: {pdf_path}")
        
        result = {
            'text': '',
            'tables': [],
            'metadata': {},
            'pages': []
        }
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                result['metadata'] = {
                    'total_pages': len(pdf.pages),
                    'title': pdf.metadata.get('Title', ''),
                    'author': pdf.metadata.get('Author', ''),
                    'creation_date': pdf.metadata.get('CreationDate', '')
                }
                
                for page_num, page in enumerate(pdf.pages):
                    page_data = {
                        'page_number': page_num + 1,
                        'text': '',
                        'tables': [],
                        'bbox': page.bbox
                    }
                    
                    # Extract text
                    page_text = page.extract_text() or ''
                    page_data['text'] = page_text
                    result['text'] += f"\n--- Page {page_num + 1} ---\n{page_text}"
                    
                    # Extract tables
                    try:
                        tables = page.extract_tables()
                        for table_num, table in enumerate(tables):
                            if table and len(table) > 1:  # Valid table with headers
                                df = pd.DataFrame(table[1:], columns=table[0])
                                table_dict = {
                                    'page': page_num + 1,
                                    'table_num': table_num + 1,
                                    'data': df.to_dict('records'),
                                    'headers': table[0]
                                }
                                page_data['tables'].append(table_dict)
                                result['tables'].append(table_dict)
                    except Exception as e:
                        logger.warning(f"Table extraction failed on page {page_num + 1}: {e}")
                    
                    result['pages'].append(page_data)
                    
        except Exception as e:
            logger.error(f"pdfplumber extraction failed: {e}")
            result['error'] = str(e)
            
        return result
    
    def extract_with_tabula(self, pdf_path: str) -> List[pd.DataFrame]:
        """
        Extract tables using tabula-py (alternative table extractor)
        """
        if not tabula:
            logger.warning("tabula-py not installed")
            return []
            
        logger.info(f"Processing PDF with tabula: {pdf_path}")
        
        try:
            # Extract all tables from all pages
            tables = tabula.read_pdf(pdf_path, pages='all', multiple_tables=True)
            logger.info(f"tabula extracted {len(tables)} tables")
            return tables
        except Exception as e:
            logger.error(f"tabula extraction failed: {e}")
            return []
    
    def extract_with_camelot(self, pdf_path: str) -> List[Dict]:
        """
        Extract tables using camelot (high-quality table extraction)
        """
        if not camelot:
            logger.warning("camelot-py not installed")
            return []
            
        logger.info(f"Processing PDF with camelot: {pdf_path}")
        
        try:
            # Extract tables with camelot
            tables = camelot.read_pdf(pdf_path, pages='all')
            
            result = []
            for i, table in enumerate(tables):
                result.append({
                    'table_num': i + 1,
                    'accuracy': table.parsing_report.get('accuracy', 0),
                    'whitespace': table.parsing_report.get('whitespace', 0),
                    'data': table.df.to_dict('records')
                })
            
            logger.info(f"camelot extracted {len(result)} tables")
            return result
        except Exception as e:
            logger.error(f"camelot extraction failed: {e}")
            return []
    
    def ocr_with_pytesseract(self, pdf_path: str) -> Dict[str, Any]:
        """
        OCR processing for scanned PDFs using pytesseract
        """
        logger.info(f"Processing PDF with OCR: {pdf_path}")
        
        result = {
            'text': '',
            'pages': [],
            'confidence': []
        }
        
        try:
            # Convert PDF pages to images and OCR them
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    try:
                        # Convert page to image
                        page_image = page.to_image(resolution=300)
                        pil_image = page_image.original
                        
                        # OCR with confidence data
                        ocr_data = pytesseract.image_to_data(
                            pil_image, 
                            output_type=pytesseract.Output.DICT,
                            config='--psm 6'  # Uniform text block
                        )
                        
                        # Extract text and confidence
                        page_text = pytesseract.image_to_string(pil_image, config='--psm 6')
                        
                        # Calculate average confidence
                        confidences = [int(conf) for conf in ocr_data['conf'] if int(conf) > 0]
                        avg_confidence = np.mean(confidences) if confidences else 0
                        
                        page_result = {
                            'page_number': page_num + 1,
                            'text': page_text,
                            'confidence': avg_confidence,
                            'word_count': len(page_text.split())
                        }
                        
                        result['pages'].append(page_result)
                        result['text'] += f"\n--- Page {page_num + 1} (OCR) ---\n{page_text}"
                        result['confidence'].append(avg_confidence)
                        
                    except Exception as e:
                        logger.error(f"OCR failed on page {page_num + 1}: {e}")
                        
        except Exception as e:
            logger.error(f"OCR processing failed: {e}")
            result['error'] = str(e)
            
        return result
    
    def classify_document_type(self, text: str, filename: str) -> str:
        """
        Classify document type based on content and filename
        """
        filename_lower = filename.lower()
        text_lower = text.lower()
        
        # Filename-based classification
        if any(word in filename_lower for word in ['fuel', 'gas', 'benzine', 'diesel']):
            return 'fuel_receipt'
        elif any(word in filename_lower for word in ['electric', 'energie', 'utility', 'strom']):
            return 'utility_bill'
        elif any(word in filename_lower for word in ['travel', 'flight', 'hotel', 'ticket']):
            return 'travel_expense'
        elif any(word in filename_lower for word in ['invoice', 'factuur', 'bill']):
            return 'purchase_invoice'
        
        # Content-based classification
        if any(word in text_lower for word in ['fuel', 'gasoline', 'diesel', 'petrol', 'pump']):
            return 'fuel_receipt'
        elif any(word in text_lower for word in ['kwh', 'electricity', 'energy', 'meter']):
            return 'utility_bill'
        elif any(word in text_lower for word in ['flight', 'airline', 'hotel', 'travel']):
            return 'travel_expense'
        else:
            return 'other'
    
    def extract_carbon_data_with_ai(self, text: str, tables: List[Dict], document_type: str) -> Dict[str, Any]:
        """
        Use OpenAI to extract structured carbon accounting data
        """
        logger.info("Processing extracted content with OpenAI")
        
        prompt = f"""
You are an expert in carbon accounting and emission data extraction. Analyze this {document_type} and extract ALL individual emission-relevant transactions.

DOCUMENT TYPE: {document_type}
TEXT CONTENT:
{text[:5000]}  # Limit to first 5000 chars

TABLES FOUND: {len(tables)} tables
TABLE DATA:
{json.dumps(tables[:3], indent=2) if tables else "No tables found"}

EXTRACTION RULES:
1. Extract EACH individual line item as a separate entry
2. Apply GHG Protocol Scope classification:
   - Scope 1: Direct emissions (fuel combustion, company vehicles, natural gas)
   - Scope 2: Indirect energy (purchased electricity, steam, heating/cooling)
   - Scope 3: Other indirect (business travel, purchased goods, waste)
3. Only include emission-relevant activities
4. Provide confidence scores (0.0-1.0) for each field

Return JSON format:
{{
  "document_type": "{document_type}",
  "extraction_confidence": 0.85,
  "entries": [
    {{
      "date": "YYYY-MM-DD",
      "activity_description": "Clear description",
      "quantity": numeric_value,
      "unit": "liters|kWh|m³|km|kg|etc",
      "supplier_vendor": "Company name",
      "cost": numeric_amount,
      "currency": "EUR|USD|etc",
      "invoice_id": "Reference number",
      "ghg_scope": "Scope 1|Scope 2|Scope 3",
      "confidence_score": 0.95,
      "notes": "Additional context"
    }}
  ],
  "warnings": ["Data quality concerns"],
  "suggestions": ["Recommendations"]
}}
"""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a carbon accounting expert specializing in emission data extraction."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info(f"AI extracted {len(result.get('entries', []))} entries")
            return result
            
        except Exception as e:
            logger.error(f"AI extraction failed: {e}")
            return {
                "document_type": document_type,
                "extraction_confidence": 0.0,
                "entries": [],
                "warnings": [f"AI processing failed: {str(e)}"],
                "suggestions": ["Manual review required"]
            }
    
    def process_pdf_comprehensive(self, pdf_path: str) -> Dict[str, Any]:
        """
        Comprehensive PDF processing using all available methods
        """
        logger.info(f"Starting comprehensive processing of: {pdf_path}")
        
        filename = Path(pdf_path).name
        
        # Method 1: pdfplumber (primary method for digital PDFs)
        pdfplumber_result = self.extract_text_with_pdfplumber(pdf_path)
        
        # Method 2: OCR for scanned documents (if pdfplumber finds little text)
        ocr_result = None
        text_length = len(pdfplumber_result.get('text', '').strip())
        if text_length < 100:  # Likely scanned document
            logger.info("Document appears scanned, using OCR")
            ocr_result = self.ocr_with_pytesseract(pdf_path)
        
        # Method 3: Alternative table extractors
        tabula_tables = self.extract_with_tabula(pdf_path)
        camelot_tables = self.extract_with_camelot(pdf_path)
        
        # Choose best text source
        primary_text = pdfplumber_result.get('text', '')
        if ocr_result and len(ocr_result.get('text', '')) > len(primary_text):
            primary_text = ocr_result.get('text', '')
            extraction_method = 'ocr'
        else:
            extraction_method = 'pdfplumber'
        
        # Combine all tables
        all_tables = pdfplumber_result.get('tables', [])
        if tabula_tables:
            for i, df in enumerate(tabula_tables):
                all_tables.append({
                    'source': 'tabula',
                    'table_num': i + 1,
                    'data': df.to_dict('records')
                })
        
        # Classify document
        document_type = self.classify_document_type(primary_text, filename)
        
        # AI processing
        ai_result = self.extract_carbon_data_with_ai(primary_text, all_tables, document_type)
        
        # Compile final result
        final_result = {
            'filename': filename,
            'processing_timestamp': datetime.now().isoformat(),
            'extraction_method': extraction_method,
            'document_type': document_type,
            'text_length': len(primary_text),
            'tables_found': len(all_tables),
            'processing_results': {
                'pdfplumber': pdfplumber_result,
                'ocr': ocr_result,
                'tabula_tables': len(tabula_tables),
                'camelot_tables': len(camelot_tables)
            },
            'carbon_data': ai_result,
            'summary': {
                'entries_extracted': len(ai_result.get('entries', [])),
                'confidence': ai_result.get('extraction_confidence', 0),
                'requires_review': ai_result.get('extraction_confidence', 0) < 0.8
            }
        }
        
        return final_result
    
    def batch_process_pdfs(self, pdf_paths: List[str], output_dir: str = "output") -> Dict[str, Any]:
        """
        Process multiple PDFs in batch
        """
        logger.info(f"Starting batch processing of {len(pdf_paths)} PDFs")
        
        os.makedirs(output_dir, exist_ok=True)
        
        results = []
        successful = 0
        failed = 0
        
        for i, pdf_path in enumerate(pdf_paths):
            logger.info(f"Processing {i+1}/{len(pdf_paths)}: {pdf_path}")
            
            try:
                result = self.process_pdf_comprehensive(pdf_path)
                results.append(result)
                
                # Save individual result
                output_file = os.path.join(
                    output_dir, 
                    f"{Path(pdf_path).stem}_processed.json"
                )
                with open(output_file, 'w') as f:
                    json.dump(result, f, indent=2)
                
                successful += 1
                
            except Exception as e:
                logger.error(f"Failed to process {pdf_path}: {e}")
                failed += 1
                results.append({
                    'filename': Path(pdf_path).name,
                    'error': str(e),
                    'processing_timestamp': datetime.now().isoformat()
                })
        
        # Create batch summary
        batch_summary = {
            'batch_id': f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'total_files': len(pdf_paths),
            'successful': successful,
            'failed': failed,
            'success_rate': successful / len(pdf_paths) if pdf_paths else 0,
            'processing_timestamp': datetime.now().isoformat(),
            'results': results
        }
        
        # Save batch summary
        summary_file = os.path.join(output_dir, "batch_summary.json")
        with open(summary_file, 'w') as f:
            json.dump(batch_summary, f, indent=2)
        
        logger.info(f"Batch processing complete: {successful} successful, {failed} failed")
        return batch_summary


def main():
    """
    Example usage of the AdvancedPDFProcessor
    """
    processor = AdvancedPDFProcessor()
    
    # Example: Process a single PDF
    pdf_path = "example.pdf"  # Replace with your PDF path
    
    if os.path.exists(pdf_path):
        result = processor.process_pdf_comprehensive(pdf_path)
        print(json.dumps(result, indent=2))
    else:
        print(f"PDF file not found: {pdf_path}")
        
        # Example: Batch processing
        pdf_directory = "pdfs/"  # Replace with your PDF directory
        if os.path.exists(pdf_directory):
            pdf_files = [
                os.path.join(pdf_directory, f) 
                for f in os.listdir(pdf_directory) 
                if f.lower().endswith('.pdf')
            ]
            
            if pdf_files:
                batch_result = processor.batch_process_pdfs(pdf_files)
                print(f"Batch processing complete. Results in: output/batch_summary.json")
            else:
                print(f"No PDF files found in {pdf_directory}")


if __name__ == "__main__":
    main() 