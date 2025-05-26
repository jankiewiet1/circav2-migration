# Enhanced AI Chatbot Documentation

## Overview

The Enhanced AI Chatbot is an intelligent assistant integrated into the Carbon Data Agent platform. It provides comprehensive support for platform navigation, sustainability consulting, technical assistance, and automatically detects feature suggestions from users.

## Key Features

### 1. **Multi-Purpose Assistant**
- **Platform Navigation**: Helps users understand and navigate all platform features
- **Sustainability Consulting**: Provides expert advice on carbon reduction and ESG metrics
- **Technical Support**: Assists with data upload, integrations, and troubleshooting
- **Feature Suggestion Detection**: Automatically detects and acknowledges user suggestions

### 2. **Enhanced User Experience**
- Modern, responsive chat interface with user/bot avatars
- Real-time typing indicators and message timestamps
- Visual feedback for detected suggestions with badges and notifications
- Contextual help prompts and examples

### 3. **Intelligent Features**
- GPT-4 Turbo powered responses for high-quality interactions
- Pattern recognition for feature suggestions
- Session management for conversation continuity
- Fallback mechanisms for error handling

## System Architecture

### Frontend Components

#### `EnhancedChatBot.tsx`
- Main chat interface component
- Handles user interactions and message display
- Manages suggestion counting and notifications
- Integrates with authentication context

#### `EmailFallback.tsx`
- Provides alternative contact method
- Updated with correct support email: `info@circa.site`
- Copy-to-clipboard functionality

### Backend Services

#### `chat-completion` Edge Function
- **Single, unified function** handling all chat functionality
- Enhanced system prompt with comprehensive platform knowledge
- Feature suggestion detection using regex patterns
- GPT-4 Turbo integration for intelligent responses
- Error handling with appropriate fallback messages

#### System Prompt Features
The chatbot is equipped with detailed knowledge about:

**Platform Capabilities:**
- Data upload methods (Manual, CSV, AI, ERP/API)
- Emission calculation and tracking
- Company setup and team management
- Dashboard and reporting features
- Settings and configuration

**Sustainability Expertise:**
- Scope 1, 2, and 3 emissions understanding
- ESG metrics and compliance
- Climate action planning
- Sustainable business practices
- Regulatory requirements

**Technical Support:**
- Data upload troubleshooting
- ERP/API integration assistance
- Calculation error resolution
- Account management help

## Feature Suggestion System

### Automatic Detection
The system automatically detects feature suggestions using pattern matching:

```typescript
function detectFeatureSuggestion(message: string): boolean {
  const suggestionPatterns = [
    /i wish.*(?:platform|system|feature|dashboard|report)/i,
    /it would be (?:great|nice|helpful|useful) if/i,
    /can you add/i,
    /could you add/i,
    /i need.*(?:feature|function|capability)/i,
    /the platform should/i,
    /you should add/i,
    /would love to see/i,
    /missing.*feature/i,
    /suggestion.*(?:feature|improvement)/i
  ];

  return suggestionPatterns.some(pattern => pattern.test(message));
}
```

### User Feedback
When a suggestion is detected:
1. Visual badge appears showing suggestion count
2. Toast notification confirms suggestion was detected
3. Bot acknowledges the suggestion in its response
4. Alert banner thanks user for their input

### Example Interactions

**Feature Suggestion:**
```
User: "I wish the platform had a carbon credit marketplace"
Bot: "That's a great idea! I've logged your suggestion for our team to review. A carbon credit marketplace would indeed be valuable for offsetting emissions..."
```

**Platform Help:**
```
User: "How do I upload data using the AI feature?"
Bot: "I'd be happy to help you with AI data upload! Here's how to use this powerful feature..."
```

**Sustainability Consulting:**
```
User: "What's the difference between Scope 1 and Scope 2 emissions?"
Bot: "Great question! Understanding emission scopes is crucial for accurate carbon accounting..."
```

## Implementation Guide

### Setup Requirements

1. **Environment Variables**
   - `OPENAI_API_KEY`: Required for GPT-4 Turbo integration
   - Supabase configuration for edge function deployment

