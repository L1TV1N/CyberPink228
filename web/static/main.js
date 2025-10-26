document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('upload-form');
  const fileInput = document.getElementById('file');
  const status = document.getElementById('status');
  const externalLink = document.getElementById('external-link');

  async function loadLastUrl() {
    try {
      const res = await fetch('/last_url');
      if (res.status === 204) return null;
      if (!res.ok) throw new Error('Failed to fetch last URL');
      const url = (await res.text()).trim();
      return url || null;
    } catch (e) {
      console.error('loadLastUrl error', e);
      return null;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files[0];
    if (!file) {
      status.textContent = 'Пожалуйста, выберите файл.';
      return;
    }
    status.textContent = 'Загрузка и обработка...';
    externalLink.style.display = 'none';

    const fd = new FormData();
    fd.append('file', file);
    try {
      const resp = await fetch('/upload', { method: 'POST', body: fd });
      if (!resp.ok) {
        const txt = await resp.text();
        status.textContent = 'Ошибка обработки: ' + txt;
        return;
      }
      status.textContent = 'Файл обработан успешно.';
      const url = await loadLastUrl();
      if (url) {
        externalLink.href = url;
        externalLink.style.display = 'inline-block';
      } else {
        status.textContent = 'Обработка завершена, но ссылка не найдена.';
      }
    } catch (err) {
      status.textContent = 'Ошибка загрузки: ' + err;
    }
  });
});