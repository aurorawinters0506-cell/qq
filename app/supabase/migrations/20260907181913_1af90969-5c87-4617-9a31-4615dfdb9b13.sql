CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'briefcase',
  accent text NOT NULL DEFAULT 'blue',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  preview_variant int NOT NULL DEFAULT 1,
  slides int NOT NULL DEFAULT 24,
  pdf_path text,
  pptx_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whop_user_id text NOT NULL,
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (whop_user_id, template_id)
);

CREATE TABLE public.downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whop_user_id text NOT NULL,
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  format text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX templates_category_idx ON public.templates(category_id);
CREATE INDEX favorites_user_idx ON public.favorites(whop_user_id);
CREATE INDEX downloads_user_idx ON public.downloads(whop_user_id);

GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
GRANT SELECT ON public.templates TO anon, authenticated;
GRANT ALL ON public.templates TO service_role;
GRANT SELECT, INSERT, DELETE ON public.favorites TO anon, authenticated;
GRANT ALL ON public.favorites TO service_role;
GRANT SELECT, INSERT ON public.downloads TO anon, authenticated;
GRANT ALL ON public.downloads TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalog is readable by everyone" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Templates are readable by everyone" ON public.templates FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Favorites readable" ON public.favorites FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Favorites insertable" ON public.favorites FOR INSERT TO anon, authenticated WITH CHECK (whop_user_id IS NOT NULL AND length(whop_user_id) > 0);
CREATE POLICY "Favorites deletable" ON public.favorites FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Downloads readable" ON public.downloads FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Downloads insertable" ON public.downloads FOR INSERT TO anon, authenticated WITH CHECK (whop_user_id IS NOT NULL AND length(whop_user_id) > 0);

INSERT INTO public.categories (slug, name, icon, accent, sort_order) VALUES
  ('business-corporate', 'Business & Corporate', 'briefcase', 'blue', 1),
  ('data-analytics', 'Data & Analytics', 'chart', 'indigo', 2),
  ('food-restaurant', 'Food & Restaurant', 'utensils', 'red', 3),
  ('infographic', 'Infographic', 'image', 'green', 4),
  ('medical-healthcare', 'Medical & Healthcare', 'heart', 'rose', 5),
  ('portfolio-social-media', 'Portfolio & Social Media', 'camera', 'violet', 6),
  ('product-presentation', 'Product Presentation', 'box', 'teal', 7),
  ('startup-investment', 'Startup & Investment', 'rocket', 'amber', 8),
  ('technology-it', 'Technology & IT', 'cpu', 'sky', 9),
  ('travel-tourism', 'Travel & Tourism', 'plane', 'emerald', 10);

WITH names AS (
  SELECT c.id, c.slug, c.sort_order, t.title, t.idx
  FROM public.categories c
  CROSS JOIN LATERAL (
    SELECT title, idx FROM unnest(
      CASE c.slug
        WHEN 'business-corporate' THEN ARRAY['Business Strategy Presentation','Corporate Overview','Marketing Plan','Financial Report','Project Proposal','Company Profile','Sales Strategy','Business Pitch Deck']
        WHEN 'data-analytics' THEN ARRAY['Data Dashboard','KPI Report','Analytics Overview','Market Research','Survey Results','Growth Metrics','Performance Review','Data Storytelling']
        WHEN 'food-restaurant' THEN ARRAY['Restaurant Menu Deck','Food Brand Story','Catering Proposal','Coffee Shop Pitch','Recipe Showcase','Franchise Plan','Delivery Service','Chef Portfolio']
        WHEN 'infographic' THEN ARRAY['Timeline Infographic','Process Flow','Comparison Charts','Statistics Pack','Roadmap Visuals','Icon Library','Diagram Bundle','Data Visuals']
        WHEN 'medical-healthcare' THEN ARRAY['Clinic Presentation','Medical Report','Health Awareness','Pharma Launch','Patient Care Plan','Research Findings','Hospital Profile','Wellness Program']
        WHEN 'portfolio-social-media' THEN ARRAY['Creative Portfolio','Instagram Kit','Personal Branding','Photography Deck','Content Calendar','Influencer Media Kit','Agency Portfolio','Social Report']
        WHEN 'product-presentation' THEN ARRAY['Product Launch','Feature Overview','Roadmap Deck','UX Case Study','Packaging Showcase','Pricing Deck','Product Demo','Release Notes']
        WHEN 'startup-investment' THEN ARRAY['Startup Pitch Deck','Seed Round Deck','Investor Update','Business Model','Fundraising Deck','Traction Report','Series A Deck','Venture Overview']
        WHEN 'technology-it' THEN ARRAY['SaaS Overview','IT Infrastructure','Cybersecurity Brief','Cloud Migration','AI Solutions','DevOps Report','Tech Roadmap','Software Proposal']
        ELSE ARRAY['Travel Agency Deck','Destination Guide','Hotel Presentation','Tour Package','City Break','Adventure Trips','Resort Showcase','Travel Report']
      END
    ) WITH ORDINALITY AS t(title, idx)
  ) t
)
INSERT INTO public.templates (code, title, description, category_id, preview_variant, slides, pdf_path, pptx_path)
SELECT
  lpad(((sort_order - 1) * 8 + idx)::text, 3, '0') || upper(left(slug, 1) || substr(slug, position('-' in slug) + 1, 1)),
  title,
  title || ' — deck professionnel prêt à l''emploi, 100% modifiable.',
  id,
  ((idx - 1) % 4) + 1,
  16 + ((idx * 7) % 30),
  slug || '/' || idx || '.pdf',
  slug || '/' || idx || '.pptx'
FROM names;