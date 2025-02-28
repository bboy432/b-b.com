// This file should be included only on your admin page
// Create a separate admin.html that only you will access

// Admin-only functions
function fetchAllUsers() {
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: USERS_SHEET
  }).then(response => {
    const allUsers = response.result.values || [];
    
    // Skip header row if present
    const startIndex = allUsers[0] && allUsers[0][0] === 'Username' ? 1 : 0;
    const users = allUsers.slice(startIndex);
    
    let usersHTML = '<h3>All Users</h3>';
    if (users.length === 0) {
      usersHTML += '<p>No users found.</p>';
    } else {
      usersHTML += '<table><tr><th>Username</th><th>Email</th><th>Created</th></tr>';
      users.forEach(user => {
        usersHTML += `<tr>
          <td>${user[0]}</td>
          <td>${user[1]}</td>
          <td>${new Date(user[3]).toLocaleDateString()}</td>
        </tr>`;
      });
      usersHTML += '</table>';
    }
    
    document.getElementById('adminUsers').innerHTML = usersHTML;
  }).catch(error => {
    console.error('Error fetching users:', error);
    document.getElementById('adminUsers').innerHTML = 'Error fetching users: ' + error.message;
  });
}

function fetchAllCharges() {
  // Fetch unpaid charges
  Promise.all([
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: UNPAID_CHARGES_SHEET
    }),
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: PAID_CHARGES_SHEET
    })
  ]).then(([unpaidResponse, paidResponse]) => {
    const allUnpaidCharges = unpaidResponse.result.values || [];
    const allPaidCharges = paidResponse.result.values || [];
    
    // Skip header rows if present
    const unpaidStartIndex = allUnpaidCharges[0] && allUnpaidCharges[0][0] === 'UserEmail' ? 1 : 0;
    const paidStartIndex = allPaidCharges[0] && allPaidCharges[0][0] === 'UserEmail' ? 1 : 0;
    
    const unpaidCharges = allUnpaidCharges.slice(unpaidStartIndex);
    const paidCharges = allPaidCharges.slice(paidStartIndex);
    
    // Show unpaid charges
    let chargesHTML = '<h3>Unpaid Charges</h3>';
    if (unpaidCharges.length === 0) {
      chargesHTML += '<p>No unpaid charges found.</p>';
    } else {
      chargesHTML += '<table><tr><th>User</th><th>Description</th><th>Amount</th><th>Date</th></tr>';
      unpaidCharges.forEach(charge => {
        chargesHTML += `<tr>
          <td>${charge[0]}</td>
          <td>${charge[1]}</td>
          <td>$${charge[2]}</td>
          <td>${new Date(charge[3]).toLocaleDateString()}</td>
        </tr>`;
      });
      chargesHTML += '</table>';
    }
    
    // Show paid charges
    chargesHTML += '<h3>Paid Charges</h3>';
    if (paidCharges.length === 0) {
      chargesHTML += '<p>No paid charges found.</p>';
    } else {
      chargesHTML += '<table><tr><th>User</th><th>Description</th><th>Amount</th><th>Date</th><th>Paid On</th></tr>';
      paidCharges.forEach(charge => {
        chargesHTML += `<tr>
          <td>${charge[0]}</td>
          <td>${charge[1]}</td>
          <td>$${charge[2]}</td>
          <td>${new Date(charge[3]).toLocaleDateString()}</td>
          <td>${new Date(charge[4]).toLocaleDateString()}</td>
        </tr>`;
      });
      chargesHTML += '</table>';
    }
    
    document.getElementById('adminCharges').innerHTML = chargesHTML;
  }).catch(error => {
    console.error('Error fetching charges:', error);
    document.getElementById('adminCharges').innerHTML = 'Error fetching charges: ' + error.message;
  });
}

// Add a bulk charges function
function bulkAddCharges(chargesData) {
  // chargesData should be array of [email, description, amount] arrays
  const formattedCharges = chargesData.map(charge => {
    return [charge[0], charge[1], charge[2], new Date().toISOString()];
  });
  
  gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: UNPAID_CHARGES_SHEET,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: formattedCharges
    }
  }).then(response => {
    console.log('Bulk charges added:', response);
    document.getElementById('adminContent').innerText = 'Bulk charges added successfully!';
  }).catch(error => {
    console.error('Error adding bulk charges:', error);
    document.getElementById('adminContent').innerText = 'Error adding bulk charges: ' + error.message;
  });
}
