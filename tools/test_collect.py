import unittest
from datetime import date,timedelta
from collect import stats,validate
class CollectorTests(unittest.TestCase):
 def rows(self):
  end=date(2026,10,29)
  return [dict(date=(end-timedelta(days=364-i)).isoformat(),portid='cp',portname='Test',n_total=100 if i<337 else 40,n_container=10) for i in range(365)]
 def test_drop(self):
  s=stats(self.rows(),'2026-10-29');self.assertEqual(s['score'],60);self.assertEqual(s['change28'],-60)
 def test_stale(self):self.assertIsNone(stats(self.rows(),'2026-11-30')['score'])
 def test_gap(self):self.assertIsNone(stats(self.rows()[:-3]+self.rows()[-2:],'2026-10-29')['score'])
 def test_null(self):
  r=self.rows();r[0]['n_total']=None
  with self.assertRaises(ValueError):validate(r,'cp','2026-10-29')
 def test_duplicate(self):
  with self.assertRaises(ValueError):validate(self.rows()+self.rows()[:1],'cp','2026-10-29')
 def test_future(self):
  with self.assertRaises(ValueError):validate(self.rows(),'cp','2026-10-28')
 def test_zero_reference(self):
  r=self.rows()
  for x in r:x['n_total']=0;x['n_container']=0
  self.assertIsNone(stats(r,'2026-10-29')['score'])
if __name__=='__main__':unittest.main()
