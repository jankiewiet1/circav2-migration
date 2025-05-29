-- Update EF_Value column to DECIMAL type now that data is cleaned
ALTER TABLE emission_factor_db 
ALTER COLUMN "EF_Value" TYPE DECIMAL(20,10) USING "EF_Value"::DECIMAL; 