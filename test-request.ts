import fetch from 'node-fetch';
import FormData from 'form-data';

async function test() {
  const formData = new FormData();
  formData.append('usuarioId', '244dfc28-e43f-4df6-a98e-dd18e5a19795');
  formData.append('titulo', 'Pet para resgate - Rex');
  formData.append('descricao', 'Testando uma descricao longa');
  formData.append('latitude', '-23.550520');
  formData.append('longitude', '-46.633308');
  formData.append('endereco_texto', 'Avenida Paulista 1000');
  formData.append('tipo', 'RESGATE');
  formData.append('especie', 'CACHORRO');
  formData.append('urgencia', 'ALTA');
  formData.append('condicao_medica', 'Quebrado');

  const res = await fetch('http://localhost:3001/api/publicacoes/com-fotos', {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  console.log(res.status, JSON.stringify(json, null, 2));
}
test();
