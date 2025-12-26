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

-- Add RLS policies
ALTER TABLE public.labour_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create labour advances" ON public.labour_advances FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view labour advances" ON public.labour_advances FOR SELECT USING (true);
CREATE POLICY "Anyone can update labour advances" ON public.labour_advances FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete labour advances" ON public.labour_advances FOR DELETE USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_labour_advances_updated_at 
    BEFORE UPDATE ON public.labour_advances 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();
