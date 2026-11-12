import os
import unittest
from unittest.mock import patch
import fitz
from fastapi.testclient import TestClient
import main

class OCRTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)
        self.env = patch.dict(os.environ, {"READY_OCR_TOKEN": "x" * 32})
        self.env.start()
        self.headers = {"authorization": "Bearer " + "x" * 32, "content-type": "application/pdf"}
        with fitz.open() as doc:
            doc.new_page()
            self.pdf = doc.tobytes()
    def tearDown(self):
        self.env.stop()
    def test_auth(self):
        self.assertEqual(self.client.post('/ocr', content=self.pdf).status_code, 401)
    def test_type_and_pdf_validation(self):
        self.assertEqual(self.client.post('/ocr', headers={"authorization": "Bearer " + "x"*32}, content=self.pdf).status_code,415)
        self.assertEqual(self.client.post('/ocr', headers=self.headers, content=b'bad').status_code,422)
        with fitz.open() as d:
            d.new_page(); d.new_page()
            self.assertEqual(self.client.post('/ocr',headers=self.headers,content=d.tobytes()).status_code,400)
    def test_single_slot(self):
        main.slot.acquire()
        try:
            self.assertEqual(self.client.post('/ocr',headers=self.headers,content=self.pdf).status_code,429)
        finally:
            main.slot.release()
    @patch('main.pytesseract.image_to_data')
    def test_render_and_ocr_uncertainty(self,ocr):
        ocr.return_value = {"text":["বাংলা","English"],"conf":["96","40"],"block_num":[1,1],"par_num":[1,1],"line_num":[1,2]}
        response=self.client.post('/ocr',headers=self.headers,content=self.pdf)
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.json()['text'],'বাংলা\n[UNCLEAR]')
        self.assertTrue(response.json()['uncertain'])
        self.assertEqual(ocr.call_args.kwargs['lang'],'ben+eng')
        self.assertLessEqual(ocr.call_args.args[0].width*ocr.call_args.args[0].height,8_000_000)
        ocr.return_value['conf']=["96","99"]
        self.assertFalse(self.client.post('/ocr',headers=self.headers,content=self.pdf).json()['uncertain'])
    @patch('main.pytesseract.image_to_data',side_effect=RuntimeError('private detail'))
    def test_error_safe_and_lock_released(self,ocr):
        r=self.client.post('/ocr',headers=self.headers,content=self.pdf)
        self.assertEqual(r.status_code,422)
        self.assertNotIn('private',r.text)
        self.assertTrue(main.slot.acquire(False))
        main.slot.release()

if __name__=='__main__':
    unittest.main()
