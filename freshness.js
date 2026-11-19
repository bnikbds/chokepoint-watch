/* The map and the accessible table use the same observation clock and coverage rules. */
(function (root) {
  'use strict';
  const day = 86400000;
  function trafficCurrent(traffic, now = Date.now()) {
    if (!traffic || !/^\d{4}-\d{2}-\d{2}$/.test(traffic.latest)) return false;
    const age = Math.floor(now / day) - Date.parse(traffic.latest + 'T00:00:00Z') / day;
    return Number.isInteger(age) && age >= 0 && age <= 14;
  }
  function weatherCurrent(weather, now = Date.now()) {
    if (!weather) return false;
    const fetched = Date.parse(weather.fetched_at);
    return fetched <= now && now - fetched < day &&
      Date.parse(weather.start) <= now && now < Date.parse(weather.end);
  }
  function assess(passage, now = Date.now()) {
    const t = passage?.traffic, w = passage?.weather;
    const validScore = n => Number.isFinite(n) && n >= 0 && n <= 100;
    const traffic = trafficCurrent(t, now) && validScore(t.score);
    const weather = weatherCurrent(w, now) && validScore(w.score);
    return {traffic, weather, score: traffic && weather ? Math.max(t.score, w.score) : null};
  }
  root.CWFreshness = {trafficCurrent, weatherCurrent, assess};
})(typeof window === 'undefined' ? globalThis : window);
