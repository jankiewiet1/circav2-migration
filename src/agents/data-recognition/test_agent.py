"""
Test script for the Carbon Data Recognition Agent.

This script tests the agent's functionality on sample files.
"""

import os
import json
import sys
from dotenv import load_dotenv
from agent import process_file

# Load environment variables from .env file
load_dotenv()

def test_agent():
    """
    Test the Carbon Data Recognition Agent with sample files.
    """
    # Check if OpenAI API key is set
    if not os.environ.get("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY environment variable is not set.")
        print("Please set your OpenAI API key and try again.")
        sys.exit(1)
    
    print("Carbon Data Recognition Agent Test")
    print("=================================")
    
    # Get the test file path from command line arguments or use default
    if len(sys.argv) > 1:
        test_file = sys.argv[1]
    else:
        # Use default test file if none provided
        test_file = "example.pdf"
        print(f"No test file provided. Using default: {test_file}")
    
    # Check if the file exists
    if not os.path.isfile(test_file):
        print(f"Error: File '{test_file}' does not exist.")
        print("Please provide a valid file path.")
        sys.exit(1)
    
    print(f"Processing file: {test_file}")
    
    try:
        # Process the file with the agent
        result = process_file(test_file)
        
        # Pretty-print the result
        print("\nResult:")
        print(json.dumps(result, indent=2))
        
        # Check if the processing was successful
        if result.get("success"):
            print("\n✅ File processed successfully!")
            
            # Print the extracted data
            print("\nExtracted Data:")
            data = result.get("data", {}).get("mapped_data", {})
            for key, value in data.items():
                print(f"  {key}: {value}")
            
            # Check for missing fields
            missing = result.get("missing_fields", [])
            if missing:
                print("\n⚠️ Missing Fields:")
                for field in missing:
                    print(f"  - {field}")
        else:
            print("\n❌ File processing failed.")
    
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_agent() 