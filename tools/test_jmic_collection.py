from datetime import date
import unittest
from collect_jmic import extract

DOC = """Update 115 to JMIC Advisory Note:
01 March – 19 November 2026
\f3. Regional Threat Overview
      Region          Threat Level                                     Notes
    Gulf of Aden      SUBSTANTIAL    Other words: LOW

   Bab el-Mandeb /                   context
                      SUBSTANTIAL
  Southern Red Sea

 Northern Red Sea /
                      MODERATE
    Suez Canal
"""
class RegionalTable(unittest.TestCase):
    def read(self, text):
        return extract(text,115,date(2026,11,19))
    def test_recognized(self):
        self.assertEqual(self.read(DOC),(2,{'suez':'MODERATE','aden':'SUBSTANTIAL','bab':'SUBSTANTIAL'}))
    def test_reject_ambiguous_incomplete_or_mismatched(self):
        for a,b in [('19 November','18 November'),('Update 115','Update 116'),('Suez Canal','Other zone'),('MODERATE','UNKNOWN'),('MODERATE','MODERATE\n                      SEVERE')]:
            with self.subTest(a=a,b=b),self.assertRaises(ValueError):
                self.read(DOC.replace(a,b))
