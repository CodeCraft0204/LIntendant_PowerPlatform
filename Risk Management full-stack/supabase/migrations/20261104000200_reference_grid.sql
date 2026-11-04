-- Reference grid content (19 rows). The probability percentages are the draft
-- proposed to management and the impact thresholds are still to be supplied
-- (both marked "à valider" / "À définir par la direction"); the cause
-- descriptions are Simon's text. Management edits them in the app
-- (Grille de référence), not here.

insert into public.reference_guides (scale, rating, code, label, description, sort_order) values
  ('probabilite', 1, null, '1 - Très improbable', 'Moins de 10 % (à valider)', 1),
  ('probabilite', 2, null, '2 - Improbable', '10 à 30 % (à valider)', 2),
  ('probabilite', 3, null, '3 - Modéré', '30 à 50 % (à valider)', 3),
  ('probabilite', 4, null, '4 - Probable', '50 à 80 % (à valider)', 4),
  ('probabilite', 5, null, '5 - Presque certain', 'Plus de 80 % ou déjà survenu (enjeu) (à valider)', 5);

insert into public.reference_guides
  (scale, rating, code, label, description, cost_guide, delay_guide, quality_guide, hs_guide, reputation_guide, sort_order)
values
  ('impact', 1, null, '1 - Négligeable', '', 'À définir par la direction', 'À définir par la direction', 'À définir par la direction', 'À définir par la direction', 'À définir par la direction', 1),
  ('impact', 2, null, '2 - Mineur', '', 'À définir par la direction', 'À définir par la direction', 'À définir par la direction', 'À définir par la direction', 'À définir par la direction', 2),
  ('impact', 3, null, '3 - Modéré', '', 'À définir par la direction', 'À définir par la direction', 'À définir par la direction', 'À définir par la direction', 'À définir par la direction', 3),
  ('impact', 4, null, '4 - Majeur', '', 'À définir par la direction', 'À définir par la direction', 'À définir par la direction', 'À définir par la direction', 'À définir par la direction', 4),
  ('impact', 5, null, '5 - Sévère', '', 'À définir par la direction', 'À définir par la direction', 'À définir par la direction', 'À définir par la direction', 'À définir par la direction', 5);

insert into public.reference_guides (scale, rating, code, label, description, sort_order) values
  ('cause', null, 'technique', 'Technique', 'Conception incomplète, coordination interdisciplinaire, etc.', 1),
  ('cause', null, 'gestion_projet', 'Gestion de projet', 'Mauvaise planification, échéancier irréaliste, dérive de la portée, etc.', 2),
  ('cause', null, 'contractuel', 'Contractuel / commercial', 'Portée contractuelle mal définie, réclamations, litiges, etc.', 3),
  ('cause', null, 'financier', 'Financier', 'Dépassement de coûts, délai de financement, problème de liquidités, etc.', 4),
  ('cause', null, 'approvisionnement', 'Chaîne d''approvisionnement', 'Retard de livraison, fluctuation de prix, fournisseur unique, etc.', 5),
  ('cause', null, 'construction', 'Construction', 'Baisse de productivité, bris d''équipement, reprise de travaux, coordination des sous-traitants, retard de commande de matériel, qualité de la main-d''œuvre, etc.', 6),
  ('cause', null, 'externe', 'Externe', 'Météo, conditions environnementales, réglementation, capacité des services publics, etc.', 7),
  ('cause', null, 'parties_prenantes', 'Parties prenantes', 'Changements du client, retards d''approbation, etc.', 8),
  ('cause', null, 'sst', 'Santé, sécurité et environnement', 'Accident, pollution, amendes de non-conformité, travail en hauteur, etc.', 9);
