-- Create emission_factors table
CREATE TABLE IF NOT EXISTS public.emission_factors (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    subcategory TEXT,
    description TEXT,
    co2_factor NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    source TEXT,
    year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add some example emission factors for testing
INSERT INTO public.emission_factors (category, subcategory, description, co2_factor, unit, source, year)
VALUES
    ('electricity', 'grid', 'Electricity from grid', 0.23, 'kg CO2e/kWh', 'EPA', 2023),
    ('natural_gas', 'heating', 'Natural gas for heating', 2.54, 'kg CO2e/m3', 'EPA', 2023),
    ('diesel', 'transport', 'Diesel fuel for vehicles', 2.68, 'kg CO2e/liter', 'EPA', 2023),
    ('train_travel', 'passenger', 'Average passenger train', 0.04, 'kg CO2e/km', 'EPA', 2023),
    ('flight', 'short_haul', 'Short haul flight (<1500km)', 0.18, 'kg CO2e/km', 'EPA', 2023); 