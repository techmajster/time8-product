# Hybrid Employee Management System

## Overview

The Hybrid Employee Management System combines the best of both worlds: **direct employee creation** and **invitation-based onboarding**. This system allows administrators to efficiently add employees to their organization using multiple methods while maintaining security and flexibility.

## System Architecture

### Core Components

1. **AddEmployeeDialog Component** (`app/team/components/AddEmployeeDialog.tsx`)
   - Unified interface for all employee creation methods
   - Supports single, bulk, and CSV import operations
   - Mode switching between direct creation and invitation system

2. **Employee Creation API** (`app/api/employees/route.ts`)
   - Handles both direct creation and invitation modes
   - Bulk processing capabilities
   - Comprehensive error handling and validation

3. **Email Verification API** (`app/api/send-employee-verification/route.ts`)
   - Sends verification emails with temporary credentials
   - Professional email templates with organization branding

4. **Employee Utilities** (`lib/employee-utils.ts`)
   - Validation functions
   - CSV parsing utilities
   - Error handling helpers

## Features

### 🔧 **Two Creation Modes**

#### Direct Creation Mode
- **Immediate Account Creation**: Creates user accounts instantly
- **Automatic Credentials**: Generates secure temporary passwords
- **Email Verification**: Sends login credentials via email
- **Ready to Use**: Employees can log in immediately

**Benefits:**
- ✅ Instant access for new employees
- ✅ No waiting for user registration
- ✅ Admin has full control over account setup
- ✅ Suitable for large organizations with HR departments

#### Invitation Mode
- **Email Invitations**: Sends invitation codes to prospective employees
- **Self-Registration**: Users create their own accounts
- **Secure Workflow**: 7-day expiration for security
- **User Control**: Employees set their own passwords

**Benefits:**
- ✅ User-controlled password creation
- ✅ Email verification built-in
- ✅ Suitable for smaller teams
- ✅ Respects user privacy preferences

### 📊 **Multiple Input Methods**

#### 1. Single Employee Addition
- Individual employee form
- Full validation and team assignment
- Personal message support
- Real-time feedback

#### 2. Bulk Employee Management
- Add multiple employees simultaneously
- Default settings for efficiency
- Individual customization per employee
- Drag-and-drop style interface

#### 3. CSV Import
- Upload employee data via CSV
- Download template functionality
- Automatic parsing and validation
- Preview before processing

### 🛡️ **Security & Validation**

#### Comprehensive Validation
- Email format verification
- Role validation
- Team assignment verification
- Duplicate detection
- Organization membership checks

#### Security Features
- Secure temporary password generation
- Email verification requirements
- Admin-only access controls
- RLS (Row Level Security) integration
- Automatic cleanup of failed creations

### 📧 **Email System Integration**

#### Professional Email Templates
- Branded welcome emails
- Clear instructions for account activation
- Temporary credential display
- Security warnings and best practices

#### Email Configuration
- Resend.com integration
- Configurable FROM addresses
- HTML and plain text versions
- Delivery status tracking

## Usage Guide

### For Administrators

#### Step 1: Access the System
1. Navigate to **Team Management** page
2. Click **"Dodaj pracownika"** button
3. Choose your preferred creation mode

#### Step 2: Select Creation Method
- **Toggle Mode**: Switch between Direct Creation and Invitation System
- **Choose Tab**: Single, Bulk, or CSV Import

#### Step 3: Add Employee Data

**Single Employee:**
```
Email: jan.kowalski@company.com
Full Name: Jan Kowalski
Role: Employee
Team: Development Team
Personal Message: Welcome to our team!
Send Email: ✓ Enabled
```

**Bulk Addition:**
- Set default values (role, team, message)
- Add multiple employees using the form
- Each employee can be customized individually

**CSV Import:**
```csv
email,imię_nazwisko,rola,zespół
jan.kowalski@company.com,Jan Kowalski,employee,Development
anna.nowak@company.com,Anna Nowak,manager,Marketing
```

#### Step 4: Process and Review
- Review processing results
- Check for any errors
- Resend emails if needed

### For New Employees

#### Direct Creation Mode
1. **Receive Welcome Email** with temporary credentials
2. **Login** using provided email and password
3. **Set New Password** on first login
4. **Complete Profile** setup

#### Invitation Mode
1. **Receive Invitation Email** with invitation code
2. **Click Registration Link** or enter code manually
3. **Create Account** with preferred password
4. **Complete Profile** setup

## API Reference

### POST /api/employees

Creates employees using either direct creation or invitation mode.

