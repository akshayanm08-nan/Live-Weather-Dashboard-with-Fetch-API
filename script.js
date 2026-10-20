const API = {
geocoding: "https://geocoding-api.open-meteo.com/v1/search",
forecast: "https://api.open-meteo.com/v1/forecast"
};

const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const statusMessage = document.getElementById("status-message");
const weatherContent = document.getElementById("weather-content");
const forecastGrid = document.getElementById("forecast-grid");

let activeRequest = 0;

const weatherCodes = {
0: { description: "Clear sky", icon: "☀️" },
1: { description: "Mainly clear", icon: "🌤️" },
2: { description: "Partly cloudy", icon: "⛅" },
3: { description: "Overcast", icon: "☁️" },
45: { description: "Foggy", icon: "🌫️" },
48: { description: "Depositing rime fog", icon: "🌫️" },
51: { description: "Light drizzle", icon: "🌦️" },
53: { description: "Moderate drizzle", icon: "🌦️" },
55: { description: "Dense drizzle", icon: "🌧️" },
56: { description: "Light freezing drizzle", icon: "🌧️" },
57: { description: "Dense freezing drizzle", icon: "🌧️" },
61: { description: "Slight rain", icon: "🌦️" },
63: { description: "Moderate rain", icon: "🌧️" },
65: { description: "Heavy rain", icon: "🌧️" },
66: { description: "Light freezing rain", icon: "🌧️" },
67: { description: "Heavy freezing rain", icon: "🌧️" },
71: { description: "Slight snowfall", icon: "🌨️" },
73: { description: "Moderate snowfall", icon: "❄️" },
75: { description: "Heavy snowfall", icon: "❄️" },
77: { description: "Snow grains", icon: "❄️" },
80: { description: "Slight rain showers", icon: "🌦️" },
81: { description: "Moderate rain showers", icon: "🌧️" },
82: { description: "Violent rain showers", icon: "⛈️" },
85: { description: "Slight snow showers", icon: "🌨️" },
86: { description: "Heavy snow showers", icon: "❄️" },
95: { description: "Thunderstorm", icon: "⛈️" },
96: { description: "Thunderstorm with hail", icon: "⛈️" },
99: { description: "Thunderstorm with heavy hail", icon: "⛈️" }
};

function getWeatherInfo(code) {
return weatherCodes[code] || {
description: "Conditions unavailable",
icon: "🌡️"
};
}

function showStatus(message, type = "") {
statusMessage.textContent = message;
statusMessage.className = "status-message";

if (type) {
    statusMessage.classList.add(type);
}

}

async function fetchJSON(url) {
const response = await fetch(url);

if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
}

return response.json();

}

async function getCityCoordinates(city) {
const url = "${API.geocoding}?name=${encodeURIComponent(city)}&count=1&language=en&format=json";

const data = await fetchJSON(url);

if (!data.results || data.results.length === 0) {
    throw new Error("City not found. Please check the spelling and try again.");
}

return data.results[0];

}

async function getWeather(latitude, longitude) {
const params = new URLSearchParams({
latitude: latitude,
longitude: longitude,
current: [
"temperature_2m",
"relative_humidity_2m",
"apparent_temperature",
"is_day",
"precipitation",
"weather_code",
"wind_speed_10m"
].join(","),
daily: [
"weather_code",
"temperature_2m_max",
"temperature_2m_min"
].join(","),
timezone: "auto",
forecast_days: "5"
});

const url = `${API.forecast}?${params.toString()}`;

return fetchJSON(url);

}

function formatDate(dateString, options) {
const date = new Date("${dateString}T12:00:00");

return date.toLocaleDateString("en-IN", options);

}

