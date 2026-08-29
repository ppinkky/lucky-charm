const form = document.querySelector('#signup-form');
const status = document.querySelector('#form-status');

if (form && status) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = new FormData(form).get('email');
    status.textContent = `Thank you. We will write to ${email}.`;
    form.reset();
  });
}