#### Request Body
```json
{
  "employees": [
    {
      "email": "jan.kowalski@company.com",
      "full_name": "Jan Kowalski",
      "role": "employee",
      "team_id": "team-uuid",
      "personal_message": "Welcome message",
      "send_invitation": true
    }
  ],
  "mode": "direct" // or "invitation"
}
```

#### Response
```json
{
  "success": true,
  "results": [
    {
      "email": "jan.kowalski@company.com",
      "full_name": "Jan Kowalski",
      "status": "created", // or "invited"
      "profile_id": "user-uuid",
      "verification_sent": true
    }
  ],
  "errors": [],
  "summary": {
    "total": 1,
    "successful": 1,
    "failed": 0,
    "mode": "direct"
  }
}
```

### POST /api/send-employee-verification

Sends verification email with temporary credentials.

#### Request Body
```json
{
  "email": "jan.kowalski@company.com",
  "full_name": "Jan Kowalski",
  "organization_name": "Company Name",
  "temp_password": "TempPass123!",
  "personal_message": "Welcome to our team!"
}
```

## Database Schema Updates

### Profiles Table
- Enhanced with `status` field for tracking verification status
- Support for temporary password management

### Invitations Table
- Extended with team assignment capability
- Enhanced with invitation code generation

## Configuration

### Environment Variables
```bash
# Email Service
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@yourcompany.com

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

### Required Permissions
- **Admin Role**: Full access to all features
- **Manager Role**: Can invite to their teams only
- **Employee Role**: No access to employee creation

## Error Handling

### Common Errors and Solutions

#### "Email service not configured"
- **Solution**: Add RESEND_API_KEY and FROM_EMAIL to environment variables

#### "Admin client not configured"
- **Solution**: Add SUPABASE_SERVICE_ROLE_KEY to environment variables

#### "Email already exists"
- **Solution**: User already in organization, use team assignment instead

#### "Invalid team selected"
- **Solution**: Ensure team exists and belongs to organization

## Performance Optimizations

### Bulk Processing
- Batch operations for efficiency
- Parallel email sending
- Transaction-based database operations
- Progress tracking for large imports

### Error Recovery
- Automatic cleanup on failures
- Rollback mechanisms for partial failures
- Detailed error reporting per employee

## Best Practices

### For Administrators
1. **Use Direct Creation** for immediate access needs
2. **Use Invitation Mode** for enhanced security
3. **Prepare CSV files** using the provided template
4. **Review results** before considering the process complete
5. **Test email delivery** in your environment

### For Organizations
1. **Configure email domains** for better deliverability
2. **Set up proper DNS records** (SPF, DKIM)
3. **Train administrators** on both creation modes
4. **Establish workflows** for different use cases

## Security Considerations

### Direct Creation Mode
- Temporary passwords are securely generated
- Email verification is mandatory
- Accounts are locked until first login
- Automatic password expiration enforced

### Invitation Mode
- Invitation codes expire in 7 days
- Email verification through registration
- No temporary credentials stored
- User-controlled password creation

## Troubleshooting

### Email Delivery Issues
1. Check RESEND_API_KEY configuration
2. Verify FROM_EMAIL domain setup
3. Check organization's spam filters
4. Review Resend dashboard for delivery status

### Database Errors
1. Verify SUPABASE_SERVICE_ROLE_KEY
2. Check RLS policies for organization
3. Ensure team IDs are valid
4. Review database logs for specific errors

### UI/UX Issues
1. Clear browser cache and cookies
2. Check browser console for JavaScript errors
3. Verify user permissions
4. Test with different browsers

## Migration Guide

### From Existing Invitation System
1. **No Changes Required**: Existing system continues to work
2. **Enhanced Features**: New bulk and CSV capabilities available
3. **Backward Compatibility**: All existing APIs remain functional

### Adding Direct Creation
1. **Environment Setup**: Add service role key
2. **Permission Review**: Ensure admin access controls
3. **Email Configuration**: Set up verification templates
4. **Testing**: Verify in development environment

## Future Enhancements

### Planned Features
- **LDAP/AD Integration**: Import from existing directory services
- **SSO Support**: Integration with identity providers
- **Advanced Templates**: Customizable email templates
- **Audit Logging**: Detailed activity tracking
- **Bulk Operations**: Enhanced bulk management tools

### API Extensions
- **Webhook Support**: Real-time notifications
- **GraphQL API**: Alternative API interface
- **Rate Limiting**: Protection against abuse
- **Analytics**: Usage statistics and reporting

---

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.

**Last Updated**: January 26, 2025
**Version**: 1.0.0
**Author**: Development Team 