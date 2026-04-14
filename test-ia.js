const FormData = require('form-data');
const fs = require('fs');

async function test() {
  try {
    const form = new FormData();
    const buffer = Buffer.from('dummy image content', 'utf8');
    form.append('foto', buffer, { filename: 'test.jpg', contentType: 'image/jpeg' });
    
    // Import do node-fetch para n├úo depender do axios
    const fetch = (await import('node-fetch')).default;
    const res = await fetch('http://localhost:3001/api/ia/analyze-pet', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error('ERROR:', err);
  }
}
test();
