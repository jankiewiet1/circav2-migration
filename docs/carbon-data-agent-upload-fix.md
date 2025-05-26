# Carbon Data Agent Upload Fix

## Problem

The Carbon Data Agent is failing to upload files with the error "Bucket not found". This is happening because:

1. The required Supabase storage bucket `data-uploads` doesn't exist or isn't properly configured
2. The application tries to upload files to this non-existent bucket, resulting in the error

## Solution

Follow these steps to fix the issue:

### 1. Create the Missing Storage Bucket

1. Go to the [Supabase Dashboard](https://app.supabase.io/project/vfdbyvnjhimmnbyhxyun) for your project
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Name the bucket exactly `data-uploads` (this name is hard-coded in the application)
5. Make sure **Public bucket** is checked
6. Click **Create bucket**

### 2. Configure Bucket Policies

After creating the bucket, you need to set up permissions:

1. Click on the newly created `data-uploads` bucket
2. Go to the **Policies** tab
3. Create the following policies:
   - **INSERT**: Allow authenticated users to upload files
   - **SELECT**: Allow authenticated users to view files
   - **UPDATE**: Allow authenticated users to update files (optional)
   - **DELETE**: Allow authenticated users to delete files (optional)

For a quick setup, you can use these policies:
   - INSERT: `(auth.role() = 'authenticated')`
   - SELECT: `(auth.role() = 'authenticated')`
   - UPDATE: `(auth.role() = 'authenticated')`
   - DELETE: `(auth.role() = 'authenticated')`

### 3. Verify It Works

To verify the fix is working:

1. Start the application: `npm run dev`
2. Log in with your credentials
3. Navigate to the "Emission Data Management" page
4. Try uploading a file again

If you still encounter issues, run our diagnostic script to get more information:

```bash
npm run create-storage-bucket
npm run test:upload
```

## Helpful Scripts

We've added two helper scripts to the project:

1. `npm run create-storage-bucket` - Checks if the data-uploads bucket exists and provides setup instructions
2. `npm run test:upload` - Tests the upload functionality with a sample CSV file

## Technical Details

The file upload functionality is implemented in the following files:

- `src/services/dataEntryService.ts` - Contains the main `uploadFile` method that uploads to Supabase
- `src/components/dataUpload/FileUploader.tsx` - UI component for selecting and validating files
- `src/components/dataUpload/AIDataUploadContainer.tsx` - Handles the file upload process

The error occurs in the `uploadFile` method when trying to upload to the `data-uploads` bucket that doesn't exist.

## Need Help?

If you continue to experience issues after following these steps, check:

1. That you are logged in to the application (authentication is required for uploads)
2. That the bucket name is exactly `data-uploads` (case sensitive)
3. That the bucket policies are correctly configured
4. That your Supabase instance is running and accessible 