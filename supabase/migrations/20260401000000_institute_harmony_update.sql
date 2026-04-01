-- =============================================================================
-- Instituto Harmony - Custom CRM Enhancements
-- =============================================================================
-- Inclui campos específicos de harmonização facial sem apagar dados existentes.
-- Mantém RLS e multi-tenant.

-- --------------------------------------------------
-- 1. Contatos: campos de harmonização
-- --------------------------------------------------
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS treatment_interest TEXT,
  ADD COLUMN IF NOT EXISTS first_time BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS previous_procedure BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lead_origin TEXT,
  ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
  ADD COLUMN IF NOT EXISTS observations TEXT;

-- --------------------------------------------------
-- 2. Produtos/Serviços: suporte a clínica esteticista
-- --------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS base_price NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS procedure_duration_minutes INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS effect_duration_months INTEGER NOT NULL DEFAULT 6;

-- --------------------------------------------------
-- 3. Agenda / horário / bloqueios
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schedule_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  default_treatment_duration_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.schedule_configs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'Disponível' CHECK (status IN ('Disponível','Reservado','Confirmado','Bloqueado')),
  treatment TEXT,
  first_time BOOLEAN DEFAULT FALSE,
  previous_procedure BOOLEAN DEFAULT FALSE,
  lead_origin TEXT,
  conversation_summary TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------
-- 4. Histórico de procedimentos
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.procedure_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  treatment TEXT NOT NULL,
  product TEXT,
  quantity NUMERIC DEFAULT 1,
  value NUMERIC DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Pix','Dinheiro','Débito','Crédito')),
  result TEXT NOT NULL CHECK (result IN ('Ótimo','Bom','Regular','Requer ajuste')),
  follow_up_date DATE,
  doctor_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);
ALTER TABLE public.procedure_history ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------
-- 5. Galeria antes/depois (Supabase Storage metadata)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('antes','depois','ambos')),
  taken_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT
);
ALTER TABLE public.contact_photos ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------
-- 6. Novo índice para agendamento
-- --------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_appointments_date_status
  ON public.appointments (organization_id, date, status);

CREATE INDEX IF NOT EXISTS idx_procedure_history_contact
  ON public.procedure_history (contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_photos_contact
  ON public.contact_photos (contact_id);

-- --------------------------------------------------
-- 7. Policies adicionais RLS (aplicando padrão existente)
-- --------------------------------------------------
DROP POLICY IF EXISTS "Contacts may read" ON public.contacts;
CREATE POLICY "Contacts may read" ON public.contacts
  FOR SELECT
  TO authenticated
  USING (organization_id = auth.uid()::uuid OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Nota: acima é exemplo; RLS padrão deve ser aplicado nos níveis organizacionais reais em `supabase`.
