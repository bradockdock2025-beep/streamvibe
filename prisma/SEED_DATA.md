# LibraryMidia — Seed Data

Dados de teste inseridos via `POST /api/seed`.  
**Total:** 9 artistas · 15 álbuns · 80 tracks

---

## 1. Khalid

| # | Álbum | Ano | Género |
|---|-------|-----|--------|
| 1 | Free Spirit | 2019 | R&B |
| 2 | American Teen | 2017 | Pop |
| 3 | Suncity | 2018 | R&B |

**Free Spirit (2019)**
1. Bad Luck
2. Saturday Nights
3. Better
4. Up There
5. Hundred
6. Vertigo
7. My Bad

**American Teen (2017)**
1. Location
2. saved
3. young dumb & broke
4. 8TEEN
5. Let's Go
6. Another Sad Love Song

**Suncity (2018)**
1. Suncity
2. Better (feat. Disclosure)
3. Motion
4. Salem's Interlude

---

## 2. Mac Miller

| # | Álbum | Ano | Género |
|---|-------|-----|--------|
| 1 | Swimming | 2018 | Hip-Hop |
| 2 | Circles | 2020 | Hip-Hop |

**Swimming (2018)**
1. Come Back to Earth
2. Ladders
3. Small Worlds
4. What's the Use?
5. Conversation Pt. 1
6. Aquarium

**Circles (2020)**
1. Circles
2. Complicated
3. Blue World
4. Hand Me Downs
5. Once a Day

---

## 3. Ariana Grande

| # | Álbum | Ano | Género |
|---|-------|-----|--------|
| 1 | Sweetener | 2018 | Pop |
| 2 | Thank U Next | 2019 | Pop |

**Sweetener (2018)**
1. God is a woman
2. R.E.M
3. Breathin
4. No Tears Left to Cry
5. Raindrops

**Thank U Next (2019)**
1. imagine
2. 7 rings
3. thank u, next
4. break up with your girlfriend
5. NASA

---

## 4. Frank Ocean

| # | Álbum | Ano | Género |
|---|-------|-----|--------|
| 1 | Blonde | 2016 | R&B |
| 2 | Channel Orange | 2012 | R&B |

**Blonde (2016)**
1. Nikes
2. Ivy
3. Pink + White
4. Self Control
5. Godspeed
6. Seigfried

**Channel Orange (2012)**
1. Thinkin Bout You
2. Sweet Life
3. Lost
4. Pyramids
5. Bad Religion

---

## 5. SZA

| # | Álbum | Ano | Género |
|---|-------|-----|--------|
| 1 | SOS | 2022 | R&B |
| 2 | Ctrl | 2017 | R&B |

**SOS (2022)**
1. Kill Bill
2. Seek & Destroy
3. Low
4. Conceited
5. Good Days

**Ctrl (2017)**
1. Supermodel
2. Love Galore
3. Doves in the Wind
4. Drew Barrymore
5. Broken Clocks

---

## 6. Tyler the Creator

| # | Álbum | Ano | Género |
|---|-------|-----|--------|
| 1 | IGOR | 2019 | Alternative |

**IGOR (2019)**
1. IGOR'S THEME
2. EARFQUAKE
3. I THINK
4. RUNNING OUT OF TIME
5. NEW MAGIC WAND
6. A BOY IS A GUN*

---

## 7. H.E.R.

| # | Álbum | Ano | Género |
|---|-------|-----|--------|
| 1 | Back of My Mind | 2021 | R&B |

**Back of My Mind (2021)**
1. Damage
2. Hold On
3. Comfortable
4. We Made It
5. Come Through

---

## 8. Daniel Caesar

| # | Álbum | Ano | Género |
|---|-------|-----|--------|
| 1 | Freudian | 2017 | R&B |

**Freudian (2017)**
1. Get You
2. Best Part
3. Blessed
4. Transform
5. Neu Roses (Transgressor's Blues)

---

## 9. Jhené Aiko

| # | Álbum | Ano | Género |
|---|-------|-----|--------|
| 1 | Chilombo | 2020 | R&B |

**Chilombo (2020)**
1. Triggered (freestyle)
2. Speak
3. Happiness Over Everything
4. B.S.
5. Lotus

---

## Áudio

Todos os ficheiros de áudio são URLs públicas do SoundHelix (MP3 gratuitos para teste):
```
https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3
https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3
...até...
https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3
```
Rodam em ciclo — 80 tracks distribuídas por 17 URLs.

## Imagens

- **Artistas:** `https://picsum.photos/seed/{slug}/300/380`
- **Capas:** `https://picsum.photos/seed/alb{n}/300/300`

## Como re-semear

```bash
curl -X POST http://localhost:3000/api/seed \
  -H "Authorization: Bearer c77a18174770bc6ddd47681b8c343d1df595520e4479ecf365ab77c76c71fcc0"
```

O seed é idempotente — não duplica dados se correr mais de uma vez.
