/**
 * Treści artykułów: edytuj data/knowledgeCenter/articleDefinitions.ts
 * Zdjęcia lokalne: assets/knowledge/knowledge-01.jpg … knowledge-10.jpg
 * Pobierz ponownie: node scripts/download-knowledge-images.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

console.log('Centrum wiedzy używa articleDefinitions.ts — ten skrypt tylko przypomina o strukturze.');
console.log('Aby pobrać zdjęcia: node scripts/download-knowledge-images.mjs');
