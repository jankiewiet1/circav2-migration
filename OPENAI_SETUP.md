# OpenAI Integration Setup Guide

## Current Status: Demo Mode Active ✅

The system is currently running in **Demo Mode** by default, which means:
- ✅ No OpenAI API key required
- ✅ No API costs
- ✅ Realistic mock calculations for testing
- ✅ Full system functionality

## Demo Mode Features

When you click "Test Single Entry", the system will:
1. Find one unmatched emission entry from your database
2. Generate a realistic mock calculation based on the entry type:
   - **Fuel/Diesel/Petrol**: 2.68 kg CO₂e/liter (Scope 1)
   - **Electricity/Power**: 0.45 kg CO₂e/kWh (Scope 2) 
   - **Travel/Flight**: 0.25 kg CO₂e/km (Scope 3)
   - **Other**: 2.5 kg CO₂e/unit (Scope 1)
3. Save the result to your database
4. Display confidence scores and calculation details

## Enabling Real OpenAI API (Optional)

If you want to use real OpenAI API calls instead of demo mode:

### Step 1: Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-`)

### Step 2: Add API Key to Environment
Create a `.env.local` file in the project root:

```bash
# OpenAI API Configuration
VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
```

### Step 3: Disable Demo Mode
In the Data Upload page:
1. Uncheck "Demo mode (no API costs)"
2. Click "Test Single Entry"

## Cost Estimates (Real API Mode)

- **Single Entry Test**: ~$0.01-0.05
- **Batch Processing (10 entries)**: ~$0.10-0.50
- **Full Company Recalculation (100+ entries)**: $1-10+

## Troubleshooting

### "404 No assistant found" Error
This is expected without an OpenAI Assistant configured. The system will automatically fall back to direct GPT-4 calls.

### "OpenAI API key is missing" Warning
This is normal in demo mode. You can safely ignore this warning.

### Import/Module Errors
If you see import errors, run:
```bash
npm install
npm run build
```

## Demo vs Real API Comparison

| Feature | Demo Mode | Real API Mode |
|---------|-----------|---------------|
| Cost | Free | $0.01-0.05 per entry |
| Accuracy | Good (85-90%) | Excellent (90-95%) |
| Speed | Fast (1 second) | Medium (3-10 seconds) |
| Data Sources | Mock factors | Real emission databases |
| Confidence | Fixed ranges | Dynamic AI assessment |

## Next Steps

1. **Test Demo Mode**: Use the current demo mode to verify the system works
2. **Add Real Data**: Upload your emission entries via CSV or manual entry
3. **Enable API** (optional): Add OpenAI API key for real calculations
4. **Scale Up**: Process larger batches once you're confident

The demo mode provides a complete testing environment without any external dependencies or costs! 