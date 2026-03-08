UPDATE products SET category = split_part(category, '>', -1) WHERE category LIKE '%>%';
UPDATE products SET category = LEFT(TRIM(category), 30) WHERE LENGTH(category) > 30;