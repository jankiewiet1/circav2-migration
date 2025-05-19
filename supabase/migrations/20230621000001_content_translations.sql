-- Create translations table for dynamic content
CREATE TABLE IF NOT EXISTS content_translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL,
    en_text TEXT NOT NULL,
    nl_text TEXT,
    de_text TEXT,
    content_type TEXT NOT NULL, -- e.g., 'marketing', 'email', 'notification'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create unique index on the key and content_type
CREATE UNIQUE INDEX IF NOT EXISTS content_translations_key_type_idx ON content_translations (key, content_type);

-- Sample data
INSERT INTO content_translations (key, en_text, nl_text, de_text, content_type) VALUES
('homepage_hero_title', 'Stop Wasting Days on Spreadsheets — Automate Your Carbon Accounting', 'Stop met dagen verspillen aan spreadsheets — Automatiseer uw CO₂-boekhouding', 'Verschwenden Sie keine Tage mehr mit Tabellenkalkulationen — Automatisieren Sie Ihre CO₂-Buchhaltung', 'marketing'),
('homepage_hero_subtitle', 'Connect all your data sources, leverage 400,000+ emission factors, and generate every major sustainability report with a single click.', 'Verbind al uw gegevensbronnen, maak gebruik van meer dan 400.000 emissiefactoren en genereer elk belangrijk duurzaamheidsrapport met één klik.', 'Verbinden Sie alle Ihre Datenquellen, nutzen Sie über 400.000 Emissionsfaktoren und erstellen Sie jeden wichtigen Nachhaltigkeitsbericht mit einem einzigen Klick.', 'marketing'),
('homepage_cta', 'Start Your Free 14-Day Trial', 'Start uw gratis 14-daagse proefversie', 'Starten Sie Ihre kostenlose 14-tägige Testversion', 'marketing'),
('newsletter_signup', 'Stay updated with our latest news', 'Blijf op de hoogte van ons laatste nieuws', 'Bleiben Sie über unsere neuesten Nachrichten informiert', 'email')
ON CONFLICT (key, content_type) DO UPDATE 
SET en_text = EXCLUDED.en_text,
    nl_text = EXCLUDED.nl_text,
    de_text = EXCLUDED.de_text,
    updated_at = now();

-- Enable RLS
ALTER TABLE content_translations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - only authenticated users with admin role can modify
CREATE POLICY "content_translations_read_policy" ON content_translations
    FOR SELECT USING (true);

CREATE POLICY "content_translations_insert_policy" ON content_translations
    FOR INSERT WITH CHECK (auth.role() = 'admin');

CREATE POLICY "content_translations_update_policy" ON content_translations
    FOR UPDATE USING (auth.role() = 'admin');

CREATE POLICY "content_translations_delete_policy" ON content_translations
    FOR DELETE USING (auth.role() = 'admin'); 