2. **Dependencies**
   - React components with TypeScript
   - Supabase client for edge function calls
   - UI components (shadcn/ui)
   - Toast notifications (sonner)

### Deployment Steps

1. **Deploy Edge Function**
   ```bash
   supabase functions deploy chat-completion
   ```

2. **Update Frontend**
   - Use EnhancedChatBot component in Help page
   - Update EmailFallback with correct email address

3. **Test Functionality**
   - Verify chat responses
   - Test suggestion detection
   - Confirm error handling

### Configuration Options

#### System Prompt Customization
The system prompt can be modified in the `getEnhancedSystemPrompt()` function to:
- Add new platform features
- Update contact information
- Modify response style
- Include additional context

#### Suggestion Pattern Updates
Add new detection patterns in the `detectFeatureSuggestion()` function:
```typescript
/new pattern here/i,
```

## User Interface Features

### Chat Interface
- **Modern Design**: Clean, professional appearance with proper spacing
- **User Avatars**: Distinct icons for user and bot messages
- **Message Timestamps**: Shows when each message was sent
- **Typing Indicators**: Animated dots while bot is responding

### Suggestion Tracking
- **Live Counter**: Badge showing number of suggestions detected
- **Visual Feedback**: Special badges on messages containing suggestions
- **Notification System**: Toast messages confirming suggestion detection
- **Thank You Banner**: Appears after suggestions are made

### Accessibility
- **Keyboard Navigation**: Enter key sends messages
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Management**: Auto-focus on input field
- **Responsive Design**: Works on mobile and desktop

## Best Practices

### For Users
1. **Be Specific**: Provide clear, detailed questions for better responses
2. **Use Examples**: Include specific scenarios when asking for help
3. **Suggest Features**: Don't hesitate to share improvement ideas
4. **Follow Up**: Ask clarifying questions if responses aren't clear

### For Administrators
1. **Monitor Suggestions**: Review suggestion patterns in function logs
2. **Update Context**: Keep system prompt current with new features
3. **Test Regularly**: Verify chatbot responses remain accurate
4. **Gather Feedback**: Use chat analytics to improve the system

## Troubleshooting

### Common Issues

**Chatbot Not Responding:**
- Check OpenAI API key configuration
- Verify Supabase edge function deployment
- Review browser console for errors

**Suggestions Not Being Detected:**
- Verify suggestion patterns are working
- Check if user message matches detection criteria
- Review edge function logs for errors

**Fallback Messages Appearing:**
- Usually indicates API connectivity issues
- Check OpenAI API status and rate limits
- Verify network connectivity

### Error Handling
The system includes multiple fallback mechanisms:
1. OpenAI API errors → Fallback message with support contact
2. Network issues → Retry mechanism with user notification
3. Invalid responses → Default helpful message

## Current Architecture

```
User Input → EnhancedChatBot.tsx → chat-completion Edge Function → GPT-4 Turbo → Response
                                                ↓
                                    Feature Suggestion Detection
                                                ↓
                                    Frontend Notification System
```

## Future Enhancements

### Planned Features
1. **Database Logging**: Full conversation history storage
2. **Analytics Dashboard**: Chat usage and suggestion metrics
3. **Multi-language Support**: Internationalization capabilities
4. **Voice Integration**: Speech-to-text and text-to-speech
5. **Advanced Suggestions**: AI-powered suggestion categorization

### Integration Opportunities
1. **Knowledge Base**: Connect to documentation system
2. **Ticket System**: Automatic support ticket creation
3. **User Profiles**: Personalized responses based on user data
4. **Workflow Integration**: Direct actions from chat interface

## Support and Maintenance

### Contact Information
- **Technical Support**: info@circa.site
- **Response Time**: Within 24 hours on business days

### Monitoring
- Edge function performance metrics
- User satisfaction tracking
- Feature suggestion analysis
- Error rate monitoring

### Updates
- Regular system prompt updates
- New feature integration
- Performance optimizations
- Security enhancements

---

*This documentation is maintained by the Carbon Data Agent development team. Last updated: January 2025* 