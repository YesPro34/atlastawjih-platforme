-- Add STE and STM to the bac_option enum
-- Note: PostgreSQL doesn't support removing enum values, so SC and SE will remain
-- but STE and STM will be added for use in the application

DO $$ 
BEGIN
    -- Add STE if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'STE' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'bac_option')
    ) THEN
        ALTER TYPE public.bac_option ADD VALUE 'STE';
    END IF;
    
    -- Add STM if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'STM' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'bac_option')
    ) THEN
        ALTER TYPE public.bac_option ADD VALUE 'STM';
    END IF;
END $$;
