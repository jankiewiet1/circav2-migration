#!/bin/bash

# Installation script for PDF processing libraries
echo "🚀 Installing PDF processing libraries for carbon accounting..."

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    echo "📦 Activating virtual environment..."
    source .venv/bin/activate
fi

# Update pip
echo "📦 Updating pip..."
pip install --upgrade pip

# Install core PDF processing libraries
echo "📄 Installing core PDF libraries..."
pip install pdfplumber>=0.11.0
pip install pandas>=2.0.0

# Install OpenAI
echo "🤖 Installing OpenAI..."
pip install openai>=1.81.0

# Install OCR libraries
echo "👁️ Installing OCR libraries..."
pip install pytesseract>=0.3.10
pip install pillow>=10.0.0

# Install additional PDF processing tools
echo "🔧 Installing additional PDF tools..."
pip install tabula-py>=2.9.0

# Install camelot (requires additional system dependencies)
echo "🐪 Installing camelot..."
pip install camelot-py[cv]>=0.11.0

# Install data processing libraries
echo "📊 Installing data processing libraries..."
pip install numpy>=1.24.0
pip install matplotlib>=3.7.0
pip install seaborn>=0.12.0

# Install file processing libraries
echo "📁 Installing file processing libraries..."
pip install openpyxl>=3.1.0
pip install xlsxwriter>=3.1.0

# Install HTTP and API libraries
echo "🌐 Installing HTTP libraries..."
pip install requests>=2.31.0
pip install aiohttp>=3.8.0

# Install environment management
echo "⚙️ Installing environment tools..."
pip install python-dotenv>=1.0.0

echo "✅ Installation complete!"

# Check installations
echo "🔍 Checking installations..."
python -c "
import pdfplumber
import pandas as pd
import pytesseract
import openai
print('✅ Core libraries installed successfully!')
print(f'pdfplumber: {pdfplumber.__version__}')
print(f'pandas: {pd.__version__}')
print(f'openai: {openai.__version__}')
"

# Check optional libraries
echo "🔍 Checking optional libraries..."
python -c "
try:
    import tabula
    print(f'✅ tabula-py: {tabula.__version__}')
except ImportError:
    print('❌ tabula-py not available')

try:
    import camelot
    print(f'✅ camelot-py: {camelot.__version__}')
except ImportError:
    print('❌ camelot-py not available (requires cv2)')
"

echo ""
echo "🎉 PDF processing environment is ready!"
echo "📚 Usage: python scripts/pdf_processor.py"
echo "📖 Documentation: See scripts/pdf_processor.py for examples" 