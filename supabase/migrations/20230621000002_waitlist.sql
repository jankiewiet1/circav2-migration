-- Create waitlist table
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_size TEXT NOT NULL,
  industry TEXT NOT NULL,
  company_website TEXT,
  company_address TEXT NOT NULL,
  goals JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add updated_at trigger
CREATE TRIGGER set_waitlist_updated_at
BEFORE UPDATE ON waitlist
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Add RLS policies
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Only allow users to view their own waitlist status
CREATE POLICY "Users can view their own waitlist entry"
  ON waitlist
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only admins can manage waitlist
CREATE POLICY "Admins can manage waitlist"
  ON waitlist
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Add index for faster lookup
CREATE INDEX waitlist_email_idx ON waitlist (email);
CREATE INDEX waitlist_status_idx ON waitlist (status);
CREATE INDEX waitlist_user_id_idx ON waitlist (user_id);

-- Create a function to notify users when their waitlist status changes
CREATE OR REPLACE FUNCTION notify_waitlist_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    -- Insert into notifications table (assuming it exists)
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'waitlist_status',
      CASE 
        WHEN NEW.status = 'approved' THEN 'Account Approved'
        WHEN NEW.status = 'rejected' THEN 'Application Status Update'
        ELSE 'Waitlist Status Update'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Your account has been approved. You can now log in.'
        WHEN NEW.status = 'rejected' THEN 'Thank you for your interest. Unfortunately, we cannot approve your application at this time.'
        ELSE 'Your waitlist status has been updated to ' || NEW.status
      END,
      jsonb_build_object('waitlist_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for status change notification
CREATE TRIGGER waitlist_status_change
AFTER UPDATE ON waitlist
FOR EACH ROW
EXECUTE FUNCTION notify_waitlist_status_change(); 