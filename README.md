# Photo Lab Stock

Bendra foto laboratorijos medžiagų likučių aplikacija: HTML/CSS/JavaScript, Cloudflare Pages Functions ir Cloudflare D1.

## Kas atnaujinta

- Lankytojai iškart mato likučius ir pakeitimų istoriją be prisijungimo.
- Tik `admin` turi prisijungti, kad galėtų pridėti medžiagas, keisti likučius ir redaguoti minimalius likučius. API tikrina teises serverio pusėje.
- „Užsakomos medžiagos“ visada rodoma viršuje; joje rodomos pozicijos, kurių kiekis yra lygus minimaliam arba mažesnis. Jei tokių nėra, rodoma „Šiuo metu užsakomų medžiagų nėra.“
- „Visos medžiagos“ visada rodoma žemiau. Paieška ir kategorijų filtras veikia abiejose skiltyse.
- Esama D1 duomenų bazės struktūra nekeičiama, todėl nereikia iš naujo vykdyti `schema.sql` ir nereikėtų prarasti esamų likučių.

## Cloudflare nustatymai

Esamus `APP_PASSWORD` ir `SESSION_SECRET` palikite tokius, kokie yra. Papildomo `VIEWER_PASSWORD` nebereikia. Viešam likučių skaitymui prisijungimas nereikalingas, o administratoriaus vardas yra `admin`; jo slaptažodis nustatomas per `APP_PASSWORD`.

Slaptažodžių reikšmių nedėkite į GitHub ir nesiųskite jų pokalbyje. Cloudflare Pages Functions pasiekia slaptas reikšmes per `context.env`; po bindingų ar secrets pakeitimų reikia naujo deployment. Žr. [Cloudflare Pages Functions bindings dokumentaciją](https://developers.cloudflare.com/pages/functions/bindings/).

## Failai

- `index.html` – puslapio struktūra ir dialogai.
- `styles.css` – dizainas ir prisitaikymas prie telefono.
- `app.js` – prisijungimas, lentelės ir naršyklės logika.
- `functions/api/[[path]].js` – API, sesijos ir serverio teisių tikrinimas.
- `schema.sql` – pradinė D1 duomenų bazės schema (esamai duomenų bazei iš naujo nevykdyti).

## Diegimas

Įkelkite pakeistus failus į esamą GitHub repozitoriją, nekeisdami Cloudflare projekto ar D1 duomenų bazės. Automatinis deployment turėtų prasidėti po commit. Patikrinkite, kad Production aplinkoje būtų `APP_PASSWORD`, `SESSION_SECRET` ir D1 binding vardu `DB`.
