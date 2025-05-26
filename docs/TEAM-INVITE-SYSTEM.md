# Team Invite System Documentation

## Overview

The team invite system allows company administrators to invite new team members via email with specific roles. The system includes email notifications, role-based permissions, and proper database tracking.

## Architecture

### Components

1. **Edge Function**: `send-team-invite`
   - Validates permissions (admin only)
   - Checks for existing invitations/memberships
   - Creates invitation records
   - Sends styled email invitations
   - Logs invitation activity

2. **Frontend Service**: `teamInviteService.ts`
   - Provides TypeScript interface
   - Handles API calls to edge function
   - Includes validation helpers

3. **UI Components**: 
   - `CompanyManage.tsx` - Main team management interface
   - `InvitationForm` - Form for creating invitations

### Database Tables

#### `company_invitations`
```sql
- id: uuid (primary key)
- email: text (invitee email)
- role: text (admin|editor|viewer)
- status: text (pending|accepted|declined)
- invited_by: uuid (inviter user ID)
- company_id: uuid (company reference)
- created_at: timestamp
```

#### `company_members`
```sql
- id: uuid (primary key)
- user_id: uuid (member user ID)
- company_id: uuid (company reference)
- role: text (admin|editor|viewer)
- joined_at: timestamp
- created_at: timestamp
- updated_at: timestamp
```

## User Roles

### Admin
- Full access to manage company, team members, and all data
- Can invite new team members
- Can change member roles
- Can remove team members

### Editor
- Access to view and edit emission data and reports
- Cannot manage team members
- Cannot change company settings

### Viewer
- Read-only access to view emission data and reports
- Cannot edit data or manage team
- Cannot change settings

## Email Template

The invitation email includes:
- Professional Circa branding
- Inviter name and company information
- Role description and permissions
- Platform overview and benefits
- "Accept Invitation" button linking to frontend
- Support contact information

### Email Features
- HTML and plain text versions
- Responsive design
- Consistent with existing email templates
- Clear call-to-action

## API Usage

### Send Team Invitation

**Endpoint**: `POST /functions/v1/send-team-invite`

**Request Body**:
```typescript
{
  inviterId: string;    // UUID of user sending invite
  email: string;        // Email of person to invite
  role: 'admin' | 'editor' | 'viewer';
  companyId: string;    // UUID of company
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  data?: {
    invitationId: string;
    email: string;
    role: string;
    companyName: string;
  };
}
```

### Frontend Usage

```typescript
import { sendTeamInvitation } from '@/services/teamInviteService';

const result = await sendTeamInvitation({
  inviterId: user.id,
  email: 'newmember@example.com',
  role: 'editor',
  companyId: company.id
});

if (result.success) {
  toast.success(result.message);
} else {
  toast.error(result.message);
}
```

## Security & Permissions

### Validation Steps
1. **Authentication**: User must be logged in
2. **Authorization**: Only admins can send invitations
3. **Input Validation**: Email format and role validation
4. **Duplicate Prevention**: Checks for existing invitations/memberships
5. **Rate Limiting**: Handled by Supabase edge functions

### Row Level Security (RLS)
- Company invitations are protected by RLS policies
- Only company admins can create/manage invitations
- Users can only see invitations for their companies

## Error Handling

### Common Errors
- **Permission Denied**: User is not an admin
- **Already Invited**: Email already has pending invitation
- **Already Member**: Email belongs to existing member
- **Invalid Email**: Email format validation failed
- **Invalid Role**: Role not in allowed values
- **Email Send Failed**: SMTP/Resend API error

### Error Messages
All errors return user-friendly messages suitable for display in the UI.

## Environment Variables

Required environment variables for the edge function:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `RESEND_API_KEY`: Resend API key for email sending
- `FRONTEND_URL`: Frontend URL for invitation links (optional, defaults to https://app.circa.site)

## Testing

### Manual Testing
1. Log in as company admin
2. Navigate to Company Management > Team Members
3. Fill out invitation form with valid email and role
4. Submit invitation
5. Check email delivery
6. Verify database records

### Edge Cases
- Inviting existing user
- Inviting with invalid email
- Non-admin attempting to invite
- Network/email service failures

## Future Enhancements

### Planned Features
1. **Invitation Expiry**: Time-limited invitations
2. **Bulk Invitations**: Invite multiple users at once
3. **Custom Messages**: Personalized invitation messages
4. **Invitation Analytics**: Track invitation success rates
5. **Role Templates**: Predefined role configurations

### Integration Opportunities
1. **SSO Integration**: Single sign-on for invited users
2. **Slack/Teams**: Send invitations via messaging platforms
3. **Calendar Integration**: Schedule onboarding calls
4. **Audit Logging**: Detailed invitation audit trail

## Troubleshooting

### Common Issues

**Invitations not sending**:
- Check RESEND_API_KEY configuration
- Verify email service status
- Check function logs for errors

**Permission errors**:
- Verify user has admin role
- Check company membership
- Validate authentication token

**Database errors**:
- Check RLS policies
- Verify table permissions
- Review foreign key constraints

### Debugging

Enable function logs:
```bash
supabase functions logs send-team-invite --follow
```

Check invitation records:
```sql
SELECT * FROM company_invitations 
WHERE company_id = 'your-company-id' 
ORDER BY created_at DESC;
```

## Support

For technical support or questions about the team invite system:
- Email: info@circa.site
- Documentation: This file
- Function logs: Available in Supabase dashboard

---

*Last updated: January 2025* 