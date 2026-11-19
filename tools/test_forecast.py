import unittest
from datetime import datetime, timedelta, timezone
from collect import forecast, current_weather

class ForecastTests(unittest.TestCase):
    def setUp(self):
        self.start = datetime(2026, 11, 19, 7, tzinfo=timezone.utc)
        self.payload = {'hourly':{'wind_speed_10m':[22] * 24, 'time':[
            (self.start + timedelta(hours=i)).strftime('%Y-%m-%dT%H:%M') for i in range(24)]}}
    def test_last_hour_and_expiry(self):
        w = forecast(self.payload, self.start.isoformat(), 'test')
        self.assertEqual(w['score'], 20)
        self.assertTrue(current_weather(w, self.start+timedelta(hours=23, minutes=59)))
        self.assertFalse(current_weather(w, self.start+timedelta(hours=24)))
    def test_irregular_or_invalid_forecast(self):
        self.payload['hourly']['time'][3] = self.payload['hourly']['time'][2]
        with self.assertRaises(ValueError):
            forecast(self.payload, self.start.isoformat(), 'test')
    def test_retention_rejects_future_and_unusable_forecast(self):
        w = forecast(self.payload, self.start.isoformat(), 'test')
        self.assertFalse(current_weather(w, self.start-timedelta(seconds=1)))
        self.assertFalse(current_weather(dict(w,end=''), self.start))
