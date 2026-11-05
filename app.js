const DEFAULT = { name: "Boca Raton", region: "Florida", lat: 26.3587, lon: -80.0831 };

const CODES = {
  0: ["Clear", "☀️", "🌙"], 1: ["Mostly Clear", "🌤️", "🌙"], 2: ["Partly Cloudy", "⛅", "☁️"], 3: ["Cloudy", "☁️", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Fog", "🌫️"],
  51: ["Light Drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy Drizzle", "🌧️"], 56: ["Freezing Drizzle", "🌧️"], 57: ["Freezing Drizzle", "🌧️"],
  61: ["Light Rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy Rain", "🌧️"], 66: ["Freezing Rain", "🌧️"], 67: ["Freezing Rain", "🌧️"],
  71: ["Light Snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy Snow", "❄️"], 77: ["Snow Grains", "🌨️"],
  80: ["Showers", "🌦️"], 81: ["Showers", "🌧️"], 82: ["Heavy Showers", "⛈️"], 85: ["Snow Showers", "🌨️"], 86: ["Snow Showers", "❄️"],
  95: ["Thunderstorms", "⛈️"], 96: ["Thunderstorms", "⛈️"], 99: ["Thunderstorms", "⛈️"],
};
const label = (c) => (CODES[c] || ["Unknown"])[0];
const icon = (c, isDay = 1) => { const e = CODES[c] || ["", "🌡️"]; return !isDay && e[2] ? e[2] : e[1]; };
const $ = (id) => document.getElementById(id);
const r = Math.round;

async function loadWeather(place) {
  $("place").textContent = place.name;
  const url = "https://api.open-meteo.com/v1/forecast?" + new URLSearchParams({
    latitude: place.lat, longitude: place.lon, timezone: "auto", forecast_days: 7,
    temperature_unit: "fahrenheit", wind_speed_unit: "mph",
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
    hourly: "temperature_2m,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,uv_index_max",
  });
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    render(await res.json());
  } catch (e) {
    $("cond").textContent = "Couldn't load weather. Try again.";
  }
}

function render(d) {
  const c = d.current, day = d.daily;
  $("temp").textContent = `${r(c.temperature_2m)}°`;
  $("cond").textContent = label(c.weather_code);
  $("hilo").textContent = `H:${r(day.temperature_2m_max[0])}°  L:${r(day.temperature_2m_min[0])}°`;
  $("feels").textContent = `${r(c.apparent_temperature)}°`;
  $("humidity").textContent = `${c.relative_humidity_2m}%`;
  $("wind").textContent = `${r(c.wind_speed_10m)} mph`;
  $("uv").textContent = r(day.uv_index_max[0]);

  // Next 24 hours, starting from the current hour (times are in the location's local time)
  const start = Math.max(0, d.hourly.time.findIndex((t) => t >= c.time.slice(0, 13)));
  $("hourly").innerHTML = d.hourly.time.slice(start, start + 24).map((t, i) => {
    const j = start + i;
    const h = +t.slice(11, 13);
    const name = i === 0 ? "Now" : `${h % 12 || 12}${h < 12 ? "AM" : "PM"}`;
    return `<div class="hour"><span>${name}</span><span class="icon">${icon(d.hourly.weather_code[j], d.hourly.is_day[j])}</span><span>${r(d.hourly.temperature_2m[j])}°</span></div>`;
  }).join("");

  const min = Math.min(...day.temperature_2m_min), max = Math.max(...day.temperature_2m_max);
  const pct = (v) => ((v - min) / (max - min || 1)) * 100;
  $("daily").innerHTML = day.time.map((t, i) => {
    const name = i === 0 ? "Today" : new Date(t + "T12:00").toLocaleDateString("en-US", { weekday: "short" });
    const lo = day.temperature_2m_min[i], hi = day.temperature_2m_max[i];
    return `<div class="day"><span>${name}</span><span class="icon">${icon(day.weather_code[i])}</span>
      <div class="range"><span class="lo">${r(lo)}°</span><div class="bar"><span style="left:${pct(lo)}%;right:${100 - pct(hi)}%"></span></div><span>${r(hi)}°</span></div></div>`;
  }).join("");
}

// City search via Open-Meteo geocoding
const results = $("results");
$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("query").value.trim();
  if (!q) return;
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&name=${encodeURIComponent(q)}`);
    const data = await res.json();
    const list = data.results || [];
    results.innerHTML = list.length
      ? list.map((p, i) => `<li data-i="${i}">${p.name} <small>${[p.admin1, p.country].filter(Boolean).join(", ")}</small></li>`).join("")
      : "<li>No results</li>";
    results.hidden = false;
    results.onclick = (ev) => {
      const li = ev.target.closest("li[data-i]");
      if (!li) return;
      const p = list[li.dataset.i];
      results.hidden = true;
      $("query").value = "";
      loadWeather({ name: p.name, lat: p.latitude, lon: p.longitude });
    };
  } catch {
    results.innerHTML = "<li>Search failed</li>";
    results.hidden = false;
  }
});
document.addEventListener("click", (e) => { if (!e.target.closest("#search")) results.hidden = true; });

loadWeather(DEFAULT);
