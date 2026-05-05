UPDATE public.attractions a
SET image_url = '/attractions/haunted-mansion.jpg'
FROM public.parks p
WHERE a.park_id = p.id
  AND a.name ILIKE 'Haunted Mansion'
  AND p.name = 'Magic Kingdom Park';