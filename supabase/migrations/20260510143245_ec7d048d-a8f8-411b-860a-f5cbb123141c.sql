ALTER TABLE public.attractions
  ADD COLUMN IF NOT EXISTS popularity_score integer NOT NULL DEFAULT 5
  CHECK (popularity_score >= 1 AND popularity_score <= 10);

UPDATE public.attractions SET popularity_score = 10
WHERE name IN ('Seven Dwarfs Mine Train','Haunted Mansion','Space Mountain','Big Thunder Mountain Railroad','Pirates of the Caribbean');

UPDATE public.attractions SET popularity_score = 9
WHERE name IN ('Jungle Cruise','Peter Pan''s Flight','TRON Lightcycle / Run','Buzz Lightyear''s Space Ranger Spin','it''s a small world');

UPDATE public.attractions SET popularity_score = 8
WHERE name IN ('Under the Sea - Journey of The Little Mermaid','Splash Mountain','The Many Adventures of Winnie the Pooh','Dumbo the Flying Elephant','Monsters Inc. Laugh Floor');

UPDATE public.attractions SET popularity_score = 7
WHERE name IN ('Tomorrowland Speedway','Magic Carpets of Aladdin','Enchanted Tales with Belle','Mickey''s PhilharMagic','Walt Disney World Railroad - Main Street, U.S.A.');

UPDATE public.attractions SET popularity_score = 9
WHERE name ILIKE '%Happily Ever After%' OR name ILIKE '%Disney Festival of Fantasy Parade%';

UPDATE public.attractions SET popularity_score = 6
WHERE name IN ('Tomorrowland Transit Authority PeopleMover','Walt Disney''s Carousel of Progress','The Barnstormer');

UPDATE public.attractions SET popularity_score = 4
WHERE name IN ('Country Bear Musical Jamboree','Swiss Family Treehouse','The Hall of Presidents','Walt Disney''s Enchanted Tiki Room','Casey Jr. Splash ''N'' Soak Station','A Pirate''s Adventure ~ Treasures of the Seven Seas','Mad Tea Party','Prince Charming Regal Carrousel','Main Street Vehicles');

UPDATE public.attractions SET popularity_score = 10
WHERE name IN ('Guardians of the Galaxy: Cosmic Rewind','Remy''s Ratatouille Adventure','Frozen Ever After','Test Track');

UPDATE public.attractions SET popularity_score = 9
WHERE name IN ('Soarin'' Around the World','Mission: SPACE','EPCOT Forever');

UPDATE public.attractions SET popularity_score = 10
WHERE name IN ('Star Wars: Rise of the Resistance','Millennium Falcon: Smugglers Run','Mickey & Minnie''s Runaway Railway','Slinky Dog Dash','Tower of Terror');

UPDATE public.attractions SET popularity_score = 9
WHERE name IN ('Rock ''n'' Roller Coaster Starring Aerosmith','Toy Story Mania!','Alien Swirling Saucers');

UPDATE public.attractions SET popularity_score = 10
WHERE name IN ('Avatar Flight of Passage','Na''vi River Journey','Expedition Everest - Legend of the Forbidden Mountain');

UPDATE public.attractions SET popularity_score = 9
WHERE name IN ('Kilimanjaro Safaris','DINOSAUR','Kali River Rapids');

UPDATE public.attractions SET popularity_score = 8
WHERE name IN ('It''s Tough to be a Bug!','Gorilla Falls Exploration Trail','Festival of the Lion King');