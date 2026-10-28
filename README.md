# Photo Lab Stock

Bandomoji bendro sandėlio likučių web aplikacija: HTML/CSS/JavaScript, Cloudflare Pages Functions ir Cloudflare D1.

## Prieš publikuojant

- Pakeiskite `APP_PASSWORD` ir `SESSION_SECRET` Cloudflare Pages projekto nustatymuose. Nenaudokite slaptažodžio, kurį naudojate kitur.
- Sukurkite D1 duomenų bazę ir paleiskite `schema.sql`.
- Prijunkite D1 prie Pages projekto su binding vardu `DB`.
- Ši versija turi vieną bendrą slaptažodį visiems darbuotojams. Tai tinka tik ribotam bandymui. Nėra individualių vartotojų, vaidmenų ar prisijungimų žurnalo.
- Neįveskite konfidencialių duomenų, kol neįjungtos atsarginės kopijos ir nepatikrinta prieigos kontrolė.

## Failai

- `index.html` – puslapio struktūra ir dialogai.
- `styles.css` – dizainas ir prisitaikymas prie telefono.
- `app.js` – naršyklės logika, API užklausos ir lentelių atvaizdavimas.
- `functions/api/[[path]].js` – serverio API ir slaptažodžiu paremta sesija.
- `schema.sql` – duomenų bazės lentelės.
- `wrangler.toml` – vietinio Cloudflare įrankio konfigūracija.

## Cloudflare Pages publikavimas

1. Įkelkite visus šio projekto failus į GitHub repozitoriją.
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Pasirinkite GitHub repozitoriją.
4. Framework preset: `None`; Build command palikite tuščią; Build output directory nustatykite `/` arba `.` pagal Cloudflare formos reikalavimą.
5. Sukurkite projektą.
6. Pages projekto Settings → Variables and Secrets → pridėkite:
   - `APP_PASSWORD` (Secret) – jūsų bandomasis slaptažodis.
   - `SESSION_SECRET` (Secret) – ilga atsitiktinė paslaptis, bent 32 atsitiktiniai simboliai.
7. Cloudflare Dashboard → Storage & databases → D1 SQL Database → Create database, pavadinimas `photo-lab-stock-db`.
8. D1 konsolėje paleiskite `schema.sql` turinį.
9. Pages projekto Settings → Functions → D1 database bindings → Add binding: Variable name `DB`, pasirinkite sukurtą duomenų bazę.
10. Išsaugokite pakeitimus ir sukurkite naują deployment, kad aplinka pasikrautų su D1 binding.
11. Atidarykite suteiktą `*.pages.dev` adresą ir patikrinkite prisijungimą, medžiagos kūrimą, likučio pakeitimą bei istoriją.

## Pastabos

- Visi darbuotojai su tuo pačiu slaptažodžiu mato tą pačią duomenų bazę.
- Sąsaja atnaujinama kas 15 sekundžių, taip pat galima spausti „Atnaujinti“.
- Likučių pakeitimai įrašomi istorijoje. Šis bandomasis projektas nėra audituota gamybinė apskaitos sistema.
