CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: labours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.labours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    pieces integer DEFAULT 0 NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    rate_per_piece numeric(10,2) DEFAULT 0 NOT NULL,
    total_salary numeric(10,2) GENERATED ALWAYS AS ((((pieces * quantity))::numeric * rate_per_piece)) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: labours labours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labours
    ADD CONSTRAINT labours_pkey PRIMARY KEY (id);


--
-- Name: labours update_labours_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_labours_updated_at BEFORE UPDATE ON public.labours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: labours Anyone can create labours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create labours" ON public.labours FOR INSERT WITH CHECK (true);


--
-- Name: labours Anyone can delete labours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete labours" ON public.labours FOR DELETE USING (true);


--
-- Name: labours Anyone can update labours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update labours" ON public.labours FOR UPDATE USING (true);


--
-- Name: labours Anyone can view labours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view labours" ON public.labours FOR SELECT USING (true);


--
-- Name: labours; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.labours ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


