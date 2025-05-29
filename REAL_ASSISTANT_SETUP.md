# Real OpenAI Assistant Setup Guide

## 🎯 Goal: Replace Demo Mode with Real OpenAI Assistant

Currently your system is running in **Demo Mode**. This guide will help you set up a **real OpenAI Assistant** for actual carbon accounting calculations.

## Step 1: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. **Important**: Add some credits to your OpenAI account (minimum $5-10 recommended)

## Step 2: Set Environment Variable

Create a `.env.local` file in your project root:

```bash
# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
```

## Step 3: Create the Assistant

Run the assistant creation script:

```bash
# Set your API key for the script
export OPENAI_API_KEY=sk-your-actual-api-key-here

# Create the assistant
npm run create-assistant
```

You should see output like:
```
🔑 OpenAI API key found: sk-proj-abc...
🚀 Creating OpenAI Assistant for Carbon Accounting...
✅ Assistant created successfully!
📋 Assistant Details:
   ID: asst_abc123xyz
   Name: Carbon Accounting Expert
   Model: gpt-4o
   Tools: 3 functions
💾 Assistant configuration saved to: assistant-config.json

🔧 Next Steps:
1. Add this to your .env.local file:
   VITE_OPENAI_ASSISTANT_ID=asst_abc123xyz
   VITE_OPENAI_API_KEY=sk-your-key...
2. Restart your development server
3. Uncheck "Demo mode" in the Data Upload page
4. Test the real assistant!
```

## Step 4: Update Environment Variables

Add the assistant ID to your `.env.local` file:

```bash
# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
VITE_OPENAI_ASSISTANT_ID=asst_abc123xyz
```

## Step 5: Restart and Test

1. **Restart your development server**:
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

2. **Go to Data Upload page** in your browser

3. **Uncheck "Demo mode (no API costs)"**

4. **Click "Test Single Entry"**

You should now see real OpenAI Assistant calculations!

## What You Get with Real Assistant

### ✅ Real AI Calculations
- **Accurate emission factors** from authoritative sources
- **Dynamic scope classification** (1, 2, 3)
- **Confidence scoring** based on data quality
- **Source attribution** for transparency

### ✅ Advanced Features
- **Context awareness** - understands your specific industry
- **Data validation** - flags unusual values
- **Unit conversions** - handles different measurement units
- **Methodology guidance** - explains calculations

### ✅ Professional Results
- **GHG Protocol compliance**
- **Audit-ready documentation**
- **Industry-standard emission factors**
- **Detailed calculation breakdowns**

## Cost Estimates

- **Single Entry Test**: ~$0.01-0.02
- **Batch (10 entries)**: ~$0.10-0.20
- **Full Company (100 entries)**: ~$1-2

## Troubleshooting

### "Assistant not found" Error
- Make sure you've set `VITE_OPENAI_ASSISTANT_ID` correctly
- Restart your development server
- Check the assistant exists in your OpenAI dashboard

### "API key invalid" Error
- Verify your API key is correct
- Make sure you have credits in your OpenAI account
- Check the key has the right permissions

### "Rate limit exceeded"
- Wait a few minutes and try again
- Consider upgrading your OpenAI plan for higher limits

## Verification

To verify everything is working:

1. ✅ Demo mode checkbox is **unchecked**
2. ✅ "Test Single Entry" shows real calculations
3. ✅ Results include confidence scores and detailed sources
4. ✅ Console shows "Assistant" or "GPT-4 fallback" method (not "demo")

## Next Steps

Once your real assistant is working:

1. **Upload real data** via CSV or manual entry
2. **Process larger batches** with confidence
3. **Generate compliance reports** with real calculations
4. **Scale to full company emissions** inventory

Your carbon accounting platform is now powered by real AI! 🚀 