function displayCurrentWeather(city, data) {
const current = data.current;
const units = data.current_units;
const info = getWeatherInfo(current.weather_code);

const locationParts = [
    city.name,
    city.admin1,
    city.country
].filter(Boolean);

document.getElementById("city-name").textContent =
    [...new Set(locationParts)].join(", ");

document.getElementById("current-date").textContent =
    formatDate(current.time.slice(0, 10), {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

document.getElementById("current-icon").textContent =
    current.is_day ? info.icon : getNightIcon(current.weather_code);

document.getElementById("current-temperature").textContent =
    Math.round(current.temperature_2m);

document.getElementById("weather-description").textContent =
    info.description;

document.getElementById("feels-like").textContent =
    Math.round(current.apparent_temperature);

document.getElementById("humidity").textContent =
    current.relative_humidity_2m;

document.getElementById("wind-speed").textContent =
    Math.round(current.wind_speed_10m);

document.getElementById("precipitation").textContent =
    Number(current.precipitation).toFixed(1);

}

function getNightIcon(code) {
if (code === 0) return "🌙";
if (code === 1) return "🌙";
if (code === 2) return "☁️";

return getWeatherInfo(code).icon;

}

function displayForecast(daily) {
forecastGrid.replaceChildren();

daily.time.forEach((date, index) => {
    const info = getWeatherInfo(daily.weather_code[index]);

    const card = document.createElement("article");
    card.className = "forecast-card";

    const day = document.createElement("p");
    day.className = "forecast-day";
    day.textContent = index === 0
        ? "Today"
        : formatDate(date, { weekday: "short" });

    const icon = document.createElement("span");
    icon.className = "forecast-icon";
    icon.textContent = info.icon;
    icon.setAttribute("aria-hidden", "true");

    const condition = document.createElement("p");
    condition.className = "forecast-condition";
    condition.textContent = info.description;

    const temperatures = document.createElement("div");
    temperatures.className = "forecast-temperatures";

    const high = document.createElement("span");
    high.textContent = `${Math.round(daily.temperature_2m_max[index])}°`;

    const low = document.createElement("span");
    low.className = "forecast-low";
    low.textContent = `${Math.round(daily.temperature_2m_min[index])}°`;

    temperatures.append(high, low);
    card.append(day, icon, condition, temperatures);
    forecastGrid.appendChild(card);
});

}

async function searchWeather(cityName) {
const requestId = ++activeRequest;

weatherContent.hidden = true;
searchButton.disabled = true;
searchButton.textContent = "Loading...";

showStatus("Fetching the latest weather data...", "loading");

try {
    const city = await getCityCoordinates(cityName);

    if (requestId !== activeRequest) return;

    const weather = await getWeather(city.latitude, city.longitude);

    if (requestId !== activeRequest) return;

    if (!weather.current || !weather.daily) {
        throw new Error("Weather data is unavailable for this city.");
    }

    displayCurrentWeather(city, weather);
    displayForecast(weather.daily);

    const updatedTime = new Date(weather.current.time);

    document.getElementById("last-updated").textContent =
        `Weather observation time: ${updatedTime.toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
        })} (${weather.timezone})`;

    weatherContent.hidden = false;
    showStatus(`Weather loaded successfully for ${city.name}.`);

} catch (error) {
    if (requestId !== activeRequest) return;

    console.error("Weather request error:", error);

    showStatus(
        error instanceof TypeError
            ? "Unable to connect to the weather service. Check your internet connection and try again."
            : error.message || "Something went wrong. Please try again.",
        "error"
    );

} finally {
    if (requestId === activeRequest) {
        searchButton.disabled = false;
        searchButton.textContent = "Search";
    }
}

}

searchForm.addEventListener("submit", event => {
event.preventDefault();

const cityName = cityInput.value.trim();

if (!cityName) {
    showStatus("Please enter a city name.", "error");
    cityInput.focus();
    return;
}

if (!/^[\p{L}\p{M}\s.'-]+$/u.test(cityName)) {
    showStatus("Please enter a valid city name.", "error");
    cityInput.focus();
    return;
}

searchWeather(cityName);

});
