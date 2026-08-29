# TouchPOS Stage 1

A touch-friendly POS MVP for sales, inventory, and basic reports.

## What is included

- Responsive POS screen for mobile, tablet, and desktop
- Product/category search and fast cart controls
- Clickable Current Sale item list with popup item editing
- Customer selection on sales
- Line-level discount by amount or percent
- Bill-level discount by amount or percent
- Two-step checkout with Cash, Card, Bank Transfer, and QR payment modes
- Receipt preview with print and WhatsApp bill actions
- Product and inventory management
- Customer, supplier, and category master files
- GRN goods received transactions
- PRN purchase return transactions
- Bin Card stock ledger
- All-transactions ledger for sales, payments, and inventory movements
- Daily sales, product sales, payment summary, stock movement, and low-stock reports
- Supabase-ready schema and client configuration
- Local demo mode when Supabase is not configured

## Run locally

Use any static web server from this folder. Example:

```bash
python -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

## Connect Supabase

1. Create a new Supabase project.
2. Open the Supabase SQL editor.
3. Run `supabase/schema.sql`.
4. Create your first user in Supabase Auth.
5. Run the bootstrap admin SQL shown at the end of `supabase/schema.sql`.
6. Copy `config.example.js` to `config.js`.
7. Paste your Supabase Project URL and public anon key into `config.js`.

Do not paste your database password or service role key into this app.

## Stage 1 scope

Stage 1 focuses on the core working system:

- Sales transaction
- Inventory tracking
- GRN and PRN inventory documents
- Bin Card maintenance
- Customer, supplier, and category masters
- Transaction ledger
- Basic reports
- Touch-first responsive UI
- Supabase backend foundation

Advanced controls such as returns, purchase orders, loyalty, shifts, multi-branch, and printer integrations belong in Stage 2.
