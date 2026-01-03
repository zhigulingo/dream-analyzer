-- HVdC norms table and initial seed (DreamBank/SDDB inspired aggregates)
-- Apply in Supabase SQL Editor before enabling HVdC comparison in app

-- Extension for UUID (usually present in Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table: hvdc_norms
CREATE TABLE IF NOT EXISTS public.hvdc_norms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age_range TEXT NOT NULL CHECK (age_range IN ('0-20','20-30','30-40','40-50','50+','any')),
  gender    TEXT NOT NULL CHECK (gender IN ('male','female','any')),
  distribution JSONB NOT NULL,
  source TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (age_range, gender)
);

COMMENT ON TABLE public.hvdc_norms IS 'HVdC baseline distributions by demographic group (percentages summing to ~100).';

-- Seed baseline (values are indicative aggregates; adjust as you refine)
-- Keys: characters, emotions, actions, symbols, settings (sum = 100)
INSERT INTO public.hvdc_norms (age_range, gender, distribution, source) VALUES
('any','any', '{"characters":35,"emotions":20,"actions":25,"symbols":10,"settings":10}', 'baseline: dreambank/sddb v1')
ON CONFLICT (age_range, gender) DO NOTHING;

-- Gender-wide baselines
INSERT INTO public.hvdc_norms (age_range, gender, distribution, source) VALUES
('any','male',   '{"characters":35,"emotions":18,"actions":27,"symbols":10,"settings":10}', 'baseline: dreambank/sddb v1'),
('any','female', '{"characters":36,"emotions":21,"actions":22,"symbols":10,"settings":11}', 'baseline: dreambank/sddb v1')
ON CONFLICT (age_range, gender) DO NOTHING;

-- Age x Gender
INSERT INTO public.hvdc_norms (age_range, gender, distribution, source) VALUES
('0-20','male',   '{"characters":34,"emotions":22,"actions":26,"symbols":9,"settings":9}',   'baseline: dreambank/sddb v1'),
('0-20','female', '{"characters":35,"emotions":25,"actions":20,"symbols":10,"settings":10}', 'baseline: dreambank/sddb v1'),
('20-30','male',   '{"characters":34,"emotions":18,"actions":28,"symbols":10,"settings":10}', 'baseline: dreambank/sddb v1'),
('20-30','female', '{"characters":36,"emotions":22,"actions":22,"symbols":10,"settings":10}', 'baseline: dreambank/sddb v1'),
('30-40','male',   '{"characters":35,"emotions":18,"actions":27,"symbols":10,"settings":10}', 'baseline: dreambank/sddb v1'),
('30-40','female', '{"characters":36,"emotions":21,"actions":23,"symbols":10,"settings":10}', 'baseline: dreambank/sddb v1'),
('40-50','male',   '{"characters":36,"emotions":17,"actions":26,"symbols":11,"settings":10}', 'baseline: dreambank/sddb v1'),
('40-50','female', '{"characters":37,"emotions":20,"actions":22,"symbols":11,"settings":10}', 'baseline: dreambank/sddb v1'),
('50+','male',     '{"characters":37,"emotions":16,"actions":24,"symbols":12,"settings":11}', 'baseline: dreambank/sddb v1'),
('50+','female',   '{"characters":38,"emotions":19,"actions":21,"symbols":12,"settings":10}', 'baseline: dreambank/sddb v1')
ON CONFLICT (age_range, gender) DO NOTHING;

CREATE INDEX IF NOT EXISTS ix_hvdc_norms_age_gender ON public.hvdc_norms(age_range, gender);
