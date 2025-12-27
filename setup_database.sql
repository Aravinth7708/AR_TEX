-- Complete database setup for AR Textiles
-- Run this in Supabase SQL Editor

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create labours table
CREATE TABLE IF NOT EXISTS public.labours (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    pieces integer DEFAULT 0 NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    rate_per_piece numeric(10,2) DEFAULT 0 NOT NULL,
    total_salary numeric(10,2) GENERATED ALWAYS AS ((((pieces * quantity))::numeric * rate_per_piece)) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    advance numeric(10,2) DEFAULT 0,
    esi_bf_amount numeric(10,2) DEFAULT 0,
    last_week_balance numeric(10,2) DEFAULT 0,
    extra_amount numeric(10,2) DEFAULT 0
);

-- Create trigger for labours
CREATE TRIGGER update_labours_updated_at 
    BEFORE UPDATE ON public.labours 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS for labours
ALTER TABLE public.labours ENABLE ROW LEVEL SECURITY;

-- Create policies for labours
CREATE POLICY "Anyone can create labours" ON public.labours FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view labours" ON public.labours FOR SELECT USING (true);
CREATE POLICY "Anyone can update labours" ON public.labours FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete labours" ON public.labours FOR DELETE USING (true);

-- Create labour_advances table
CREATE TABLE IF NOT EXISTS public.labour_advances (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    labour_name text NOT NULL,
    advance_amount numeric(10,2) NOT NULL DEFAULT 0,
    advance_date timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create trigger for labour_advances
CREATE TRIGGER update_labour_advances_updated_at 
    BEFORE UPDATE ON public.labour_advances 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS for labour_advances
ALTER TABLE public.labour_advances ENABLE ROW LEVEL SECURITY;

-- Create policies for labour_advances
CREATE POLICY "Anyone can create labour advances" ON public.labour_advances FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view labour advances" ON public.labour_advances FOR SELECT USING (true);
CREATE POLICY "Anyone can update labour advances" ON public.labour_advances FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete labour advances" ON public.labour_advances FOR DELETE USING (true);
