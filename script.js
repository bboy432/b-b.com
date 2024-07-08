const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', (event) => {
  event.preventDefault(); // Prevent default form submission

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const users = [
    { username: 'testuser1', password: 'password1' },
    { username: 'testuser2', password: 'password2' },
 //copy and paste above line to add users
  ];

  // Check if user exists and credentials match
  const user = users.find(user => user.username === username && user.password === password);
  if (user) {
    window.location.href = `${username}.html`; // Redirect to username.html
  } else {
    alert('Invalid username or password!');
  }
});
