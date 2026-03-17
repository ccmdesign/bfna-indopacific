# MarineTraffic Embed Snippets — Bertelsmann Indo-Pacific Maritime Chokepoints

Six embed-ready code blocks for the BFNA interactive infographic. Each snippet centers on one chokepoint with appropriate zoom level. Adjust `width`, `height`, and `maptype` as needed for your Nuxt layout.

---

## 1. Strait of Malacca

```html
<script type="text/javascript">
  width='100%';
  height='450';
  border='0';
  shownames='false';
  latitude='2.5';
  longitude='101.0';
  zoom='7';
  maptype='0';
  trackvessel='0';
  fleet='';
</script>
<script type="text/javascript" src="//www.marinetraffic.com/js/embed.js"></script>
```

---

## 2. Taiwan Strait

```html
<script type="text/javascript">
  width='100%';
  height='450';
  border='0';
  shownames='false';
  latitude='24.0';
  longitude='119.0';
  zoom='7';
  maptype='0';
  trackvessel='0';
  fleet='';
</script>
<script type="text/javascript" src="//www.marinetraffic.com/js/embed.js"></script>
```

---

## 3. Strait of Hormuz

```html
<script type="text/javascript">
  width='100%';
  height='450';
  border='0';
  shownames='false';
  latitude='26.3';
  longitude='56.3';
  zoom='8';
  maptype='0';
  trackvessel='0';
  fleet='';
</script>
<script type="text/javascript" src="//www.marinetraffic.com/js/embed.js"></script>
```

---

## 4. Luzon Strait

```html
<script type="text/javascript">
  width='100%';
  height='450';
  border='0';
  shownames='false';
  latitude='20.0';
  longitude='121.0';
  zoom='7';
  maptype='0';
  trackvessel='0';
  fleet='';
</script>
<script type="text/javascript" src="//www.marinetraffic.com/js/embed.js"></script>
```

---

## 5. Lombok Strait

```html
<script type="text/javascript">
  width='100%';
  height='450';
  border='0';
  shownames='false';
  latitude='-8.5';
  longitude='115.7';
  zoom='9';
  maptype='0';
  trackvessel='0';
  fleet='';
</script>
<script type="text/javascript" src="//www.marinetraffic.com/js/embed.js"></script>
```

---

## 6. Bab el-Mandeb

```html
<script type="text/javascript">
  width='100%';
  height='450';
  border='0';
  shownames='false';
  latitude='12.6';
  longitude='43.3';
  zoom='8';
  maptype='0';
  trackvessel='0';
  fleet='';
</script>
<script type="text/javascript" src="//www.marinetraffic.com/js/embed.js"></script>
```

---

## Configuration Reference

| Parameter      | Options                                          |
|----------------|--------------------------------------------------|
| `width`        | Pixels or percentage (e.g. `'100%'`, `'600'`)    |
| `height`       | Pixels (e.g. `'450'`)                            |
| `border`       | Border width in pixels (`'0'` for none)          |
| `shownames`    | `'true'` / `'false'` — show vessel names         |
| `zoom`         | `2`–`17` (higher = closer)                       |
| `maptype`      | `0` = Normal, `1` = Satellite, `2` = OpenStreetMap |
| `trackvessel`  | MMSI number to track a single vessel (`'0'` = off) |
| `fleet`        | Registered fleet email (`''` = off)              |

## Nuxt Integration Note

Since these use inline `<script>` tags that set global variables, they won't work directly in Vue SFCs. You'll likely want to either:

1. **iframe approach** — host each snippet as a standalone HTML file and embed via `<iframe>` in your Nuxt components
2. **useHead / useScript** — dynamically inject the config variables and the embed script using Nuxt's `useHead()` or `useScript()` composable
3. **Client-only wrapper** — use `<ClientOnly>` with a component that mounts the script after hydration

Option 1 (iframe) is the simplest and avoids any SSR conflicts.