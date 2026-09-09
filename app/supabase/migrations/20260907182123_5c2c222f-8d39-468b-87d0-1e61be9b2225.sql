CREATE POLICY "Template files are readable"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'template-files');