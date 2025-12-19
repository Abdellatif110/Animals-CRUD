INSERT INTO dogs (id, name, tag, description, img) VALUES
(22, 'Buddy', 'fidèle, amical', 'Un chien fidèle et très amical avec tout le monde', 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600'),
(23, 'Rocky', 'protecteur, fort', 'Un chien fort et protecteur de sa famille', 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=600'),
(24, 'Luna', 'intelligente, douce', 'Une chienne intelligente et très douce avec les enfants', 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=600'),
(25, 'Dogi', 'DOG234', 'jda, yma, 7na', 'https://img.freepik.com/photos-gratuité/adorable-chien-basenji-brun-blanc-souriant-donnant-cinq-haut_346278-1657.jpg');

INSERT INTO mouses (id, name, tag, description, img) VALUES
(31, 'Squeaky', 'curieux, rapide', 'Une souris très curieuse qui explore partout', 'https://img.freepik.com/photos-gratuite/vue-du-pere-noel-souris-noel_23-2151121855.jpg'),
(32, 'Nibbles', '', 'Une souris calme qui aime grignoter', 'https://img.freepik.com/photos-premium/aigle-dessin-anime-style-souris-ai-generative_1008415-465.jpg'),
(33, 'Zippy', '', 'Une souris pleine d''énergie qui adore courir dans la roue', 'https://img.freepik.com/photos-gratuite/vue-du-pere-noel-souris-noel_23-2151121852.jpg'),
(34, 'sour', '', 'hado , djh, sjdj', 'https://img.freepik.com/vecteurs-libre/mignonne-petite-souris-tenant-illustration-icone-vecteur-dessin-anime-fromage-concept-icone-nourriture-animale-isole-vecteur-premium-style-cartoon-plat_138676-4148.jpg');

INSERT INTO cats (id, name, tag, description, img) VALUES
(27, 'Whiskers', 'calme, affectueux', 'Un chat calme et affectueux qui aime les câlins', 'https://img.freepik.com/photos-gratuite/chat-scottish-fold-gris-poil-court_198169-268.jpg'),
(29, 'Simba', 'royal, protecteur', 'Un chat majestueux qui surveille son territoire', 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=600'),
(30, 'citty', 'CTE124', 'beauty, belle_jully', 'https://img.freepik.com/photos-gratuite/kitty-mur-monochrome-derriere-elle_23-2150752319.jpg'),
(31, 'CYTY', 'CT999', 'HAbby, hay, jau', 'https://img.freepik.com/photos-gratuite/mignon-chat-domestique-assis-pres-fenetre-regardant-pluie-generative-ai_188544-12586.jpg');

-- Default User (email: admin@example.com, password: password123)
-- Hash generated using SHA-256 for compatibility with the new auth system
INSERT INTO users (email, password) VALUES
('admin@example.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f');
