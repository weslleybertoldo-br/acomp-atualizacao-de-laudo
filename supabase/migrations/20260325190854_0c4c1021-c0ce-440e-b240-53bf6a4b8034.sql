
INSERT INTO kanban_phases (id, title, sort_order) VALUES (5, 'Fase 5 - Enviados - Concluído', 5);
UPDATE kanban_cards SET phase_id = 5 WHERE phase_id = 4;
UPDATE kanban_phases SET title = 'Fase 4 - Laudos enviado (Aguardando enxoval)' WHERE id = 4;
