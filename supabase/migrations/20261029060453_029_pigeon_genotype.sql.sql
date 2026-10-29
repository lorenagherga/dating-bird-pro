/*
# Store exact genotype per pigeon

1. Modified Tables
- `pigeons`: new nullable column `genotype` (jsonb). Holds the allele pair for each genetic locus, e.g. {"B":["BA","b"],"S":["s","s"]}. Z-linked loci hold two alleles for males and one for females.

2. Security
- No new policies. The existing owner-scoped select/update policies on `pigeons` already cover this column.

3. Important notes
- Existing rows get NULL, meaning no genotype has been recorded yet. The genetics calculator will not guess a genotype for them.
- Nothing is removed or changed in existing data.
*/

ALTER TABLE pigeons ADD COLUMN IF NOT EXISTS genotype jsonb;
